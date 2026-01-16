import type { RouteData } from '../types/route';

interface RouteInfoProps {
  routes: RouteData[];
  visibleRoutes: Set<'gravel' | 'tarmac'>;
}

export function RouteInfo({ routes, visibleRoutes }: RouteInfoProps) {
  const visibleRoutesList = routes.filter((r) => visibleRoutes.has(r.id));

  if (visibleRoutesList.length === 0) {
    return null;
  }

  return (
    <div className="route-info">
      {visibleRoutesList.map((route) => (
        <div
          key={route.id}
          className="route-info-card"
          style={{ borderColor: route.color }}
        >
          <h3 style={{ color: route.color }}>{route.name}</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Distance</span>
              <span className="info-value">{route.stats.distance.toFixed(1)} km</span>
            </div>
            <div className="info-item">
              <span className="info-label">Elevation Gain</span>
              <span className="info-value">+{route.stats.elevationGain.toFixed(0)} m</span>
            </div>
            <div className="info-item">
              <span className="info-label">Elevation Loss</span>
              <span className="info-value">-{route.stats.elevationLoss.toFixed(0)} m</span>
            </div>
            <div className="info-item">
              <span className="info-label">Max Elevation</span>
              <span className="info-value">{route.stats.maxElevation.toFixed(0)} m</span>
            </div>
            <div className="info-item">
              <span className="info-label">Min Elevation</span>
              <span className="info-value">{route.stats.minElevation.toFixed(0)} m</span>
            </div>
            <div className="info-item">
              <span className="info-label">Surface</span>
              <span className="info-value">
                {route.id === 'gravel' ? '50% Unpaved' : '99% Paved'}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
