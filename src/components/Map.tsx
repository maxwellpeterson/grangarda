import {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { RouteData } from "../types/route";
import type { Segment } from "../types/segments";
import { useHoverSync } from "../hooks/useHoverSync";
import { useBlendedRoute } from "../hooks/useBlendedRoute";
import { ROUTE_CONFIG } from "../hooks/useRouteData";
import { findClosestPoint } from "../utils/gpx";

interface MapProps {
  routes: RouteData[];
  visibleRoutes: Set<"gravel" | "tarmac">;
}

export interface MapRef {
  zoomToSegment: (segment: Segment) => void;
}

// You'll need to set your Mapbox token here or via environment variable
const MAPBOX_TOKEN =
  import.meta.env.VITE_MAPBOX_TOKEN || "YOUR_MAPBOX_TOKEN_HERE";

export const Map = forwardRef<MapRef, MapProps>(function Map(
  { routes, visibleRoutes },
  ref,
) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const { hoverState, setHover, clearHover } = useHoverSync();
  const {
    isBuilding,
    segments,
    selections,
    selectedSegmentId,
    blendedRoute,
    breakpointCoordinates,
    setHoveredSegment,
  } = useBlendedRoute();

  // Refs for breakpoint markers
  const breakpointMarkers = useRef<mapboxgl.Marker[]>([]);

  // Expose zoom function via ref
  useImperativeHandle(
    ref,
    () => ({
      zoomToSegment: (segment: Segment) => {
        if (!map.current) return;

        // Collect all coordinates from both gravel and tarmac options
        const allCoords: [number, number][] = [];

        segment.gravel.coordinates.forEach(([lng, lat]) => {
          allCoords.push([lng, lat]);
        });
        segment.tarmac.coordinates.forEach(([lng, lat]) => {
          allCoords.push([lng, lat]);
        });

        if (allCoords.length === 0) return;

        const bounds = allCoords.reduce(
          (bounds, coord) => bounds.extend(coord),
          new mapboxgl.LngLatBounds(allCoords[0], allCoords[0]),
        );

        map.current.fitBounds(bounds, {
          padding: { top: 80, bottom: 80, left: 80, right: 80 },
          duration: 800,
          maxZoom: 14,
        });
      },
    }),
    [],
  );

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [10.75, 45.7], // Lake Garda area
      zoom: 9,
      pitch: 0,
      bearing: 0,
    });

    map.current.on("load", () => {
      setMapLoaded(true);
    });

    // Create hover marker
    const el = document.createElement("div");
    el.className = "hover-marker";
    marker.current = new mapboxgl.Marker({ element: el })
      .setLngLat([0, 0])
      .addTo(map.current);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Add/update route layers when map is loaded and routes are available
  useEffect(() => {
    if (!map.current || !mapLoaded || routes.length === 0) return;

    const m = map.current;

    // Add routes
    routes.forEach((route) => {
      const sourceId = `route-${route.id}`;
      const layerId = `route-${route.id}-line`;
      const outlineLayerId = `route-${route.id}-outline`;
      const hitAreaLayerId = `route-${route.id}-hit-area`;

      // Remove existing layers/sources if they exist
      if (m.getLayer(hitAreaLayerId)) m.removeLayer(hitAreaLayerId);
      if (m.getLayer(layerId)) m.removeLayer(layerId);
      if (m.getLayer(outlineLayerId)) m.removeLayer(outlineLayerId);
      if (m.getSource(sourceId)) m.removeSource(sourceId);

      // Add source
      m.addSource(sourceId, {
        type: "geojson",
        data: route.geojson,
      });

      // Determine visibility - hide in building mode
      const isVisible = visibleRoutes.has(route.id) && !isBuilding;

      // Add outline layer (wider, darker)
      m.addLayer({
        id: outlineLayerId,
        type: "line",
        source: sourceId,
        layout: {
          "line-join": "round",
          "line-cap": "round",
          visibility: isVisible ? "visible" : "none",
        },
        paint: {
          "line-color": "#1a1a2e",
          "line-width": 6,
          "line-opacity": 0.8,
        },
      });

      // Add main line layer
      m.addLayer({
        id: layerId,
        type: "line",
        source: sourceId,
        layout: {
          "line-join": "round",
          "line-cap": "round",
          visibility: isVisible ? "visible" : "none",
        },
        paint: {
          "line-color": route.color,
          "line-width": 4,
          "line-opacity": 1,
        },
      });

      // Add invisible hit area layer (wider, for easier hover detection)
      m.addLayer({
        id: hitAreaLayerId,
        type: "line",
        source: sourceId,
        layout: {
          "line-join": "round",
          "line-cap": "round",
          visibility: isVisible ? "visible" : "none",
        },
        paint: {
          "line-color": route.color,
          "line-width": 24,
          "line-opacity": 0,
        },
      });

      // Add hover interactions to the hit area layer
      m.on("mouseenter", hitAreaLayerId, () => {
        m.getCanvas().style.cursor = "pointer";
      });

      m.on("mouseleave", hitAreaLayerId, () => {
        m.getCanvas().style.cursor = "";
        clearHover();
      });

      m.on("mousemove", hitAreaLayerId, (e) => {
        if (e.lngLat) {
          const point = findClosestPoint(
            route.elevationProfile,
            e.lngLat.lat,
            e.lngLat.lng,
          );
          if (point) {
            setHover(route.id, point, "map");
          }
        }
      });
    });

    // Fit bounds to show all routes
    const allCoords: [number, number][] = [];
    routes.forEach((route) => {
      if (visibleRoutes.has(route.id)) {
        route.geojson.geometry.coordinates.forEach((coord) => {
          allCoords.push([coord[0], coord[1]]);
        });
      }
    });

    if (allCoords.length > 0) {
      const bounds = allCoords.reduce(
        (bounds, coord) => bounds.extend(coord as [number, number]),
        new mapboxgl.LngLatBounds(allCoords[0], allCoords[0]),
      );

      m.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        duration: 1000,
      });
    }
  }, [mapLoaded, routes, visibleRoutes, isBuilding, setHover, clearHover]);

  // Update layer visibility when visibleRoutes or isBuilding changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    routes.forEach((route) => {
      const layerId = `route-${route.id}-line`;
      const outlineLayerId = `route-${route.id}-outline`;
      const hitAreaLayerId = `route-${route.id}-hit-area`;
      const visibility =
        visibleRoutes.has(route.id) && !isBuilding ? "visible" : "none";

      if (map.current?.getLayer(layerId)) {
        map.current.setLayoutProperty(layerId, "visibility", visibility);
      }
      if (map.current?.getLayer(outlineLayerId)) {
        map.current.setLayoutProperty(outlineLayerId, "visibility", visibility);
      }
      if (map.current?.getLayer(hitAreaLayerId)) {
        map.current.setLayoutProperty(hitAreaLayerId, "visibility", visibility);
      }
    });
  }, [mapLoaded, routes, visibleRoutes, isBuilding]);

  // Add/update segment layers in building mode
  useEffect(() => {
    if (!map.current || !mapLoaded || segments.length === 0) return;

    const m = map.current;

    // Remove all existing segment layers
    segments.forEach((segment) => {
      const layerIds = [
        `segment-${segment.id}-gravel-outline`,
        `segment-${segment.id}-gravel-line`,
        `segment-${segment.id}-gravel-hit`,
        `segment-${segment.id}-tarmac-outline`,
        `segment-${segment.id}-tarmac-line`,
        `segment-${segment.id}-tarmac-hit`,
        `segment-${segment.id}-shared-outline`,
        `segment-${segment.id}-shared-line`,
      ];
      const sourceIds = [
        `segment-${segment.id}-gravel`,
        `segment-${segment.id}-tarmac`,
        `segment-${segment.id}-shared`,
      ];

      layerIds.forEach((id) => {
        if (m.getLayer(id)) m.removeLayer(id);
      });
      sourceIds.forEach((id) => {
        if (m.getSource(id)) m.removeSource(id);
      });
    });

    // Only add segment layers in building mode
    if (!isBuilding) return;

    segments.forEach((segment) => {
      const isSelected = selectedSegmentId === segment.id;

      if (segment.type === "shared") {
        // Add shared segment (grey)
        const sourceId = `segment-${segment.id}-shared`;
        const coords = segment.gravel.coordinates.map(([lng, lat]) => [
          lng,
          lat,
        ]);

        if (coords.length < 2) return;

        m.addSource(sourceId, {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: coords },
          },
        });

        m.addLayer({
          id: `segment-${segment.id}-shared-outline`,
          type: "line",
          source: sourceId,
          paint: {
            "line-color": "#666",
            "line-width": 5,
            "line-opacity": 0.6,
          },
          layout: { "line-join": "round", "line-cap": "round" },
        });

        m.addLayer({
          id: `segment-${segment.id}-shared-line`,
          type: "line",
          source: sourceId,
          paint: {
            "line-color": ROUTE_CONFIG.shared.color,
            "line-width": 3,
            "line-opacity": 1,
          },
          layout: { "line-join": "round", "line-cap": "round" },
        });
      } else {
        // Diverging segment - show both options
        const selection = selections.get(segment.id);

        // Gravel option
        const gravelCoords = segment.gravel.coordinates.map(([lng, lat]) => [
          lng,
          lat,
        ]);
        if (gravelCoords.length >= 2) {
          const gravelSourceId = `segment-${segment.id}-gravel`;
          m.addSource(gravelSourceId, {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: gravelCoords },
            },
          });

          const isGravelSelected = selection === "gravel";
          // Highlight when this segment is focused in the table
          const isHighlighted = isSelected;
          const gravelOpacity = selection
            ? isGravelSelected
              ? 1
              : 0.3
            : isHighlighted
              ? 1
              : 0.7;
          const lineWidth = isHighlighted ? 6 : isGravelSelected ? 4 : 3;

          m.addLayer({
            id: `segment-${segment.id}-gravel-outline`,
            type: "line",
            source: gravelSourceId,
            paint: {
              "line-color": "#1a1a2e",
              "line-width": lineWidth + 2,
              "line-opacity": gravelOpacity * 0.8,
            },
            layout: { "line-join": "round", "line-cap": "round" },
          });

          m.addLayer({
            id: `segment-${segment.id}-gravel-line`,
            type: "line",
            source: gravelSourceId,
            paint: {
              "line-color": ROUTE_CONFIG.gravel.color,
              "line-width": lineWidth,
              "line-opacity": gravelOpacity,
            },
            layout: { "line-join": "round", "line-cap": "round" },
          });

          // Hit area for gravel (for hover effects)
          m.addLayer({
            id: `segment-${segment.id}-gravel-hit`,
            type: "line",
            source: gravelSourceId,
            paint: {
              "line-color": ROUTE_CONFIG.gravel.color,
              "line-width": 20,
              "line-opacity": 0,
            },
            layout: { "line-join": "round", "line-cap": "round" },
          });
        }

        // Tarmac option
        const tarmacCoords = segment.tarmac.coordinates.map(([lng, lat]) => [
          lng,
          lat,
        ]);
        if (tarmacCoords.length >= 2) {
          const tarmacSourceId = `segment-${segment.id}-tarmac`;
          m.addSource(tarmacSourceId, {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: tarmacCoords },
            },
          });

          const isTarmacSelected = selection === "tarmac";
          const isHighlighted = isSelected;
          const tarmacOpacity = selection
            ? isTarmacSelected
              ? 1
              : 0.3
            : isHighlighted
              ? 1
              : 0.7;
          const lineWidth = isHighlighted ? 6 : isTarmacSelected ? 4 : 3;

          m.addLayer({
            id: `segment-${segment.id}-tarmac-outline`,
            type: "line",
            source: tarmacSourceId,
            paint: {
              "line-color": "#1a1a2e",
              "line-width": lineWidth + 2,
              "line-opacity": tarmacOpacity * 0.8,
            },
            layout: { "line-join": "round", "line-cap": "round" },
          });

          m.addLayer({
            id: `segment-${segment.id}-tarmac-line`,
            type: "line",
            source: tarmacSourceId,
            paint: {
              "line-color": ROUTE_CONFIG.tarmac.color,
              "line-width": lineWidth,
              "line-opacity": tarmacOpacity,
            },
            layout: { "line-join": "round", "line-cap": "round" },
          });

          // Hit area for tarmac
          m.addLayer({
            id: `segment-${segment.id}-tarmac-hit`,
            type: "line",
            source: tarmacSourceId,
            paint: {
              "line-color": ROUTE_CONFIG.tarmac.color,
              "line-width": 20,
              "line-opacity": 0,
            },
            layout: { "line-join": "round", "line-cap": "round" },
          });
        }
      }
    });
  }, [mapLoaded, segments, isBuilding, selections, selectedSegmentId]);

  // Add hover handlers for segment layers (for visual feedback only, no popup)
  useEffect(() => {
    if (!map.current || !mapLoaded || !isBuilding) return;

    const m = map.current;

    segments.forEach((segment) => {
      if (segment.type !== "diverging") return;

      const gravelHitLayer = `segment-${segment.id}-gravel-hit`;
      const tarmacHitLayer = `segment-${segment.id}-tarmac-hit`;

      if (m.getLayer(gravelHitLayer)) {
        m.on("mouseenter", gravelHitLayer, () => {
          m.getCanvas().style.cursor = "pointer";
          setHoveredSegment(segment.id);
        });
        m.on("mouseleave", gravelHitLayer, () => {
          m.getCanvas().style.cursor = "";
          setHoveredSegment(null);
        });
      }

      if (m.getLayer(tarmacHitLayer)) {
        m.on("mouseenter", tarmacHitLayer, () => {
          m.getCanvas().style.cursor = "pointer";
          setHoveredSegment(segment.id);
        });
        m.on("mouseleave", tarmacHitLayer, () => {
          m.getCanvas().style.cursor = "";
          setHoveredSegment(null);
        });
      }
    });
  }, [mapLoaded, segments, isBuilding, setHoveredSegment]);

  // Add/update blended route layer when not in building mode
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const m = map.current;
    const sourceId = "blended-route";
    const layerId = "blended-route-line";
    const outlineLayerId = "blended-route-outline";

    // Remove existing layers/source
    if (m.getLayer(layerId)) m.removeLayer(layerId);
    if (m.getLayer(outlineLayerId)) m.removeLayer(outlineLayerId);
    if (m.getSource(sourceId)) m.removeSource(sourceId);

    // Only show blended route when not building and we have one
    if (isBuilding || !blendedRoute) return;

    const coords = blendedRoute.coordinates.map(([lng, lat]) => [lng, lat]);
    if (coords.length < 2) return;

    m.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: coords },
      },
    });

    m.addLayer({
      id: outlineLayerId,
      type: "line",
      source: sourceId,
      paint: {
        "line-color": "#1a1a2e",
        "line-width": 7,
        "line-opacity": 0.9,
      },
      layout: { "line-join": "round", "line-cap": "round" },
    });

    m.addLayer({
      id: layerId,
      type: "line",
      source: sourceId,
      paint: {
        "line-color": ROUTE_CONFIG.blended.color,
        "line-width": 5,
        "line-opacity": 1,
      },
      layout: { "line-join": "round", "line-cap": "round" },
    });
  }, [mapLoaded, isBuilding, blendedRoute]);

  // Add/update breakpoint markers for overnight stops
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing breakpoint markers
    breakpointMarkers.current.forEach((marker) => marker.remove());
    breakpointMarkers.current = [];

    // Only show markers when not building and we have breakpoints
    if (isBuilding || breakpointCoordinates.length === 0) return;

    // Create new markers for each breakpoint
    breakpointCoordinates.forEach((breakpoint) => {
      const el = document.createElement("div");
      el.className = "breakpoint-marker";
      el.textContent = "🌙";

      const newMarker = new mapboxgl.Marker({ element: el })
        .setLngLat([breakpoint.coordinates[0], breakpoint.coordinates[1]])
        .addTo(map.current!);

      breakpointMarkers.current.push(newMarker);
    });

    return () => {
      breakpointMarkers.current.forEach((marker) => marker.remove());
      breakpointMarkers.current = [];
    };
  }, [mapLoaded, isBuilding, breakpointCoordinates]);

  // Update hover marker position
  useEffect(() => {
    if (!marker.current) return;

    if (hoverState.point && hoverState.routeId) {
      const route = routes.find((r) => r.id === hoverState.routeId);
      if (route) {
        marker.current.setLngLat([hoverState.point.lng, hoverState.point.lat]);
        marker.current.getElement().style.display = "block";
        marker.current.getElement().style.backgroundColor = route.color;
      }
    } else {
      marker.current.getElement().style.display = "none";
    }
  }, [hoverState, routes]);

  return (
    <div className="map-container">
      <div ref={mapContainer} className="map" />
    </div>
  );
});
