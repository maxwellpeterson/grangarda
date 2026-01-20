import type { BlendedRoute, DaySplit, Breakpoint } from '../types/segments';

/**
 * Calculate cumulative distances for each coordinate point using Haversine formula
 */
export function calculateCumulativeDistances(
  coordinates: [number, number, number][]
): number[] {
  const distances: number[] = [0];

  for (let i = 1; i < coordinates.length; i++) {
    const [lng1, lat1] = coordinates[i - 1];
    const [lng2, lat2] = coordinates[i];

    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const segmentDistance = R * c;

    distances.push(distances[i - 1] + segmentDistance);
  }

  return distances;
}

/**
 * Convert a percentage (0-100) to coordinate index using cumulative distances
 */
export function percentageToCoordIndex(
  percentage: number,
  cumulativeDistances: number[],
  totalDistance: number
): number {
  if (percentage <= 0) return 0;
  if (percentage >= 100) return cumulativeDistances.length - 1;

  const targetDistance = (percentage / 100) * totalDistance;

  // Binary search for closest index
  let left = 0;
  let right = cumulativeDistances.length - 1;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (cumulativeDistances[mid] < targetDistance) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  // Check if previous index is closer
  if (left > 0) {
    const prevDiff = Math.abs(cumulativeDistances[left - 1] - targetDistance);
    const currDiff = Math.abs(cumulativeDistances[left] - targetDistance);
    if (prevDiff < currDiff) {
      return left - 1;
    }
  }

  return left;
}

/**
 * Calculate stats for a segment of coordinates
 */
export function calculateSegmentStats(
  coordinates: [number, number, number][],
  startIndex: number,
  endIndex: number
): { distanceKm: number; elevationGain: number; elevationLoss: number } {
  let distanceKm = 0;
  let elevationGain = 0;
  let elevationLoss = 0;

  for (let i = startIndex + 1; i <= endIndex; i++) {
    const [lng1, lat1, elev1] = coordinates[i - 1];
    const [lng2, lat2, elev2] = coordinates[i];

    // Calculate distance using Haversine
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    distanceKm += R * c;

    // Calculate elevation change
    const elevDiff = elev2 - elev1;
    if (elevDiff > 0) {
      elevationGain += elevDiff;
    } else {
      elevationLoss += Math.abs(elevDiff);
    }
  }

  return { distanceKm, elevationGain, elevationLoss };
}

/**
 * Generate day splits from breakpoint percentages
 */
export function generateDaySplits(
  blendedRoute: BlendedRoute,
  breakpoints: number[]
): DaySplit[] {
  const { coordinates, distanceKm: totalDistance } = blendedRoute;
  const cumulativeDistances = calculateCumulativeDistances(coordinates);

  // Create percentage boundaries: [0, ...breakpoints, 100]
  const boundaries = [0, ...breakpoints.sort((a, b) => a - b), 100];
  const daySplits: DaySplit[] = [];

  for (let i = 0; i < boundaries.length - 1; i++) {
    const startPercentage = boundaries[i];
    const endPercentage = boundaries[i + 1];

    const startCoordIndex = percentageToCoordIndex(
      startPercentage,
      cumulativeDistances,
      totalDistance
    );
    const endCoordIndex = percentageToCoordIndex(
      endPercentage,
      cumulativeDistances,
      totalDistance
    );

    const stats = calculateSegmentStats(coordinates, startCoordIndex, endCoordIndex);

    daySplits.push({
      dayNumber: i + 1,
      startPercentage,
      endPercentage,
      startCoordIndex,
      endCoordIndex,
      ...stats,
    });
  }

  return daySplits;
}

/**
 * Get breakpoint coordinates for map markers
 */
export function getBreakpointCoordinates(
  blendedRoute: BlendedRoute,
  breakpoints: number[]
): Breakpoint[] {
  const { coordinates, distanceKm: totalDistance } = blendedRoute;
  const cumulativeDistances = calculateCumulativeDistances(coordinates);

  return breakpoints.map((percentage) => {
    const coordIndex = percentageToCoordIndex(
      percentage,
      cumulativeDistances,
      totalDistance
    );

    return {
      percentage,
      coordIndex,
      coordinates: coordinates[coordIndex],
      cumulativeDistanceKm: cumulativeDistances[coordIndex],
    };
  });
}
