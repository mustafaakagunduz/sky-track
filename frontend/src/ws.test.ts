import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAircraftStore } from "./store/aircraftStore";
import { connectAircraftSocket } from "./ws";

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }

  close() {
    this.onclose?.();
  }
}

describe("connectAircraftSocket", () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    useAircraftStore.setState({ aircraft: {}, wsStatus: "connecting" });
    vi.stubGlobal("WebSocket", MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("updates the store when a 'positions' message arrives over the socket", () => {
    connectAircraftSocket();
    const socket = MockWebSocket.instances[0];

    socket.onopen?.();
    expect(useAircraftStore.getState().wsStatus).toBe("connected");

    socket.onmessage?.({
      data: JSON.stringify({
        type: "positions",
        aircraft: [
          {
            callsign: "WS01",
            lat: 40.9,
            lon: 28.9,
            altitude: 3000,
            heading: 180,
            speed: 150,
            aircraft_type: "MILITARY",
            classification: "HOSTILE",
          },
        ],
      }),
    });

    expect(useAircraftStore.getState().aircraft["WS01"]).toMatchObject({
      callsign: "WS01",
      classification: "HOSTILE",
    });
  });

  it("marks the socket disconnected on close", () => {
    vi.useFakeTimers();
    connectAircraftSocket();
    const socket = MockWebSocket.instances[0];
    socket.onopen?.();

    socket.close();

    expect(useAircraftStore.getState().wsStatus).toBe("disconnected");
    vi.useRealTimers();
  });
});
