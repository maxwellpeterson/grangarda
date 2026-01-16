import type { Segment, RouteChoice } from '../types/segments';
import { useUnits } from '../hooks/useUnits';
import { ROUTE_CONFIG } from '../hooks/useRouteData';

interface SegmentPopupProps {
  segment: Segment;
  position: { x: number; y: number };
  currentSelection?: RouteChoice;
  onSelect: (choice: RouteChoice) => void;
  onClose: () => void;
}

export function SegmentPopup({
  segment,
  position,
  currentSelection,
  onSelect,
  onClose,
}: SegmentPopupProps) {
  const { formatDistance, formatElevation, units } = useUnits();

  const gravelStats = segment.gravel;
  const tarmacStats = segment.tarmac;

  // Calculate differences
  const distanceDiff = gravelStats.distanceKm - tarmacStats.distanceKm;
  const elevationGainDiff = gravelStats.elevationGain - tarmacStats.elevationGain;

  return (
    <>
      {/* Backdrop */}
      <div className="segment-popup-backdrop" onClick={onClose} />
      
      {/* Popup */}
      <div
        className="segment-popup"
        style={{
          left: Math.min(position.x, window.innerWidth - 320),
          top: Math.min(position.y + 10, window.innerHeight - 300),
        }}
      >
        <div className="segment-popup-header">
          <h3>Choose Route Segment</h3>
          <button className="segment-popup-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="segment-popup-options">
          {/* Gravel Option */}
          <button
            className={`segment-option ${currentSelection === 'gravel' ? 'selected' : ''}`}
            onClick={() => onSelect('gravel')}
            style={{ '--option-color': ROUTE_CONFIG.gravel.color } as React.CSSProperties}
          >
            <div className="option-header">
              <span
                className="option-color-dot"
                style={{ backgroundColor: ROUTE_CONFIG.gravel.color }}
              />
              <span className="option-name">Gravel</span>
              {currentSelection === 'gravel' && <span className="option-selected-badge">Selected</span>}
            </div>
            <div className="option-stats">
              <div className="stat">
                <span className="stat-label">Distance</span>
                <span className="stat-value">{formatDistance(gravelStats.distanceKm)}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Elevation +</span>
                <span className="stat-value">{formatElevation(gravelStats.elevationGain)}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Elevation -</span>
                <span className="stat-value">{formatElevation(gravelStats.elevationLoss)}</span>
              </div>
            </div>
          </button>

          {/* Tarmac Option */}
          <button
            className={`segment-option ${currentSelection === 'tarmac' ? 'selected' : ''}`}
            onClick={() => onSelect('tarmac')}
            style={{ '--option-color': ROUTE_CONFIG.tarmac.color } as React.CSSProperties}
          >
            <div className="option-header">
              <span
                className="option-color-dot"
                style={{ backgroundColor: ROUTE_CONFIG.tarmac.color }}
              />
              <span className="option-name">Tarmac</span>
              {currentSelection === 'tarmac' && <span className="option-selected-badge">Selected</span>}
            </div>
            <div className="option-stats">
              <div className="stat">
                <span className="stat-label">Distance</span>
                <span className="stat-value">{formatDistance(tarmacStats.distanceKm)}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Elevation +</span>
                <span className="stat-value">{formatElevation(tarmacStats.elevationGain)}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Elevation -</span>
                <span className="stat-value">{formatElevation(tarmacStats.elevationLoss)}</span>
              </div>
            </div>
          </button>
        </div>

        {/* Comparison footer */}
        <div className="segment-popup-comparison">
          <div className="comparison-item">
            <span className="comparison-label">Distance diff:</span>
            <span className={`comparison-value ${distanceDiff > 0 ? 'gravel-longer' : 'tarmac-longer'}`}>
              {distanceDiff > 0 ? 'Gravel' : 'Tarmac'} is{' '}
              {formatDistance(Math.abs(distanceDiff))} {units === 'metric' ? '' : ''}longer
            </span>
          </div>
          <div className="comparison-item">
            <span className="comparison-label">Climbing diff:</span>
            <span className={`comparison-value ${elevationGainDiff > 0 ? 'gravel-more' : 'tarmac-more'}`}>
              {elevationGainDiff > 0 ? 'Gravel' : 'Tarmac'} has{' '}
              {formatElevation(Math.abs(elevationGainDiff))} more climbing
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
