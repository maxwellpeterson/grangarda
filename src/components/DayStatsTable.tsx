import type { DaySplit } from '../types/segments';
import { useUnits } from '../hooks/useUnits';

interface DayStatsTableProps {
  daySplits: DaySplit[];
}

const DAY_COLORS = [
  '#E67E22', // Orange
  '#3498DB', // Blue
  '#2ECC71', // Green
  '#9B59B6', // Purple
  '#E74C3C', // Red
  '#1ABC9C', // Teal
  '#F39C12', // Yellow-orange
];

export function DayStatsTable({ daySplits }: DayStatsTableProps) {
  const { formatDistance, formatElevationChange } = useUnits();

  if (daySplits.length === 0) return null;

  return (
    <div className="day-stats-table">
      <table>
        <thead>
          <tr>
            <th>Day</th>
            <th>Distance</th>
            <th>Elevation</th>
          </tr>
        </thead>
        <tbody>
          {daySplits.map((day) => (
            <tr key={day.dayNumber} className="day-stats-row">
              <td>
                <span
                  className="day-color-indicator"
                  style={{ backgroundColor: DAY_COLORS[(day.dayNumber - 1) % DAY_COLORS.length] }}
                />
                Day {day.dayNumber}
              </td>
              <td>{formatDistance(day.distanceKm, 1)}</td>
              <td>{formatElevationChange(day.elevationGain)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
