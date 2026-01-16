import { useState, useEffect } from 'react';
import { parseGpxFile } from '../utils/gpx';
import type { RouteData } from '../types/route';
import type { Segment } from '../types/segments';

// Route colors - pretty palette inspired by the Italian landscape
export const ROUTE_CONFIG = {
  gravel: {
    name: 'Gravel Route',
    color: '#E67E22', // Warm terracotta orange
    fillColor: 'rgba(230, 126, 34, 0.3)',
    url: '/data/gravel.gpx',
  },
  tarmac: {
    name: 'Tarmac Route',
    color: '#3498DB', // Lake Garda blue
    fillColor: 'rgba(52, 152, 219, 0.3)',
    url: '/data/tarmac.gpx',
  },
  blended: {
    name: 'My Route',
    color: '#9B59B6', // Purple - complements orange and blue
    fillColor: 'rgba(155, 89, 182, 0.3)',
  },
  shared: {
    color: '#CBD5E0', // Light grey for shared segments
    fillColor: 'rgba(203, 213, 224, 0.3)',
  },
} as const;

interface UseRouteDataResult {
  routes: RouteData[];
  segments: Segment[];
  isLoading: boolean;
  error: string | null;
}

export function useRouteData(): UseRouteDataResult {
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRoutes() {
      try {
        setIsLoading(true);
        setError(null);

        const [gravelRoute, tarmacRoute, segmentsData] = await Promise.all([
          parseGpxFile(
            ROUTE_CONFIG.gravel.url,
            'gravel',
            ROUTE_CONFIG.gravel.name,
            ROUTE_CONFIG.gravel.color,
            ROUTE_CONFIG.gravel.fillColor
          ),
          parseGpxFile(
            ROUTE_CONFIG.tarmac.url,
            'tarmac',
            ROUTE_CONFIG.tarmac.name,
            ROUTE_CONFIG.tarmac.color,
            ROUTE_CONFIG.tarmac.fillColor
          ),
          fetch('/data/segments.json').then(res => res.json()) as Promise<Segment[]>,
        ]);

        setRoutes([tarmacRoute, gravelRoute]); // Tarmac first so gravel renders on top
        setSegments(segmentsData);
      } catch (err) {
        console.error('Failed to load routes:', err);
        setError(err instanceof Error ? err.message : 'Failed to load route data');
      } finally {
        setIsLoading(false);
      }
    }

    loadRoutes();
  }, []);

  return { routes, segments, isLoading, error };
}
