import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

export type UnitSystem = 'metric' | 'imperial';

interface UnitsContextValue {
  units: UnitSystem;
  toggleUnits: () => void;
  setUnits: (units: UnitSystem) => void;
  formatDistance: (km: number, decimals?: number) => string;
  formatElevation: (meters: number) => string;
  formatElevationChange: (meters: number, positive?: boolean) => string;
  distanceUnit: string;
  elevationUnit: string;
}

const UnitsContext = createContext<UnitsContextValue | null>(null);

// Conversion constants
const KM_TO_MILES = 0.621371;
const METERS_TO_FEET = 3.28084;

export function UnitsProvider({ children }: { children: ReactNode }) {
  const [units, setUnits] = useState<UnitSystem>('imperial');

  const toggleUnits = useCallback(() => {
    setUnits((prev) => (prev === 'metric' ? 'imperial' : 'metric'));
  }, []);

  const formatDistance = useCallback(
    (km: number, decimals = 0): string => {
      if (units === 'metric') {
        return `${km.toFixed(decimals)} km`;
      }
      const miles = km * KM_TO_MILES;
      return `${miles.toFixed(decimals)} mi`;
    },
    [units]
  );

  const formatElevation = useCallback(
    (meters: number): string => {
      if (units === 'metric') {
        return `${Math.round(meters).toLocaleString()} m`;
      }
      const feet = Math.round(meters * METERS_TO_FEET);
      return `${feet.toLocaleString()} ft`;
    },
    [units]
  );

  const formatElevationChange = useCallback(
    (meters: number, positive = true): string => {
      const sign = positive ? '+' : '-';
      if (units === 'metric') {
        return `${sign}${Math.round(Math.abs(meters)).toLocaleString()} m`;
      }
      const feet = Math.round(Math.abs(meters) * METERS_TO_FEET);
      return `${sign}${feet.toLocaleString()} ft`;
    },
    [units]
  );

  const distanceUnit = units === 'metric' ? 'km' : 'mi';
  const elevationUnit = units === 'metric' ? 'm' : 'ft';

  return (
    <UnitsContext.Provider
      value={{
        units,
        toggleUnits,
        setUnits,
        formatDistance,
        formatElevation,
        formatElevationChange,
        distanceUnit,
        elevationUnit,
      }}
    >
      {children}
    </UnitsContext.Provider>
  );
}

export function useUnits(): UnitsContextValue {
  const context = useContext(UnitsContext);
  if (!context) {
    throw new Error('useUnits must be used within a UnitsProvider');
  }
  return context;
}

/**
 * Raw conversion functions for use in charts where we need numeric values
 */
export function kmToMiles(km: number): number {
  return km * KM_TO_MILES;
}

export function metersToFeet(meters: number): number {
  return Math.round(meters * METERS_TO_FEET);
}
