import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { HoverState, ElevationPoint } from '../types/route';

interface HoverContextValue {
  hoverState: HoverState;
  setHover: (
    routeId: 'gravel' | 'tarmac' | null,
    point: ElevationPoint | null,
    source: 'map' | 'chart' | null
  ) => void;
  clearHover: () => void;
}

const HoverContext = createContext<HoverContextValue | null>(null);

const initialState: HoverState = {
  routeId: null,
  point: null,
  source: null,
};

export function HoverProvider({ children }: { children: ReactNode }) {
  const [hoverState, setHoverState] = useState<HoverState>(initialState);

  const setHover = useCallback(
    (
      routeId: 'gravel' | 'tarmac' | null,
      point: ElevationPoint | null,
      source: 'map' | 'chart' | null
    ) => {
      setHoverState({ routeId, point, source });
    },
    []
  );

  const clearHover = useCallback(() => {
    setHoverState(initialState);
  }, []);

  return (
    <HoverContext.Provider value={{ hoverState, setHover, clearHover }}>
      {children}
    </HoverContext.Provider>
  );
}

export function useHoverSync(): HoverContextValue {
  const context = useContext(HoverContext);
  if (!context) {
    throw new Error('useHoverSync must be used within a HoverProvider');
  }
  return context;
}
