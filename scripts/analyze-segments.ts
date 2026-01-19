/**
 * Segment Analysis Script
 * 
 * Analyzes the gravel and tarmac GPX files to identify overlapping
 * and diverging segments. Outputs segments.json for use in the app.
 * 
 * Run with: npx ts-node scripts/analyze-segments.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const OVERLAP_THRESHOLD_METERS = 100;
const MIN_SEGMENT_LENGTH_METERS = 500; // Minimum segment length to avoid tiny segments

interface Coordinate {
  lng: number;
  lat: number;
  elevation: number;
}

interface RoutePoint extends Coordinate {
  distanceFromStart: number; // meters
}

interface SegmentStats {
  coordinates: [number, number, number][]; // [lng, lat, elevation]
  distanceKm: number;
  elevationGain: number;
  elevationLoss: number;
}

interface Segment {
  id: string;
  type: 'shared' | 'diverging';
  order: number;
  gravel: SegmentStats;
  tarmac: SegmentStats;
}

/**
 * Parse GPX file and extract track points
 */
function parseGpx(filePath: string): Coordinate[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const coordinates: Coordinate[] = [];
  
  // Simple regex-based parsing for trkpt elements
  const trkptRegex = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"[^>]*>[\s\S]*?<ele>([^<]+)<\/ele>[\s\S]*?<\/trkpt>/g;
  // Also handle the reverse order (lon before lat) seen in some GPX files
  const trkptRegex2 = /<trkpt\s+lon="([^"]+)"\s+lat="([^"]+)"[^>]*>[\s\S]*?<ele>([^<]+)<\/ele>[\s\S]*?<\/trkpt>/g;
  
  let match;
  while ((match = trkptRegex.exec(content)) !== null) {
    coordinates.push({
      lat: parseFloat(match[1]),
      lng: parseFloat(match[2]),
      elevation: parseFloat(match[3]),
    });
  }
  
  // If no matches, try the other format
  if (coordinates.length === 0) {
    while ((match = trkptRegex2.exec(content)) !== null) {
      coordinates.push({
        lng: parseFloat(match[1]),
        lat: parseFloat(match[2]),
        elevation: parseFloat(match[3]),
      });
    }
  }
  
  console.log(`Parsed ${coordinates.length} points from ${path.basename(filePath)}`);
  return coordinates;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function haversineDistance(coord1: Coordinate, coord2: Coordinate): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLon = ((coord2.lng - coord1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.lat * Math.PI) / 180) *
      Math.cos((coord2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Add cumulative distance to route points
 */
function addDistances(coordinates: Coordinate[]): RoutePoint[] {
  let cumulativeDistance = 0;
  return coordinates.map((coord, i) => {
    if (i > 0) {
      cumulativeDistance += haversineDistance(coordinates[i - 1], coord);
    }
    return {
      ...coord,
      distanceFromStart: cumulativeDistance,
    };
  });
}

/**
 * Find the nearest point on route2 to a given point
 */
function findNearestPoint(point: Coordinate, route: RoutePoint[]): { point: RoutePoint; distance: number } {
  let nearestPoint = route[0];
  let minDistance = Infinity;
  
  for (const routePoint of route) {
    const distance = haversineDistance(point, routePoint);
    if (distance < minDistance) {
      minDistance = distance;
      nearestPoint = routePoint;
    }
  }
  
  return { point: nearestPoint, distance: minDistance };
}

/**
 * Sample route at regular intervals
 */
function sampleRoute(route: RoutePoint[], intervalMeters: number): RoutePoint[] {
  if (route.length === 0) return [];
  
  const sampled: RoutePoint[] = [route[0]];
  let lastSampledDistance = 0;
  
  for (let i = 1; i < route.length; i++) {
    const currentDistance = route[i].distanceFromStart;
    if (currentDistance - lastSampledDistance >= intervalMeters) {
      sampled.push(route[i]);
      lastSampledDistance = currentDistance;
    }
  }
  
  // Always include the last point
  if (sampled[sampled.length - 1] !== route[route.length - 1]) {
    sampled.push(route[route.length - 1]);
  }
  
  return sampled;
}

/**
 * Determine overlap status for each point on the primary route
 */
function analyzeOverlap(
  primaryRoute: RoutePoint[],
  secondaryRoute: RoutePoint[],
  threshold: number
): { point: RoutePoint; isOverlapping: boolean; nearestOnSecondary: RoutePoint }[] {
  return primaryRoute.map((point) => {
    const { point: nearestPoint, distance } = findNearestPoint(point, secondaryRoute);
    return {
      point,
      isOverlapping: distance <= threshold,
      nearestOnSecondary: nearestPoint,
    };
  });
}

/**
 * Calculate segment statistics
 * Sums all positive elevation differences (no threshold filtering)
 */
function calculateSegmentStats(points: RoutePoint[]): SegmentStats {
  if (points.length === 0) {
    return {
      coordinates: [],
      distanceKm: 0,
      elevationGain: 0,
      elevationLoss: 0,
    };
  }
  
  let elevationGain = 0;
  let elevationLoss = 0;
  let totalDistance = 0;
  
  for (let i = 1; i < points.length; i++) {
    totalDistance += haversineDistance(points[i - 1], points[i]);
    
    const diff = points[i].elevation - points[i - 1].elevation;
    if (diff > 0) {
      elevationGain += diff;
    } else {
      elevationLoss += Math.abs(diff);
    }
  }
  
  return {
    coordinates: points.map((p) => [p.lng, p.lat, p.elevation]),
    distanceKm: totalDistance / 1000,
    elevationGain,
    elevationLoss,
  };
}

/**
 * Extract points from a route between two distance values
 */
function extractRouteSection(
  route: RoutePoint[],
  startDistance: number,
  endDistance: number
): RoutePoint[] {
  return route.filter(
    (p) => p.distanceFromStart >= startDistance && p.distanceFromStart <= endDistance
  );
}

/**
 * Find corresponding section on secondary route based on nearest points
 */
function findCorrespondingSection(
  primarySection: RoutePoint[],
  secondaryRoute: RoutePoint[]
): RoutePoint[] {
  if (primarySection.length === 0) return [];
  
  // Find the range of distances on secondary route that correspond to this section
  const startNearest = findNearestPoint(primarySection[0], secondaryRoute);
  const endNearest = findNearestPoint(primarySection[primarySection.length - 1], secondaryRoute);
  
  const startDist = Math.min(startNearest.point.distanceFromStart, endNearest.point.distanceFromStart);
  const endDist = Math.max(startNearest.point.distanceFromStart, endNearest.point.distanceFromStart);
  
  return extractRouteSection(secondaryRoute, startDist, endDist);
}

/**
 * Merge small segments into larger ones
 */
function mergeSmallSegments(
  transitions: { distance: number; isOverlapping: boolean }[],
  minLength: number
): { distance: number; isOverlapping: boolean }[] {
  if (transitions.length <= 1) return transitions;
  
  const merged: { distance: number; isOverlapping: boolean }[] = [transitions[0]];
  
  for (let i = 1; i < transitions.length; i++) {
    const lastMerged = merged[merged.length - 1];
    const current = transitions[i];
    const segmentLength = current.distance - lastMerged.distance;
    
    if (segmentLength < minLength && merged.length > 1) {
      // Merge this small segment with the previous one by removing the last transition
      merged.pop();
    } else {
      merged.push(current);
    }
  }
  
  return merged;
}

/**
 * Main analysis function
 */
function analyzeSegments(): Segment[] {
  const dataDir = path.join(__dirname, '..', 'public', 'data');
  
  // Parse GPX files
  const gravelCoords = parseGpx(path.join(dataDir, 'gravel.gpx'));
  const tarmacCoords = parseGpx(path.join(dataDir, 'tarmac.gpx'));
  
  // Add distances
  const gravelRoute = addDistances(gravelCoords);
  const tarmacRoute = addDistances(tarmacCoords);
  
  console.log(`Gravel route: ${(gravelRoute[gravelRoute.length - 1].distanceFromStart / 1000).toFixed(1)} km`);
  console.log(`Tarmac route: ${(tarmacRoute[tarmacRoute.length - 1].distanceFromStart / 1000).toFixed(1)} km`);
  
  // Sample routes for faster analysis (every 50 meters)
  const sampledGravel = sampleRoute(gravelRoute, 50);
  const sampledTarmac = sampleRoute(tarmacRoute, 50);
  
  console.log(`Sampled gravel: ${sampledGravel.length} points`);
  console.log(`Sampled tarmac: ${sampledTarmac.length} points`);
  
  // Analyze overlap using gravel as primary route
  const overlapAnalysis = analyzeOverlap(sampledGravel, sampledTarmac, OVERLAP_THRESHOLD_METERS);
  
  // Find transition points (where overlap status changes)
  const transitions: { distance: number; isOverlapping: boolean }[] = [];
  let currentOverlap = overlapAnalysis[0].isOverlapping;
  transitions.push({ distance: 0, isOverlapping: currentOverlap });
  
  for (let i = 1; i < overlapAnalysis.length; i++) {
    if (overlapAnalysis[i].isOverlapping !== currentOverlap) {
      currentOverlap = overlapAnalysis[i].isOverlapping;
      transitions.push({
        distance: overlapAnalysis[i].point.distanceFromStart,
        isOverlapping: currentOverlap,
      });
    }
  }
  
  // Add final transition at the end
  transitions.push({
    distance: sampledGravel[sampledGravel.length - 1].distanceFromStart,
    isOverlapping: currentOverlap,
  });
  
  console.log(`Found ${transitions.length - 1} raw transitions`);
  
  // Merge small segments
  const mergedTransitions = mergeSmallSegments(transitions, MIN_SEGMENT_LENGTH_METERS);
  console.log(`After merging: ${mergedTransitions.length - 1} transitions`);
  
  // Build segments
  const segments: Segment[] = [];
  
  for (let i = 0; i < mergedTransitions.length - 1; i++) {
    const startDist = mergedTransitions[i].distance;
    const endDist = mergedTransitions[i + 1].distance;
    const isOverlapping = mergedTransitions[i].isOverlapping;
    
    // Extract gravel section (using full route for accuracy)
    const gravelSection = extractRouteSection(gravelRoute, startDist, endDist);
    
    // Find corresponding tarmac section
    const tarmacSection = findCorrespondingSection(gravelSection, tarmacRoute);
    
    if (gravelSection.length === 0) continue;
    
    const segment: Segment = {
      id: `seg-${i + 1}`,
      type: isOverlapping ? 'shared' : 'diverging',
      order: i + 1,
      gravel: calculateSegmentStats(gravelSection),
      tarmac: calculateSegmentStats(tarmacSection),
    };
    
    segments.push(segment);
  }
  
  // Log summary
  const sharedSegments = segments.filter((s) => s.type === 'shared');
  const divergingSegments = segments.filter((s) => s.type === 'diverging');
  
  console.log('\n=== Analysis Summary ===');
  console.log(`Total segments: ${segments.length}`);
  console.log(`Shared segments: ${sharedSegments.length}`);
  console.log(`Diverging segments: ${divergingSegments.length}`);
  
  const totalSharedKm = sharedSegments.reduce((sum, s) => sum + s.gravel.distanceKm, 0);
  const totalDivergingGravelKm = divergingSegments.reduce((sum, s) => sum + s.gravel.distanceKm, 0);
  const totalDivergingTarmacKm = divergingSegments.reduce((sum, s) => sum + s.tarmac.distanceKm, 0);
  
  console.log(`\nShared distance: ${totalSharedKm.toFixed(1)} km`);
  console.log(`Diverging gravel distance: ${totalDivergingGravelKm.toFixed(1)} km`);
  console.log(`Diverging tarmac distance: ${totalDivergingTarmacKm.toFixed(1)} km`);
  
  console.log('\nDiverging segments:');
  divergingSegments.forEach((s) => {
    console.log(`  ${s.id}: Gravel ${s.gravel.distanceKm.toFixed(1)}km +${s.gravel.elevationGain.toFixed(0)}m | Tarmac ${s.tarmac.distanceKm.toFixed(1)}km +${s.tarmac.elevationGain.toFixed(0)}m`);
  });
  
  return segments;
}

// Run analysis and save results
const segments = analyzeSegments();

const outputPath = path.join(__dirname, '..', 'public', 'data', 'segments.json');
fs.writeFileSync(outputPath, JSON.stringify(segments, null, 2));
console.log(`\nSaved ${segments.length} segments to ${outputPath}`);
