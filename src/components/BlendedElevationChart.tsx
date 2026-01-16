import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { BlendedRoute } from '../types/segments';
import { useUnits, kmToMiles, metersToFeet } from '../hooks/useUnits';
import { ROUTE_CONFIG } from '../hooks/useRouteData';

interface BlendedElevationChartProps {
  blendedRoute: BlendedRoute;
}

interface ChartDataPoint {
  distance: number;
  elevation: number;
  distanceRaw: number;
}

export function BlendedElevationChart({ blendedRoute }: BlendedElevationChartProps) {
  const { units, formatDistance, formatElevationChange, distanceUnit, elevationUnit } = useUnits();
  const color = ROUTE_CONFIG.blended.color;

  // Convert coordinates to chart data
  const chartData = useMemo<ChartDataPoint[]>(() => {
    const points: ChartDataPoint[] = [];
    let cumulativeDistance = 0;

    for (let i = 0; i < blendedRoute.coordinates.length; i++) {
      const [lng, lat, elevation] = blendedRoute.coordinates[i];
      
      // Calculate distance from previous point
      if (i > 0) {
        const [prevLng, prevLat] = blendedRoute.coordinates[i - 1];
        const R = 6371; // Earth's radius in km
        const dLat = ((lat - prevLat) * Math.PI) / 180;
        const dLng = ((lng - prevLng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((prevLat * Math.PI) / 180) *
            Math.cos((lat * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        cumulativeDistance += R * c;
      }

      const displayDistance =
        units === 'imperial'
          ? Math.round(kmToMiles(cumulativeDistance) * 10) / 10
          : Math.round(cumulativeDistance * 10) / 10;
      const displayElevation =
        units === 'imperial' ? metersToFeet(elevation) : Math.round(elevation);

      points.push({
        distance: displayDistance,
        elevation: displayElevation,
        distanceRaw: cumulativeDistance,
      });
    }

    // Downsample if too many points
    if (points.length > 500) {
      const step = Math.ceil(points.length / 500);
      return points.filter((_, i) => i % step === 0 || i === points.length - 1);
    }

    return points;
  }, [blendedRoute.coordinates, units]);

  // Calculate Y-axis domain with some padding
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 1000];
    const elevations = chartData.map((d) => d.elevation);
    const min = Math.min(...elevations);
    const max = Math.max(...elevations);
    const padding = (max - min) * 0.1;
    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [chartData]);

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: ChartDataPoint }>;
  }) => {
    if (!active || !payload || !payload[0]) return null;
    const data = payload[0].payload;

    return (
      <div className="chart-tooltip">
        <div className="tooltip-row">
          <span className="tooltip-label">Distance:</span>
          <span className="tooltip-value">
            {data.distance.toFixed(1)} {distanceUnit}
          </span>
        </div>
        <div className="tooltip-row">
          <span className="tooltip-label">Elevation:</span>
          <span className="tooltip-value">
            {data.elevation.toLocaleString()} {elevationUnit}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="elevation-chart blended-elevation-chart">
      <div className="chart-header">
        <div className="chart-title">
          <span className="route-indicator" style={{ backgroundColor: color }} />
          {ROUTE_CONFIG.blended.name}
          <span className="blended-badge">Custom</span>
        </div>
        <div className="chart-stats">
          <span>{formatDistance(blendedRoute.distanceKm)}</span>
          <span className="stat-divider">|</span>
          <span>{formatElevationChange(blendedRoute.elevationGain)}</span>
        </div>
      </div>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <defs>
              <linearGradient id="gradient-blended" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={color} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="distance"
              tick={{ fill: '#8892a0', fontSize: 11 }}
              tickLine={{ stroke: '#8892a0' }}
              axisLine={{ stroke: '#3d4555' }}
            />
            <YAxis
              domain={yDomain}
              tick={{ fill: '#8892a0', fontSize: 11 }}
              tickLine={{ stroke: '#8892a0' }}
              axisLine={{ stroke: '#3d4555' }}
              tickFormatter={(value) => `${value.toLocaleString()}`}
              width={55}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: color, strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="elevation"
              stroke={color}
              strokeWidth={2}
              fill="url(#gradient-blended)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
