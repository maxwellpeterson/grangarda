import { useBlendedRoute } from '../hooks/useBlendedRoute';
import { useUnits } from '../hooks/useUnits';
import { ROUTE_CONFIG } from '../hooks/useRouteData';
import type { Segment, RouteChoice } from '../types/segments';

interface SegmentTableProps {
  onSegmentFocus: (segment: Segment) => void;
}

export function SegmentTable({ onSegmentFocus }: SegmentTableProps) {
  const {
    divergingSegments,
    selections,
    selectSegment,
    selectedSegmentId,
    setSelectedSegment,
  } = useBlendedRoute();
  const { formatDistance, formatElevation } = useUnits();

  const handleRowClick = (segment: Segment) => {
    setSelectedSegment(segment.id);
    onSegmentFocus(segment);
  };

  const handleChoiceClick = (
    e: React.MouseEvent,
    segmentId: string,
    choice: RouteChoice
  ) => {
    e.stopPropagation();
    selectSegment(segmentId, choice);
  };

  return (
    <div className="segment-table-container">
      <div className="segment-table-header">
        <h3>Route Segments</h3>
        <p className="segment-table-subtitle">
          {selections.size} of {divergingSegments.length} selected
        </p>
      </div>
      
      <div className="segment-table-scroll">
        <table className="segment-table">
          <thead>
            <tr>
              <th className="col-segment">#</th>
              <th className="col-gravel">Gravel</th>
              <th className="col-tarmac">Tarmac</th>
            </tr>
          </thead>
          <tbody>
            {divergingSegments.map((segment, index) => {
              const currentChoice = selections.get(segment.id);
              const isActive = selectedSegmentId === segment.id;
              
              return (
                <tr
                  key={segment.id}
                  className={`segment-row ${isActive ? 'active' : ''} ${currentChoice ? 'has-selection' : ''}`}
                  onClick={() => handleRowClick(segment)}
                >
                  <td className="col-segment">
                    <span className="segment-number">{index + 1}</span>
                    {currentChoice && (
                      <span 
                        className="segment-check"
                        style={{ 
                          color: currentChoice === 'gravel' 
                            ? ROUTE_CONFIG.gravel.color 
                            : ROUTE_CONFIG.tarmac.color 
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </td>
                  
                  <td className="col-gravel">
                    <button
                      className={`choice-button ${currentChoice === 'gravel' ? 'selected' : ''}`}
                      onClick={(e) => handleChoiceClick(e, segment.id, 'gravel')}
                      style={{ '--choice-color': ROUTE_CONFIG.gravel.color } as React.CSSProperties}
                    >
                      <span className="choice-distance">
                        {formatDistance(segment.gravel.distanceKm)}
                      </span>
                      <span className="choice-elevation">
                        +{formatElevation(segment.gravel.elevationGain)}
                      </span>
                    </button>
                  </td>
                  
                  <td className="col-tarmac">
                    <button
                      className={`choice-button ${currentChoice === 'tarmac' ? 'selected' : ''}`}
                      onClick={(e) => handleChoiceClick(e, segment.id, 'tarmac')}
                      style={{ '--choice-color': ROUTE_CONFIG.tarmac.color } as React.CSSProperties}
                    >
                      <span className="choice-distance">
                        {formatDistance(segment.tarmac.distanceKm)}
                      </span>
                      <span className="choice-elevation">
                        +{formatElevation(segment.tarmac.elevationGain)}
                      </span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {selectedSegmentId && (
        <SegmentDetails 
          segment={divergingSegments.find(s => s.id === selectedSegmentId)!}
          currentChoice={selections.get(selectedSegmentId)}
        />
      )}
    </div>
  );
}

interface SegmentDetailsProps {
  segment: Segment;
  currentChoice?: RouteChoice;
}

function SegmentDetails({ segment, currentChoice }: SegmentDetailsProps) {
  const { formatDistance, formatElevation } = useUnits();
  
  const gravelStats = segment.gravel;
  const tarmacStats = segment.tarmac;
  
  // Calculate differences
  const distanceDiff = gravelStats.distanceKm - tarmacStats.distanceKm;
  const elevationDiff = gravelStats.elevationGain - tarmacStats.elevationGain;

  return (
    <div className="segment-details">
      <h4>Segment Comparison</h4>
      
      <div className="segment-details-grid">
        <div className="detail-column gravel">
          <div 
            className={`detail-header ${currentChoice === 'gravel' ? 'selected' : ''}`}
            style={{ borderColor: ROUTE_CONFIG.gravel.color }}
          >
            <span 
              className="detail-dot" 
              style={{ backgroundColor: ROUTE_CONFIG.gravel.color }}
            />
            Gravel
            {currentChoice === 'gravel' && <span className="selected-badge">Selected</span>}
          </div>
          <div className="detail-stats">
            <div className="detail-stat">
              <span className="detail-label">Distance</span>
              <span className="detail-value">{formatDistance(gravelStats.distanceKm)}</span>
            </div>
            <div className="detail-stat">
              <span className="detail-label">Climbing</span>
              <span className="detail-value">+{formatElevation(gravelStats.elevationGain)}</span>
            </div>
          </div>
        </div>
        
        <div className="detail-column tarmac">
          <div 
            className={`detail-header ${currentChoice === 'tarmac' ? 'selected' : ''}`}
            style={{ borderColor: ROUTE_CONFIG.tarmac.color }}
          >
            <span 
              className="detail-dot" 
              style={{ backgroundColor: ROUTE_CONFIG.tarmac.color }}
            />
            Tarmac
            {currentChoice === 'tarmac' && <span className="selected-badge">Selected</span>}
          </div>
          <div className="detail-stats">
            <div className="detail-stat">
              <span className="detail-label">Distance</span>
              <span className="detail-value">{formatDistance(tarmacStats.distanceKm)}</span>
            </div>
            <div className="detail-stat">
              <span className="detail-label">Climbing</span>
              <span className="detail-value">+{formatElevation(tarmacStats.elevationGain)}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="segment-comparison-summary">
        {Math.abs(distanceDiff) > 0.01 && (
          <p>
            <span style={{ color: distanceDiff > 0 ? ROUTE_CONFIG.gravel.color : ROUTE_CONFIG.tarmac.color }}>
              {distanceDiff > 0 ? 'Gravel' : 'Tarmac'}
            </span>
            {' '}is {formatDistance(Math.abs(distanceDiff))} longer
          </p>
        )}
        {Math.abs(elevationDiff) > 1 && (
          <p>
            <span style={{ color: elevationDiff > 0 ? ROUTE_CONFIG.gravel.color : ROUTE_CONFIG.tarmac.color }}>
              {elevationDiff > 0 ? 'Gravel' : 'Tarmac'}
            </span>
            {' '}has {formatElevation(Math.abs(elevationDiff))} more climbing
          </p>
        )}
      </div>
    </div>
  );
}
