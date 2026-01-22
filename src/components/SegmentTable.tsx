import { useState } from "react";
import { useBlendedRoute } from "../hooks/useBlendedRoute";
import { useUnits } from "../hooks/useUnits";
import { ROUTE_CONFIG } from "../hooks/useRouteData";
import type { Segment, RouteChoice } from "../types/segments";

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
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  const handleRowClick = (segment: Segment) => {
    setSelectedSegment(segment.id);
    onSegmentFocus(segment);
  };

  const handleChoiceClick = (
    e: React.MouseEvent,
    segmentId: string,
    choice: RouteChoice,
  ) => {
    e.stopPropagation();
    selectSegment(segmentId, choice);
  };

  const handleFeelingLucky = () => {
    divergingSegments.forEach((segment) => {
      if (!selections.has(segment.id)) {
        const choice: RouteChoice = Math.random() < 0.5 ? "gravel" : "tarmac";
        selectSegment(segment.id, choice);
      }
    });
  };

  const remainingCount = divergingSegments.length - selections.size;

  return (
    <div className="segment-table-container">
      <div className="segment-table-header">
        <h3>Route Segments</h3>
        <div className="segment-table-subheader">
          <span className="segment-table-subtitle">
            {selections.size} of {divergingSegments.length} selected
          </span>
          {remainingCount > 0 && (
            <button
              className="feeling-lucky-button"
              onClick={handleFeelingLucky}
            >
              I'm Feeling Lucky
            </button>
          )}
        </div>
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
                  className={`segment-row ${isActive ? "active" : ""} ${currentChoice ? "has-selection" : ""}`}
                  onClick={() => handleRowClick(segment)}
                  onMouseEnter={() => setHoveredRowId(segment.id)}
                  onMouseLeave={() => setHoveredRowId(null)}
                >
                  <td className="col-segment">
                    <span className="segment-number">
                      {hoveredRowId === segment.id ? "🔍" : index + 1}
                    </span>
                  </td>

                  <td className="col-gravel">
                    <button
                      className={`choice-button ${currentChoice === "gravel" ? "selected" : ""}`}
                      onClick={(e) =>
                        handleChoiceClick(e, segment.id, "gravel")
                      }
                      style={
                        {
                          "--choice-color": ROUTE_CONFIG.gravel.color,
                        } as React.CSSProperties
                      }
                    >
                      <span className="choice-distance">
                        {formatDistance(segment.gravel.distanceKm)}
                      </span>
                      <span className="choice-elevation">
                        {formatElevation(segment.gravel.elevationGain)}
                      </span>
                    </button>
                  </td>

                  <td className="col-tarmac">
                    <button
                      className={`choice-button ${currentChoice === "tarmac" ? "selected" : ""}`}
                      onClick={(e) =>
                        handleChoiceClick(e, segment.id, "tarmac")
                      }
                      style={
                        {
                          "--choice-color": ROUTE_CONFIG.tarmac.color,
                        } as React.CSSProperties
                      }
                    >
                      <span className="choice-distance">
                        {formatDistance(segment.tarmac.distanceKm)}
                      </span>
                      <span className="choice-elevation">
                        {formatElevation(segment.tarmac.elevationGain)}
                      </span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
