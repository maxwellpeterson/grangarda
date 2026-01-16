export function Header() {
  return (
    <header className="header">
      <div className="header-content">
        <h1 className="logo">
          <span className="logo-gran">Gran</span>
          <span className="logo-garda">Garda</span>
        </h1>
        <p className="tagline">Route Comparison</p>
      </div>
      <nav className="header-links">
        <a
          href="https://grangarda.com"
          target="_blank"
          rel="noopener noreferrer"
          className="header-link"
        >
          Official Site
        </a>
      </nav>
    </header>
  );
}
