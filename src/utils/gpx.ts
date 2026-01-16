import * as toGeoJSON from '@mapbox/togeojson';
import type { Feature, LineString, Position } from 'geojson';
import type { ElevationPoint, RouteData, RouteStats } from '../types/route';

/**
 * Calculate the distance between two coordinates using the Haversine formula
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Parse a GPX file and extract route data with elevation profile
 */
export async function parseGpxFile(
  url: string,
  id: 'gravel' | 'tarmac',
  name: string,
  color: string,
  fillColor: string
): Promise<RouteData> {
  const response = await fetch(url);
  const gpxText = await response.text();
  
  const parser = new DOMParser();
  const gpxDoc = parser.parseFromString(gpxText, 'application/xml');
  
  const geojson = toGeoJSON.gpx(gpxDoc);
  
  // Find the track feature (LineString)
  const trackFeature = geojson.features.find(
    (f): f is Feature<LineString> => f.geometry?.type === 'LineString'
  );
  
  if (!trackFeature) {
    throw new Error(`No track found in GPX file: ${url}`);
  }
  
  // Extract elevation profile
  const elevationProfile = extractElevationProfile(trackFeature.geometry.coordinates);
  
  // Calculate stats
  const stats = calculateStats(elevationProfile);
  
  return {
    id,
    name,
    color,
    fillColor,
    geojson: trackFeature,
    elevationProfile,
    stats,
  };
}

/**
 * Extract elevation profile from coordinates
 * Coordinates are [lon, lat, elevation?]
 */
function extractElevationProfile(coordinates: Position[]): ElevationPoint[] {
  const profile: ElevationPoint[] = [];
  let cumulativeDistance = 0;
  
  for (let i = 0; i < coordinates.length; i++) {
    const [lng, lat, elevation = 0] = coordinates[i];
    
    if (i > 0) {
      const [prevLng, prevLat] = coordinates[i - 1];
      cumulativeDistance += haversineDistance(prevLat, prevLng, lat, lng);
    }
    
    // Calculate grade (gradient) if we have previous points
    let grade = 0;
    if (i > 0) {
      const [, , prevElevation = 0] = coordinates[i - 1];
      const [prevLng, prevLat] = coordinates[i - 1];
      const segmentDistance = haversineDistance(prevLat, prevLng, lat, lng) * 1000; // meters
      if (segmentDistance > 0) {
        grade = ((elevation - prevElevation) / segmentDistance) * 100;
      }
    }
    
    profile.push({
      distance: cumulativeDistance,
      elevation,
      lat,
      lng,
      grade,
    });
  }
  
  // Smooth the grade values using a moving average
  const smoothedProfile = smoothGrade(profile, 10);
  
  return smoothedProfile;
}

/**
 * Smooth grade values using a moving average
 */
function smoothGrade(profile: ElevationPoint[], windowSize: number): ElevationPoint[] {
  return profile.map((point, i) => {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(profile.length, i + Math.ceil(windowSize / 2));
    const window = profile.slice(start, end);
    const avgGrade = window.reduce((sum, p) => sum + (p.grade || 0), 0) / window.length;
    return { ...point, grade: avgGrade };
  });
}

/**
 * Calculate route statistics
 */
function calculateStats(profile: ElevationPoint[]): RouteStats {
  let elevationGain = 0;
  let elevationLoss = 0;
  let maxElevation = -Infinity;
  let minElevation = Infinity;
  
  for (let i = 0; i < profile.length; i++) {
    const { elevation } = profile[i];
    
    if (elevation > maxElevation) maxElevation = elevation;
    if (elevation < minElevation) minElevation = elevation;
    
    if (i > 0) {
      const diff = elevation - profile[i - 1].elevation;
      if (diff > 0) {
        elevationGain += diff;
      } else {
        elevationLoss += Math.abs(diff);
      }
    }
  }
  
  const distance = profile.length > 0 ? profile[profile.length - 1].distance : 0;
  
  return {
    distance,
    elevationGain,
    elevationLoss,
    maxElevation,
    minElevation,
  };
}

/**
 * Find the closest point on the route to a given distance
 */
export function findPointAtDistance(
  profile: ElevationPoint[],
  targetDistance: number
): ElevationPoint | null {
  if (profile.length === 0) return null;
  
  // Binary search for the closest point
  let left = 0;
  let right = profile.length - 1;
  
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (profile[mid].distance < targetDistance) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }
  
  // Check which of the two adjacent points is closer
  if (left > 0) {
    const prevDiff = Math.abs(profile[left - 1].distance - targetDistance);
    const currDiff = Math.abs(profile[left].distance - targetDistance);
    if (prevDiff < currDiff) {
      return profile[left - 1];
    }
  }
  
  return profile[left];
}

/**
 * Find the closest point on the route to given coordinates
 */
export function findClosestPoint(
  profile: ElevationPoint[],
  lat: number,
  lng: number
): ElevationPoint | null {
  if (profile.length === 0) return null;
  
  let closestPoint = profile[0];
  let minDistance = Infinity;
  
  for (const point of profile) {
    const distance = haversineDistance(lat, lng, point.lat, point.lng);
    if (distance < minDistance) {
      minDistance = distance;
      closestPoint = point;
    }
  }
  
  return closestPoint;
}

/**
 * Downsample elevation profile for chart rendering performance
 */
export function downsampleProfile(
  profile: ElevationPoint[],
  maxPoints: number
): ElevationPoint[] {
  if (profile.length <= maxPoints) return profile;
  
  const step = Math.ceil(profile.length / maxPoints);
  const downsampled: ElevationPoint[] = [];
  
  for (let i = 0; i < profile.length; i += step) {
    downsampled.push(profile[i]);
  }
  
  // Always include the last point
  if (downsampled[downsampled.length - 1] !== profile[profile.length - 1]) {
    downsampled.push(profile[profile.length - 1]);
  }
  
  return downsampled;
}
