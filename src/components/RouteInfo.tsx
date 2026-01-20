import { useMemo, useState, useCallback } from "react";
import type { RouteData } from "../types/route";
import { useUnits } from "../hooks/useUnits";
import { useBlendedRoute } from "../hooks/useBlendedRoute";
import { ROUTE_CONFIG } from "../hooks/useRouteData";
import type { BlendedRoute } from "../types/segments";
import { DaySplitter } from "./DaySplitter";

interface RouteInfoProps {
  routes: RouteData[];
  visibleRoutes: Set<"gravel" | "tarmac">;
}

/**
 * Generate GPX file content from blended route coordinates
 */
function generateGpx(blendedRoute: BlendedRoute): string {
  const timestamp = new Date().toISOString();
  const points = blendedRoute.coordinates
    .map(
      ([lng, lat, ele]) =>
        `      <trkpt lat="${lat}" lon="${lng}"><ele>${ele.toFixed(1)}</ele></trkpt>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GranGarda Route Builder"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>GranGarda Custom Route</name>
    <time>${timestamp}</time>
  </metadata>
  <trk>
    <name>GranGarda Custom Route</name>
    <trkseg>
${points}
    </trkseg>
  </trk>
</gpx>`;
}

export function RouteInfo({ routes, visibleRoutes }: RouteInfoProps) {
  const { formatDistance, formatElevation, formatElevationChange } = useUnits();
  const { blendedRoute, isBuilding, selections, divergingSegments } =
    useBlendedRoute();
  const [copySuccess, setCopySuccess] = useState(false);
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

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  }, []);

  const handleDownloadGpx = useCallback(() => {
    if (!blendedRoute) return;

    const gpxContent = generateGpx(blendedRoute);
    const blob = new Blob([gpxContent], { type: "application/gpx+xml" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "grangarda-custom-route.gpx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
              <span className="info-value">
                {formatDistance(blendedRoute.distanceKm, 1)}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Elevation Gain</span>
              <span className="info-value">
                {formatElevationChange(blendedRoute.elevationGain)}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Max Elevation</span>
              <span className="info-value">
                {formatElevation(blendedElevationStats.max)}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Min Elevation</span>
              <span className="info-value">
                {formatElevation(blendedElevationStats.min)}
              </span>
            </div>
          </div>
          <DaySplitter />
          <div className="blended-route-actions">
            <button
              className="action-button copy-link-button"
              onClick={handleCopyLink}
            >
              {copySuccess ? "Copied!" : "Copy Link"}
            </button>
            <button
              className="action-button download-gpx-button"
              onClick={handleDownloadGpx}
            >
              Download GPX
            </button>
          </div>
        </div>
      )}

      {/* Building mode progress indicator */}
      {isBuilding && (
        <div className="building-progress-card">
          <h3>Building Custom Route</h3>
          <p>
            Click on diverging segments on the map to choose between gravel and
            tarmac.
          </p>
          <div className="progress-info">
            <span className="progress-count">
              {selections.size} of {divergingSegments.length} segments selected
            </span>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${(selections.size / divergingSegments.length) * 100}%`,
                }}
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
              <span className="info-value">
                {formatDistance(route.stats.distance, 1)}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Elevation Gain</span>
              <span className="info-value">
                {formatElevationChange(route.stats.elevationGain)}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Max Elevation</span>
              <span className="info-value">
                {formatElevation(route.stats.maxElevation)}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Min Elevation</span>
              <span className="info-value">
                {formatElevation(route.stats.minElevation)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
