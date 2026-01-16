import type { RouteData } from '../types/route';
import { useUnits } from '../hooks/useUnits';

interface RouteToggleProps {
  routes: RouteData[];
  visibleRoutes: Set<'gravel' | 'tarmac'>;
  onToggle: (routeId: 'gravel' | 'tarmac') => void;
}

export function RouteToggle({ routes, visibleRoutes, onToggle }: RouteToggleProps) {
  const { formatDistance, formatElevationChange } = useUnits();

  return (
    <div className="route-toggle">
      {routes.map((route) => {
        const isActive = visibleRoutes.has(route.id);
        return (
          <button
            key={route.id}
            className={`toggle-button ${isActive ? 'active' : ''}`}
            onClick={() => onToggle(route.id)}
            style={{
              '--route-color': route.color,
              '--route-fill': route.fillColor,
            } as React.CSSProperties}
          >
            <span className="toggle-indicator" />
            <span className="toggle-label">{route.name}</span>
            <span className="toggle-stats">
              {formatDistance(route.stats.distance)} | {formatElevationChange(route.stats.elevationGain, true)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
