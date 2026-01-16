import { useUnits } from '../hooks/useUnits';

export function Header() {
  const { units, toggleUnits } = useUnits();

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
      </div>
    </header>
  );
}
