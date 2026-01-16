import type { Feature, LineString } from 'geojson';

export interface ElevationPoint {
  distance: number; // km from start
  elevation: number; // meters
  lat: number;
  lng: number;
  grade?: number; // percent gradient
}

export interface RouteData {
  id: 'gravel' | 'tarmac';
  name: string;
  color: string;
  fillColor: string;
  geojson: Feature<LineString>;
  elevationProfile: ElevationPoint[];
  stats: RouteStats;
}

export interface RouteStats {
  distance: number; // km
  elevationGain: number; // meters
  elevationLoss: number; // meters
  maxElevation: number; // meters
  minElevation: number; // meters
}

export interface HoverState {
  routeId: 'gravel' | 'tarmac' | null;
  point: ElevationPoint | null;
  source: 'map' | 'chart' | null;
}
