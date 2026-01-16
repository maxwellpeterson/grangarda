import { useMemo } from 'react';
import type { RouteData } from '../types/route';
import { ElevationChart } from './ElevationChart';
import { BlendedElevationChart } from './BlendedElevationChart';
import { useBlendedRoute } from '../hooks/useBlendedRoute';

interface ElevationProfilesProps {
  routes: RouteData[];
  visibleRoutes: Set<'gravel' | 'tarmac'>;
}

export function ElevationProfiles({ routes, visibleRoutes }: ElevationProfilesProps) {
  const { blendedRoute, isBuilding } = useBlendedRoute();

  // Sort routes so gravel is first (top), then tarmac
  const sortedRoutes = useMemo(() => {
    return [...routes].sort((a, b) => {
      if (a.id === 'gravel') return -1;
      if (b.id === 'gravel') return 1;
      return 0;
    });
  }, [routes]);

  // Show blended route chart when we have a completed blended route and not in building mode
  const showBlendedChart = !isBuilding && blendedRoute !== null;

  return (
    <div className="elevation-profiles">
      <div className="profiles-container">
        {/* Blended route chart (shown at top when available) */}
        {showBlendedChart && (
          <BlendedElevationChart blendedRoute={blendedRoute} />
        )}
        
        {/* Original route charts */}
        {sortedRoutes.map((route) => (
          <ElevationChart
            key={route.id}
            route={route}
            isVisible={visibleRoutes.has(route.id)}
          />
        ))}
      </div>
      {visibleRoutes.size === 0 && !showBlendedChart && (
        <div className="no-routes-message">
          Select a route above to view its elevation profile
        </div>
      )}
    </div>
  );
}
