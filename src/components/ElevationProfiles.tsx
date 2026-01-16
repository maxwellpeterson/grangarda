import type { RouteData } from '../types/route';
import { ElevationChart } from './ElevationChart';

interface ElevationProfilesProps {
  routes: RouteData[];
  visibleRoutes: Set<'gravel' | 'tarmac'>;
}

export function ElevationProfiles({ routes, visibleRoutes }: ElevationProfilesProps) {
  // Sort routes so gravel is first (top), then tarmac
  const sortedRoutes = [...routes].sort((a, b) => {
    if (a.id === 'gravel') return -1;
    if (b.id === 'gravel') return 1;
    return 0;
  });

  return (
    <div className="elevation-profiles">
      <h2 className="profiles-title">Elevation Profiles</h2>
      <div className="profiles-container">
        {sortedRoutes.map((route) => (
          <ElevationChart
            key={route.id}
            route={route}
            isVisible={visibleRoutes.has(route.id)}
          />
        ))}
      </div>
      {visibleRoutes.size === 0 && (
        <div className="no-routes-message">
          Select a route above to view its elevation profile
        </div>
      )}
    </div>
  );
}
