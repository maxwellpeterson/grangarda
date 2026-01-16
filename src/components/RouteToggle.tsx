import type { RouteData } from '../types/route';

interface RouteToggleProps {
  routes: RouteData[];
  visibleRoutes: Set<'gravel' | 'tarmac'>;
  onToggle: (routeId: 'gravel' | 'tarmac') => void;
}

export function RouteToggle({ routes, visibleRoutes, onToggle }: RouteToggleProps) {
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
              {route.stats.distance.toFixed(0)} km | +{route.stats.elevationGain.toFixed(0)} m
            </span>
          </button>
        );
      })}
    </div>
  );
}
