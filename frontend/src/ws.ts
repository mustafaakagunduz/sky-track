import { useAircraftStore } from "./store/aircraftStore";
import type { PositionsMessage } from "./types";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:8000/ws/aircraft/";
const RECONNECT_DELAY_MS = 2000;

export function connectAircraftSocket() {
  const { setWsStatus, applyPositions } = useAircraftStore.getState();

  function connect() {
    setWsStatus("connecting");
    const socket = new WebSocket(WS_URL);

    socket.onopen = () => setWsStatus("connected");

    socket.onmessage = (event) => {
      const message: PositionsMessage = JSON.parse(event.data);
      if (message.type === "positions") {
        applyPositions(message.aircraft);
      }
    };

    socket.onclose = () => {
      setWsStatus("disconnected");
      setTimeout(connect, RECONNECT_DELAY_MS);
    };

    socket.onerror = () => socket.close();
  }

  connect();
}
