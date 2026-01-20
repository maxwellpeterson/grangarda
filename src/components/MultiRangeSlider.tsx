import { useRef, useState, useCallback, useEffect } from 'react';

interface MultiRangeSliderProps {
  values: number[];
  onChange: (values: number[]) => void;
  min?: number;
  max?: number;
  minGap?: number;
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

export function MultiRangeSlider({
  values,
  onChange,
  min = 0,
  max = 100,
  minGap = 5,
}: MultiRangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const getPercentage = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const percentage = ((clientX - rect.left) / rect.width) * (max - min) + min;
      return Math.max(min, Math.min(max, percentage));
    },
    [min, max]
  );

  const handleMouseDown = (index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingIndex(index);
  };

  const handleTouchStart = (index: number) => (e: React.TouchEvent) => {
    e.preventDefault();
    setDraggingIndex(index);
  };

  useEffect(() => {
    if (draggingIndex === null) return;

    const handleMove = (clientX: number) => {
      const newValue = getPercentage(clientX);
      const newValues = [...values];

      // Enforce min gap constraints
      const minValue =
        draggingIndex === 0 ? min + minGap : values[draggingIndex - 1] + minGap;
      const maxValue =
        draggingIndex === values.length - 1
          ? max - minGap
          : values[draggingIndex + 1] - minGap;

      newValues[draggingIndex] = Math.max(minValue, Math.min(maxValue, newValue));
      onChange(newValues);
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX);
      }
    };

    const handleEnd = () => {
      setDraggingIndex(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [draggingIndex, values, onChange, getPercentage, min, max, minGap]);

  // Generate segment boundaries: [0, ...values, 100]
  const segments = [min, ...values, max];

  return (
    <div className="multi-range-slider">
      <div className="slider-track" ref={trackRef}>
        {/* Colored segments */}
        {segments.slice(0, -1).map((start, i) => (
          <div
            key={i}
            className="slider-segment"
            style={{
              left: `${start}%`,
              width: `${segments[i + 1] - start}%`,
              backgroundColor: DAY_COLORS[i % DAY_COLORS.length],
            }}
          />
        ))}

        {/* Draggable handles */}
        {values.map((value, index) => (
          <div
            key={index}
            className={`slider-handle ${draggingIndex === index ? 'dragging' : ''}`}
            style={{ left: `${value}%` }}
            onMouseDown={handleMouseDown(index)}
            onTouchStart={handleTouchStart(index)}
          >
            <span className="handle-icon">🌙</span>
          </div>
        ))}
      </div>
    </div>
  );
}
