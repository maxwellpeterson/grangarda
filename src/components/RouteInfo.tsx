import { useMemo } from 'react';
import type { RouteData } from '../types/route';
import { useUnits } from '../hooks/useUnits';
import { useBlendedRoute } from '../hooks/useBlendedRoute';
import { ROUTE_CONFIG } from '../hooks/useRouteData';

interface RouteInfoProps {
  routes: RouteData[];
  visibleRoutes: Set<'gravel' | 'tarmac'>;
}

export function RouteInfo({ routes, visibleRoutes }: RouteInfoProps) {
  const { formatDistance, formatElevation, formatElevationChange } = useUnits();
  const { blendedRoute, isBuilding, selections, divergingSegments } = useBlendedRoute();
  // divergingSegments is used for the building progress indicator
  const visibleRoutesList = routes.filter((r) => visibleRoutes.has(r.id));

  // Calculate min/max elevation for blended route
  const blendedElevationStats = useMemo(() => {
    if (!blendedRoute) return null;
    const elevations = blendedRoute.coordinates.map(([, , elev]) => elev);
    return {
      min: Math.min(...elevations),
      max: Math.max(...elevations),
    };
  }, [blendedRoute]);

  // Show blended route when not in building mode and we have a complete one
  const showBlendedRoute = !isBuilding && blendedRoute !== null;

  if (visibleRoutesList.length === 0 && !showBlendedRoute) {
    return null;
  }

  return (
    <div className="route-info">
      {/* Blended route card (shown first when available) */}
      {showBlendedRoute && blendedElevationStats && (
        <div
          className="route-info-card blended-route-card"
          style={{ borderColor: ROUTE_CONFIG.blended.color }}
        >
          <h3 style={{ color: ROUTE_CONFIG.blended.color }}>
            {ROUTE_CONFIG.blended.name}
            <span className="blended-badge">Custom</span>
          </h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Distance</span>
              <span className="info-value">{formatDistance(blendedRoute.distanceKm, 1)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Elevation Gain</span>
              <span className="info-value">{formatElevationChange(blendedRoute.elevationGain, true)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Max Elevation</span>
              <span className="info-value">{formatElevation(blendedElevationStats.max)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Min Elevation</span>
              <span className="info-value">{formatElevation(blendedElevationStats.min)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Building mode progress indicator */}
      {isBuilding && (
        <div className="building-progress-card">
          <h3>Building Custom Route</h3>
          <p>
            Click on diverging segments on the map to choose between gravel and tarmac.
          </p>
          <div className="progress-info">
            <span className="progress-count">
              {selections.size} of {divergingSegments.length} segments selected
            </span>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${(selections.size / divergingSegments.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Original route cards */}
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
              <span className="info-value">{formatDistance(route.stats.distance, 1)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Elevation Gain</span>
              <span className="info-value">{formatElevationChange(route.stats.elevationGain, true)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Max Elevation</span>
              <span className="info-value">{formatElevation(route.stats.maxElevation)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Min Elevation</span>
              <span className="info-value">{formatElevation(route.stats.minElevation)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
