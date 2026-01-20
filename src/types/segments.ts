export interface SegmentStats {
  coordinates: [number, number, number][]; // [lng, lat, elevation]
  distanceKm: number;
  elevationGain: number;
  elevationLoss: number;
}

export interface Segment {
  id: string;
  type: "shared" | "diverging";
  order: number;
  gravel: SegmentStats;
  tarmac: SegmentStats;
}

export type RouteChoice = "gravel" | "tarmac";

export interface BlendedRouteState {
  isBuilding: boolean;
  selections: Map<string, RouteChoice>; // segmentId -> choice
  hoveredSegmentId: string | null;
  selectedSegmentId: string | null; // for popup
}

export interface BlendedRoute {
  coordinates: [number, number, number][];
  distanceKm: number;
  elevationGain: number;
  elevationLoss: number;
  selections: Map<string, RouteChoice>;
}

export interface DaySplit {
  dayNumber: number;
  startPercentage: number;
  endPercentage: number;
  startCoordIndex: number;
  endCoordIndex: number;
  distanceKm: number;
  elevationGain: number;
  elevationLoss: number;
}

export interface Breakpoint {
  percentage: number;
  coordIndex: number;
  coordinates: [number, number, number];
  cumulativeDistanceKm: number;
}
