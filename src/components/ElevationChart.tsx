import { useCallback, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { RouteData, ElevationPoint } from '../types/route';
import { useHoverSync } from '../hooks/useHoverSync';
import { downsampleProfile } from '../utils/gpx';

interface ElevationChartProps {
  route: RouteData;
  isVisible: boolean;
}

interface ChartDataPoint {
  distance: number;
  elevation: number;
  lat: number;
  lng: number;
  grade: number;
}

export function ElevationChart({ route, isVisible }: ElevationChartProps) {
  const { hoverState, setHover, clearHover } = useHoverSync();

  // Downsample data for performance (max 500 points)
  const chartData = useMemo<ChartDataPoint[]>(() => {
    const downsampled = downsampleProfile(route.elevationProfile, 500);
    return downsampled.map((p) => ({
      distance: Math.round(p.distance * 10) / 10,
      elevation: Math.round(p.elevation),
      lat: p.lat,
      lng: p.lng,
      grade: Math.round((p.grade || 0) * 10) / 10,
    }));
  }, [route.elevationProfile]);

  // Calculate Y-axis domain with some padding
  const yDomain = useMemo(() => {
    const elevations = chartData.map((d) => d.elevation);
    const min = Math.min(...elevations);
    const max = Math.max(...elevations);
    const padding = (max - min) * 0.1;
    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [chartData]);

  const handleMouseMove = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state: any) => {
      if (state?.activePayload?.[0]) {
        const data = state.activePayload[0].payload as ChartDataPoint;
        const point: ElevationPoint = {
          distance: data.distance,
          elevation: data.elevation,
          lat: data.lat,
          lng: data.lng,
          grade: data.grade,
        };
        setHover(route.id, point, 'chart');
      }
    },
    [route.id, setHover]
  );

  const handleMouseLeave = useCallback(() => {
    clearHover();
  }, [clearHover]);

  // Find reference line position when hovering from map
  const referenceDistance = useMemo(() => {
    if (
      hoverState.source === 'map' &&
      hoverState.routeId === route.id &&
      hoverState.point
    ) {
      return hoverState.point.distance;
    }
    return null;
  }, [hoverState, route.id]);

  if (!isVisible) {
    return null;
  }

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: ChartDataPoint }>;
  }) => {
    if (!active || !payload || !payload[0]) return null;

    const data = payload[0].payload;
    const gradeColor =
      data.grade > 8
        ? '#e74c3c'
        : data.grade > 4
        ? '#f39c12'
        : data.grade < -4
        ? '#27ae60'
        : '#95a5a6';

    return (
      <div className="chart-tooltip">
        <div className="tooltip-row">
          <span className="tooltip-label">Distance:</span>
          <span className="tooltip-value">{data.distance.toFixed(1)} km</span>
        </div>
        <div className="tooltip-row">
          <span className="tooltip-label">Elevation:</span>
          <span className="tooltip-value">{data.elevation} m</span>
        </div>
        <div className="tooltip-row">
          <span className="tooltip-label">Grade:</span>
          <span className="tooltip-value" style={{ color: gradeColor }}>
            {data.grade > 0 ? '+' : ''}
            {data.grade.toFixed(1)}%
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="elevation-chart">
      <div className="chart-header">
        <div className="chart-title">
          <span
            className="route-indicator"
            style={{ backgroundColor: route.color }}
          />
          {route.name}
        </div>
        <div className="chart-stats">
          <span>{route.stats.distance.toFixed(0)} km</span>
          <span className="stat-divider">|</span>
          <span>+{route.stats.elevationGain.toFixed(0)} m</span>
        </div>
      </div>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              <linearGradient
                id={`gradient-${route.id}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={route.color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={route.color} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="distance"
              tick={{ fill: '#8892a0', fontSize: 11 }}
              tickLine={{ stroke: '#8892a0' }}
              axisLine={{ stroke: '#3d4555' }}
              tickFormatter={(value) => `${value}`}
            />
            <YAxis
              domain={yDomain}
              tick={{ fill: '#8892a0', fontSize: 11 }}
              tickLine={{ stroke: '#8892a0' }}
              axisLine={{ stroke: '#3d4555' }}
              tickFormatter={(value) => `${value}m`}
              width={55}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="elevation"
              stroke={route.color}
              strokeWidth={2}
              fill={`url(#gradient-${route.id})`}
              isAnimationActive={false}
            />
            {referenceDistance !== null && (
              <ReferenceLine
                x={Math.round(referenceDistance * 10) / 10}
                stroke={route.color}
                strokeWidth={2}
                strokeDasharray="4 4"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
