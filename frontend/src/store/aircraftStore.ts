import { create } from "zustand";
import type { AircraftPosition } from "../types";

export type WsStatus = "connecting" | "connected" | "disconnected";

interface AircraftState {
  aircraft: Record<string, AircraftPosition>;
  wsStatus: WsStatus;
  setWsStatus: (status: WsStatus) => void;
  applyPositions: (positions: AircraftPosition[]) => void;
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
}));
