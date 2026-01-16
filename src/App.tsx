import { useState, useCallback, useRef } from 'react';
import { HoverProvider } from './hooks/useHoverSync';
import { UnitsProvider } from './hooks/useUnits';
import { BlendedRouteProvider, useBlendedRoute } from './hooks/useBlendedRoute';
import { useRouteData } from './hooks/useRouteData';
import { Header } from './components/Header';
import { Map, type MapRef } from './components/Map';
import { RouteToggle } from './components/RouteToggle';
import { ElevationProfiles } from './components/ElevationProfiles';
import { RouteInfo } from './components/RouteInfo';
import { SegmentTable } from './components/SegmentTable';
import type { Segment } from './types/segments';
import './App.css';

function AppContent() {
  const { routes, isLoading, error } = useRouteData();
  const { isBuilding } = useBlendedRoute();
  const mapRef = useRef<MapRef>(null);
  const [visibleRoutes, setVisibleRoutes] = useState<Set<'gravel' | 'tarmac'>>(
    new Set(['gravel', 'tarmac'])
  );

  const handleToggleRoute = useCallback((routeId: 'gravel' | 'tarmac') => {
    setVisibleRoutes((prev) => {
      const next = new Set(prev);
      if (next.has(routeId)) {
        next.delete(routeId);
      } else {
        next.add(routeId);
      }
      return next;
    });
  }, []);

  const handleSegmentFocus = useCallback((segment: Segment) => {
    mapRef.current?.zoomToSegment(segment);
  }, []);

  if (error) {
    return (
      <div className="app">
        <Header />
        <main className="main error-state">
          <div className="error-message">
            <h2>Failed to load routes</h2>
            <p>{error}</p>
            <p>Make sure the GPX files are in the public/data/ folder.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <Header />
      <main className="main">
        {isLoading ? (
          <div className="loading">
            <div className="loading-spinner" />
            <p>Loading routes...</p>
          </div>
        ) : (
          <>
            {!isBuilding && (
              <section className="controls-section">
                <RouteToggle
                  routes={routes}
                  visibleRoutes={visibleRoutes}
                  onToggle={handleToggleRoute}
                />
              </section>
            )}
            
            {isBuilding ? (
              <section className="build-mode-section">
                <div className="build-mode-layout">
                  <div className="build-mode-map">
                    <Map ref={mapRef} routes={routes} visibleRoutes={visibleRoutes} />
                  </div>
                  <div className="build-mode-sidebar">
                    <SegmentTable onSegmentFocus={handleSegmentFocus} />
                  </div>
                </div>
              </section>
            ) : (
              <section className="map-section">
                <Map ref={mapRef} routes={routes} visibleRoutes={visibleRoutes} />
              </section>
            )}
            
            <section className="charts-section">
              <ElevationProfiles routes={routes} visibleRoutes={visibleRoutes} />
            </section>
            <section className="info-section">
              <RouteInfo routes={routes} visibleRoutes={visibleRoutes} />
            </section>
          </>
        )}
      </main>
      <footer className="footer">
        <p>
          Data from{' '}
          <a href="https://grangarda.com" target="_blank" rel="noopener noreferrer">
            GranGarda.com
          </a>
          {' '} | Built with Mapbox GL JS
        </p>
      </footer>
    </div>
  );
}

function AppWithSegments() {
  const { segments, isLoading } = useRouteData();
  
  // Wait for segments to load before rendering BlendedRouteProvider
  if (isLoading) {
    return (
      <div className="app">
        <div className="loading">
          <div className="loading-spinner" />
          <p>Loading routes...</p>
        </div>
      </div>
    );
  }
  
  return (
    <BlendedRouteProvider segments={segments}>
      <AppContent />
    </BlendedRouteProvider>
  );
}

function App() {
  return (
    <UnitsProvider>
      <HoverProvider>
        <AppWithSegments />
      </HoverProvider>
    </UnitsProvider>
  );
}

export default App;
