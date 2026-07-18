import { beforeEach, describe, expect, it } from "vitest";
import { useAircraftStore } from "./aircraftStore";
import type { AircraftPosition } from "../types";

function makePosition(overrides: Partial<AircraftPosition> = {}): AircraftPosition {
  return {
    callsign: "TEST01",
    lat: 40.9,
    lon: 28.9,
    altitude: 5000,
    heading: 90,
    speed: 200,
    aircraft_type: "COMMERCIAL",
    classification: "NEUTRAL",
    ...overrides,
  };
}

describe("aircraftStore", () => {
  beforeEach(() => {
    useAircraftStore.setState({
      aircraft: {},
      wsStatus: "connecting",
    });
  });

  it("applies positions from a mocked WS 'positions' message", () => {
    const message = { type: "positions" as const, aircraft: [makePosition()] };

    useAircraftStore.getState().applyPositions(message.aircraft);

    expect(useAircraftStore.getState().aircraft["TEST01"]).toEqual(makePosition());
  });

  it("merges updated positions for the same callsign instead of duplicating", () => {
    useAircraftStore.getState().applyPositions([makePosition({ lat: 40.9 })]);
    useAircraftStore.getState().applyPositions([makePosition({ lat: 41.1 })]);

    const aircraft = useAircraftStore.getState().aircraft;
    expect(Object.keys(aircraft)).toHaveLength(1);
    expect(aircraft["TEST01"].lat).toBe(41.1);
  });

  it("updates wsStatus", () => {
    useAircraftStore.getState().setWsStatus("connected");
    expect(useAircraftStore.getState().wsStatus).toBe("connected");
  });
});
