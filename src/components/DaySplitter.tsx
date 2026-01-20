import { useCallback } from 'react';
import { useBlendedRoute } from '../hooks/useBlendedRoute';
import { MultiRangeSlider } from './MultiRangeSlider';
import { DayStatsTable } from './DayStatsTable';

export function DaySplitter() {
  const {
    blendedRoute,
    numberOfDays,
    setNumberOfDays,
    breakpoints,
    setBreakpoints,
    daySplits,
  } = useBlendedRoute();

  const handleDayCountChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const days = parseInt(e.target.value, 10);
      setNumberOfDays(days);

      // Auto-generate evenly distributed breakpoints
      if (days > 1) {
        const newBreakpoints = Array.from(
          { length: days - 1 },
          (_, i) => ((i + 1) / days) * 100
        );
        setBreakpoints(newBreakpoints);
      } else {
        setBreakpoints([]);
      }
    },
    [setNumberOfDays, setBreakpoints]
  );

  if (!blendedRoute) return null;

  return (
    <div className="day-splitter">
      <div className="day-splitter-header">
        <label htmlFor="day-count">Split into</label>
        <select
          id="day-count"
          value={numberOfDays}
          onChange={handleDayCountChange}
          className="day-selector"
        >
          <option value={1}>Single day</option>
          {[2, 3, 4, 5, 6, 7].map((n) => (
            <option key={n} value={n}>
              {n} days
            </option>
          ))}
        </select>
      </div>

      {numberOfDays > 1 && (
        <>
          <MultiRangeSlider
            values={breakpoints}
            onChange={setBreakpoints}
            minGap={5}
          />
          <DayStatsTable daySplits={daySplits} />
        </>
      )}
    </div>
  );
}
