import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { RouteData } from '../types/route';
import { useHoverSync } from '../hooks/useHoverSync';
import { findClosestPoint } from '../utils/gpx';

interface MapProps {
  routes: RouteData[];
  visibleRoutes: Set<'gravel' | 'tarmac'>;
}

// You'll need to set your Mapbox token here or via environment variable
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'YOUR_MAPBOX_TOKEN_HERE';

export function Map({ routes, visibleRoutes }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const { hoverState, setHover, clearHover } = useHoverSync();

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [10.75, 45.7], // Lake Garda area
      zoom: 9,
      pitch: 0,
      bearing: 0,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    // Create hover marker
    const el = document.createElement('div');
    el.className = 'hover-marker';
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

      // Remove existing layers/sources if they exist
      if (m.getLayer(layerId)) m.removeLayer(layerId);
      if (m.getLayer(outlineLayerId)) m.removeLayer(outlineLayerId);
      if (m.getSource(sourceId)) m.removeSource(sourceId);

      // Add source
      m.addSource(sourceId, {
        type: 'geojson',
        data: route.geojson,
      });

      // Add outline layer (wider, darker)
      m.addLayer({
        id: outlineLayerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
          visibility: visibleRoutes.has(route.id) ? 'visible' : 'none',
        },
        paint: {
          'line-color': '#1a1a2e',
          'line-width': 6,
          'line-opacity': 0.8,
        },
      });

      // Add main line layer
      m.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
          visibility: visibleRoutes.has(route.id) ? 'visible' : 'none',
        },
        paint: {
          'line-color': route.color,
          'line-width': 4,
          'line-opacity': 1,
        },
      });

      // Add hover interactions
      m.on('mouseenter', layerId, () => {
        m.getCanvas().style.cursor = 'pointer';
      });

      m.on('mouseleave', layerId, () => {
        m.getCanvas().style.cursor = '';
        clearHover();
      });

      m.on('mousemove', layerId, (e) => {
        if (e.lngLat) {
          const point = findClosestPoint(
            route.elevationProfile,
            e.lngLat.lat,
            e.lngLat.lng
          );
          if (point) {
            setHover(route.id, point, 'map');
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
        new mapboxgl.LngLatBounds(allCoords[0], allCoords[0])
      );

      m.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        duration: 1000,
      });
    }
  }, [mapLoaded, routes, visibleRoutes, setHover, clearHover]);

  // Update layer visibility when visibleRoutes changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    routes.forEach((route) => {
      const layerId = `route-${route.id}-line`;
      const outlineLayerId = `route-${route.id}-outline`;
      const visibility = visibleRoutes.has(route.id) ? 'visible' : 'none';

      if (map.current?.getLayer(layerId)) {
        map.current.setLayoutProperty(layerId, 'visibility', visibility);
      }
      if (map.current?.getLayer(outlineLayerId)) {
        map.current.setLayoutProperty(outlineLayerId, 'visibility', visibility);
      }
    });
  }, [mapLoaded, routes, visibleRoutes]);

  // Update hover marker position
  useEffect(() => {
    if (!marker.current) return;

    if (hoverState.point && hoverState.routeId) {
      const route = routes.find((r) => r.id === hoverState.routeId);
      if (route) {
        marker.current.setLngLat([hoverState.point.lng, hoverState.point.lat]);
        marker.current.getElement().style.display = 'block';
        marker.current.getElement().style.backgroundColor = route.color;
      }
    } else {
      marker.current.getElement().style.display = 'none';
    }
  }, [hoverState, routes]);

  return (
    <div className="map-container">
      <div ref={mapContainer} className="map" />
    </div>
  );
}
