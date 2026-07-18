import { create } from "zustand";
import type { AircraftPosition, AircraftType, Classification, NearbyAircraft, TrackPoint } from "../types";

export type WsStatus = "connecting" | "connected" | "disconnected";

interface Filters {
  aircraftType: AircraftType | null;
  classification: Classification | null;
}

interface NearbySearch {
  active: boolean;
  center: { lat: number; lon: number } | null;
  radiusKm: number;
  results: NearbyAircraft[] | null;
  loading: boolean;
  error: string | null;
}

interface AircraftState {
  aircraft: Record<string, AircraftPosition>;
  wsStatus: WsStatus;
  setWsStatus: (status: WsStatus) => void;
  applyPositions: (positions: AircraftPosition[]) => void;

  filters: Filters;
  setFilters: (filters: Partial<Filters>) => void;

  selectedCallsign: string | null;
  setSelectedCallsign: (callsign: string | null) => void;

  trail: TrackPoint[];
  trailLoading: boolean;
  trailError: string | null;
  setTrail: (trail: TrackPoint[]) => void;
  setTrailLoading: (loading: boolean) => void;
  setTrailError: (error: string | null) => void;

  nearby: NearbySearch;
  setNearbyActive: (active: boolean) => void;
  setNearbyCenter: (center: { lat: number; lon: number } | null) => void;
  setNearbyRadius: (radiusKm: number) => void;
  setNearbyResults: (results: NearbyAircraft[] | null) => void;
  setNearbyLoading: (loading: boolean) => void;
  setNearbyError: (error: string | null) => void;
}

export const useAircraftStore = create<AircraftState>((set) => ({
  aircraft: {},
  wsStatus: "connecting",
  setWsStatus: (status) => set({ wsStatus: status }),
  applyPositions: (positions) =>
    set((state) => {
      const next = { ...state.aircraft };
      for (const position of positions) {
        next[position.callsign] = position;
      }
      return { aircraft: next };
    }),

  filters: { aircraftType: null, classification: null },
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),

  selectedCallsign: null,
  setSelectedCallsign: (callsign) => set({ selectedCallsign: callsign }),

  trail: [],
  trailLoading: false,
  trailError: null,
  setTrail: (trail) => set({ trail }),
  setTrailLoading: (loading) => set({ trailLoading: loading }),
  setTrailError: (error) => set({ trailError: error }),

  nearby: {
    active: false,
    center: null,
    radiusKm: 50,
    results: null,
    loading: false,
    error: null,
  },
  setNearbyActive: (active) =>
    set((state) => ({
      nearby: active
        ? { ...state.nearby, active }
        : { ...state.nearby, active, center: null, results: null, error: null },
    })),
  setNearbyCenter: (center) =>
    set((state) => ({ nearby: { ...state.nearby, center } })),
  setNearbyRadius: (radiusKm) =>
    set((state) => ({ nearby: { ...state.nearby, radiusKm } })),
  setNearbyResults: (results) =>
    set((state) => ({ nearby: { ...state.nearby, results } })),
  setNearbyLoading: (loading) =>
    set((state) => ({ nearby: { ...state.nearby, loading } })),
  setNearbyError: (error) =>
    set((state) => ({ nearby: { ...state.nearby, error } })),
}));
