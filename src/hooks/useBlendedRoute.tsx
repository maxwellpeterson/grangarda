import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from "react";
import type {
  Segment,
  RouteChoice,
  BlendedRoute,
  DaySplit,
  Breakpoint,
} from "../types/segments";
import {
  generateDaySplits,
  getBreakpointCoordinates,
} from "../utils/daySplitCalculations";

interface BlendedRouteContextValue {
  // State
  isBuilding: boolean;
  selections: Map<string, RouteChoice>;
  hoveredSegmentId: string | null;
  selectedSegmentId: string | null;
  blendedRoute: BlendedRoute | null;

  // Segments data
  segments: Segment[];
  divergingSegments: Segment[];
  isComplete: boolean; // All diverging segments have selections

  // Day splitting
  numberOfDays: number;
  breakpoints: number[]; // percentages (0-100)
  daySplits: DaySplit[];
  breakpointCoordinates: Breakpoint[];
  setNumberOfDays: (days: number) => void;
  setBreakpoints: (breakpoints: number[]) => void;

  // Actions
  enterBuildMode: () => void;
  exitBuildMode: (save: boolean) => void;
  selectSegment: (segmentId: string, choice: RouteChoice) => void;
  setHoveredSegment: (segmentId: string | null) => void;
  setSelectedSegment: (segmentId: string | null) => void;
  resetSelections: () => void;
}

const BlendedRouteContext = createContext<BlendedRouteContextValue | null>(
  null,
);

interface BlendedRouteProviderProps {
  children: ReactNode;
  segments: Segment[];
}

/**
 * Encode selections to URL parameter format: g1-t2-g3 etc.
 */
function encodeSelectionsToUrl(
  selections: Map<string, RouteChoice>,
  segments: Segment[],
): string {
  const diverging = segments.filter((s) => s.type === "diverging");
  const parts: string[] = [];

  for (const seg of diverging) {
    const choice = selections.get(seg.id);
    if (choice) {
      const prefix = choice === "gravel" ? "g" : "t";
      parts.push(`${prefix}${seg.order}`);
    }
  }

  return parts.join("-");
}

/**
 * Decode URL parameter to selections map
 */
function decodeSelectionsFromUrl(
  param: string,
  segments: Segment[],
): Map<string, RouteChoice> {
  const selections = new Map<string, RouteChoice>();
  if (!param) return selections;

  const parts = param.split("-");
  const segmentsByOrder = new Map(segments.map((s) => [s.order, s]));

  for (const part of parts) {
    const match = part.match(/^([gt])(\d+)$/);
    if (match) {
      const choice: RouteChoice = match[1] === "g" ? "gravel" : "tarmac";
      const order = parseInt(match[2], 10);
      const segment = segmentsByOrder.get(order);
      if (segment && segment.type === "diverging") {
        selections.set(segment.id, choice);
      }
    }
  }

  return selections;
}

/**
 * Build the blended route from segments and selections
 */
function buildBlendedRoute(
  segments: Segment[],
  selections: Map<string, RouteChoice>,
): BlendedRoute | null {
  // Check if all diverging segments have selections
  const diverging = segments.filter((s) => s.type === "diverging");
  const allSelected = diverging.every((s) => selections.has(s.id));

  if (!allSelected) return null;

  const coordinates: [number, number, number][] = [];
  let totalDistance = 0;
  let totalElevationGain = 0;
  let totalElevationLoss = 0;

  for (const segment of segments) {
    let segmentData;

    if (segment.type === "shared") {
      // For shared segments, use gravel data (they're essentially the same)
      segmentData = segment.gravel;
    } else {
      // For diverging segments, use the selected route
      const choice = selections.get(segment.id);
      segmentData = choice === "tarmac" ? segment.tarmac : segment.gravel;
    }

    // Add coordinates (skip first point if we already have coordinates to avoid duplicates)
    if (coordinates.length > 0 && segmentData.coordinates.length > 0) {
      coordinates.push(...segmentData.coordinates.slice(1));
    } else {
      coordinates.push(...segmentData.coordinates);
    }

    totalDistance += segmentData.distanceKm;
    totalElevationGain += segmentData.elevationGain;
    totalElevationLoss += segmentData.elevationLoss;
  }

  return {
    coordinates,
    distanceKm: totalDistance,
    elevationGain: totalElevationGain,
    elevationLoss: totalElevationLoss,
    selections: new Map(selections),
  };
}

export function BlendedRouteProvider({
  children,
  segments,
}: BlendedRouteProviderProps) {
  const [isBuilding, setIsBuilding] = useState(false);
  const [selections, setSelections] = useState<Map<string, RouteChoice>>(
    new Map(),
  );
  const [savedSelections, setSavedSelections] = useState<
    Map<string, RouteChoice>
  >(new Map());
  const [hoveredSegmentId, setHoveredSegmentId] = useState<string | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(
    null,
  );

  // Day splitting state
  const [numberOfDays, setNumberOfDaysState] = useState(1);
  const [breakpoints, setBreakpointsState] = useState<number[]>([]);

  const divergingSegments = useMemo(
    () => segments.filter((s) => s.type === "diverging"),
    [segments],
  );

  const isComplete = useMemo(
    () => divergingSegments.every((s) => selections.has(s.id)),
    [divergingSegments, selections],
  );

  // Build blended route from saved selections (not in-progress ones)
  const blendedRoute = useMemo(
    () => buildBlendedRoute(segments, savedSelections),
    [segments, savedSelections],
  );

  // Compute day splits from breakpoints
  const daySplits = useMemo<DaySplit[]>(() => {
    if (!blendedRoute || breakpoints.length === 0) return [];
    return generateDaySplits(blendedRoute, breakpoints);
  }, [blendedRoute, breakpoints]);

  // Compute breakpoint coordinates for map markers
  const breakpointCoordinates = useMemo<Breakpoint[]>(() => {
    if (!blendedRoute || breakpoints.length === 0) return [];
    return getBreakpointCoordinates(blendedRoute, breakpoints);
  }, [blendedRoute, breakpoints]);

  // Reset day splits when blended route changes
  useEffect(() => {
    setNumberOfDaysState(1);
    setBreakpointsState([]);
  }, [savedSelections]);

  // Load from URL on mount
  useEffect(() => {
    if (segments.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const routeParam = params.get("route");
    const daysParam = params.get("days");

    if (routeParam) {
      const decoded = decodeSelectionsFromUrl(routeParam, segments);
      if (decoded.size > 0) {
        setSelections(decoded);
        setSavedSelections(decoded);

        // Load day splits if present
        if (daysParam) {
          const loadedBreakpoints = daysParam
            .split(",")
            .map((s) => parseFloat(s))
            .filter((n) => !isNaN(n) && n > 0 && n < 100);
          if (loadedBreakpoints.length > 0) {
            setBreakpointsState(loadedBreakpoints);
            setNumberOfDaysState(loadedBreakpoints.length + 1);
          }
        }
      }
    }
  }, [segments]);

  // Update URL when saved selections or breakpoints change
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (savedSelections.size === 0) {
      // Remove route and days params if no selections
      params.delete("route");
      params.delete("days");
    } else {
      const encoded = encodeSelectionsToUrl(savedSelections, segments);
      if (encoded) {
        params.set("route", encoded);
      }

      // Handle days parameter
      if (breakpoints.length > 0) {
        const daysEncoded = breakpoints.map((b) => Math.round(b)).join(",");
        params.set("days", daysEncoded);
      } else {
        params.delete("days");
      }
    }

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    window.history.replaceState({}, "", newUrl);
  }, [savedSelections, breakpoints, segments]);

  const enterBuildMode = useCallback(() => {
    // Start with current saved selections (or empty if none)
    setSelections(new Map(savedSelections));
    setIsBuilding(true);
  }, [savedSelections]);

  const exitBuildMode = useCallback(
    (save: boolean) => {
      if (save && isComplete) {
        setSavedSelections(new Map(selections));
      }
      setIsBuilding(false);
      setSelectedSegmentId(null);
      setHoveredSegmentId(null);

      // If not saving, reset selections to saved state
      if (!save) {
        setSelections(new Map(savedSelections));
      }
    },
    [selections, savedSelections, isComplete],
  );

  const selectSegment = useCallback(
    (segmentId: string, choice: RouteChoice) => {
      setSelections((prev) => {
        const next = new Map(prev);
        next.set(segmentId, choice);
        return next;
      });
    },
    [],
  );

  const resetSelections = useCallback(() => {
    setSelections(new Map());
    setSavedSelections(new Map());
  }, []);

  const setHoveredSegment = useCallback((segmentId: string | null) => {
    setHoveredSegmentId(segmentId);
  }, []);

  const setSelectedSegment = useCallback((segmentId: string | null) => {
    setSelectedSegmentId(segmentId);
  }, []);

  const setNumberOfDays = useCallback((days: number) => {
    setNumberOfDaysState(days);
  }, []);

  const setBreakpoints = useCallback((newBreakpoints: number[]) => {
    setBreakpointsState(newBreakpoints);
  }, []);

  const value: BlendedRouteContextValue = {
    isBuilding,
    selections,
    hoveredSegmentId,
    selectedSegmentId,
    blendedRoute,
    segments,
    divergingSegments,
    isComplete,
    numberOfDays,
    breakpoints,
    daySplits,
    breakpointCoordinates,
    setNumberOfDays,
    setBreakpoints,
    enterBuildMode,
    exitBuildMode,
    selectSegment,
    setHoveredSegment,
    setSelectedSegment,
    resetSelections,
  };

  return (
    <BlendedRouteContext.Provider value={value}>
      {children}
    </BlendedRouteContext.Provider>
  );
}

export function useBlendedRoute(): BlendedRouteContextValue {
  const context = useContext(BlendedRouteContext);
  if (!context) {
    throw new Error(
      "useBlendedRoute must be used within a BlendedRouteProvider",
    );
  }
  return context;
}
