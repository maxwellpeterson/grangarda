import { useCallback, useMemo, useRef } from 'react';
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
import { useUnits, kmToMiles, metersToFeet } from '../hooks/useUnits';
import { downsampleProfile } from '../utils/gpx';

interface ElevationChartProps {
  route: RouteData;
  isVisible: boolean;
}

interface ChartDataPoint {
  distance: number;
  elevation: number;
  distanceRaw: number; // km - for reference line matching
  lat: number;
  lng: number;
  grade: number;
}

export function ElevationChart({ route, isVisible }: ElevationChartProps) {
  const { hoverState, setHover, clearHover } = useHoverSync();
  const { units, formatDistance, formatElevationChange, distanceUnit, elevationUnit } = useUnits();
  const chartWrapperRef = useRef<HTMLDivElement>(null);

  // Downsample data for performance (max 500 points)
  // Convert units based on current setting
  const chartData = useMemo<ChartDataPoint[]>(() => {
    const downsampled = downsampleProfile(route.elevationProfile, 500);
    return downsampled.map((p) => {
      const distance = units === 'imperial' 
        ? Math.round(kmToMiles(p.distance) * 10) / 10
        : Math.round(p.distance * 10) / 10;
      const elevation = units === 'imperial'
        ? metersToFeet(p.elevation)
        : Math.round(p.elevation);
      return {
        distance,
        elevation,
        distanceRaw: p.distance,
        lat: p.lat,
        lng: p.lng,
        grade: Math.round((p.grade || 0) * 10) / 10,
      };
    });
  }, [route.elevationProfile, units]);

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
      // Recharts passes activeTooltipIndex which we use to look up the data point
      if (state?.activeTooltipIndex != null && chartData[state.activeTooltipIndex]) {
        const data = chartData[state.activeTooltipIndex];
        const point: ElevationPoint = {
          distance: data.distanceRaw,
          elevation: data.elevation,
          lat: data.lat,
          lng: data.lng,
          grade: data.grade,
        };
        setHover(route.id, point, 'chart');
      }
    },
    [route.id, setHover, chartData]
  );

  const handleMouseLeave = useCallback(() => {
    clearHover();
  }, [clearHover]);

  // Find the data point and reference line position when hovering from map
  const mapHoverData = useMemo(() => {
    if (
      hoverState.source === 'map' &&
      hoverState.routeId === route.id &&
      hoverState.point
    ) {
      // Find the closest chart data point by raw distance
      const targetDistanceKm = hoverState.point.distance;
      let closestIndex = 0;
      let closestDiff = Infinity;
      
      for (let i = 0; i < chartData.length; i++) {
        const diff = Math.abs(chartData[i].distanceRaw - targetDistanceKm);
        if (diff < closestDiff) {
          closestDiff = diff;
          closestIndex = i;
        }
      }
      
      const data = chartData[closestIndex];
      return {
        distance: data.distance,
        data,
        index: closestIndex,
      };
    }
    return null;
  }, [hoverState, route.id, chartData]);

  // Check if this chart should show hover state (from either source)
  const isHovering = hoverState.routeId === route.id && hoverState.point;
  const isHoveringFromMap = hoverState.source === 'map' && isHovering;

  if (!isVisible) {
    return null;
  }

  // Tooltip content renderer - used for both built-in tooltip and map hover overlay
  const renderTooltipContent = (data: ChartDataPoint) => {
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
          <span className="tooltip-value">{data.distance.toFixed(1)} {distanceUnit}</span>
        </div>
        <div className="tooltip-row">
          <span className="tooltip-label">Elevation:</span>
          <span className="tooltip-value">{data.elevation.toLocaleString()} {elevationUnit}</span>
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

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: ChartDataPoint }>;
  }) => {
    // Don't show built-in tooltip when hovering from map (we show our own overlay)
    if (isHoveringFromMap) return null;
    if (!active || !payload || !payload[0]) return null;
    return renderTooltipContent(payload[0].payload);
  };

  // Calculate tooltip position for map hover overlay
  const getTooltipPosition = () => {
    if (!mapHoverData || !chartWrapperRef.current) return null;
    
    const wrapper = chartWrapperRef.current;
    const wrapperWidth = wrapper.offsetWidth;
    
    // Chart margins from the AreaChart component
    const marginLeft = 55; // YAxis width
    const marginRight = 20;
    const chartWidth = wrapperWidth - marginLeft - marginRight;
    
    // Calculate X position based on data index
    const xPercent = mapHoverData.index / (chartData.length - 1);
    const xPos = marginLeft + (xPercent * chartWidth);
    
    // Position tooltip to the right of the line, or left if near the edge
    const tooltipWidth = 150;
    const positionLeft = xPos + tooltipWidth + 20 < wrapperWidth;
    
    return {
      left: positionLeft ? xPos + 10 : xPos - tooltipWidth - 10,
      xPos,
    };
  };

  const tooltipPosition = getTooltipPosition();

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
          <span>{formatDistance(route.stats.distance)}</span>
          <span className="stat-divider">|</span>
          <span>{formatElevationChange(route.stats.elevationGain, true)}</span>
        </div>
      </div>
      <div className="chart-wrapper" ref={chartWrapperRef}>
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
              tickFormatter={(value) => `${value.toLocaleString()}`}
              width={55}
            />
            <Tooltip 
              content={<CustomTooltip />}
              cursor={{ stroke: route.color, strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="elevation"
              stroke={route.color}
              strokeWidth={2}
              fill={`url(#gradient-${route.id})`}
              isAnimationActive={false}
            />
            {mapHoverData && (
              <ReferenceLine
                x={mapHoverData.distance}
                stroke={route.color}
                strokeWidth={2}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
        
        {/* Overlay tooltip when hovering from map */}
        {isHoveringFromMap && mapHoverData && tooltipPosition && (
          <div 
            className="chart-tooltip-overlay"
            style={{ left: tooltipPosition.left }}
          >
            {renderTooltipContent(mapHoverData.data)}
          </div>
        )}
      </div>
    </div>
  );
}
