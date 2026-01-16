import { useUnits } from '../hooks/useUnits';
import { useBlendedRoute } from '../hooks/useBlendedRoute';

export function Header() {
  const { units, toggleUnits } = useUnits();
  const { 
    isBuilding, 
    enterBuildMode, 
    exitBuildMode, 
    isComplete,
    divergingSegments,
    selections,
  } = useBlendedRoute();

  const selectedCount = selections.size;
  const totalCount = divergingSegments.length;

  return (
    <header className="header">
      <div className="header-content">
        <h1 className="logo">
          <span className="logo-gran">Gran</span>
          <span className="logo-garda">Garda</span>
        </h1>
        <p className="tagline">Route Comparison</p>
      </div>
      <div className="header-actions">
        {isBuilding ? (
          <>
            <div className="build-mode-indicator">
              <span className="build-mode-label">Building Route</span>
              <span className="build-mode-progress">
                {selectedCount} / {totalCount} segments
              </span>
            </div>
            <button
              className="build-mode-button cancel"
              onClick={() => exitBuildMode(false)}
            >
              Cancel
            </button>
            <button
              className="build-mode-button done"
              onClick={() => exitBuildMode(true)}
              disabled={!isComplete}
            >
              Done
            </button>
          </>
        ) : (
          <>
            <button
              className="build-route-button"
              onClick={enterBuildMode}
            >
              Build Route
            </button>
            <button
              className="unit-toggle"
              onClick={toggleUnits}
              aria-label={`Switch to ${units === 'metric' ? 'imperial' : 'metric'} units`}
            >
              <span className={`unit-option ${units === 'metric' ? 'active' : ''}`}>
                km/m
              </span>
              <span className="unit-divider">/</span>
              <span className={`unit-option ${units === 'imperial' ? 'active' : ''}`}>
                mi/ft
              </span>
            </button>
            <a
              href="https://grangarda.com"
              target="_blank"
              rel="noopener noreferrer"
              className="header-link"
            >
              Official Site
            </a>
          </>
        )}
      </div>
    </header>
  );
}
