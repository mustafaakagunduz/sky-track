import { useAircraftStore } from "../store/aircraftStore";

const STATUS_LABEL: Record<string, string> = {
  connecting: "Connecting...",
  connected: "Connected",
  disconnected: "Disconnected",
};

const STATUS_COLOR: Record<string, string> = {
  connecting: "bg-amber-400",
  connected: "bg-emerald-400",
  disconnected: "bg-red-500",
};

export default function StatusBar() {
  const wsStatus = useAircraftStore((state) => state.wsStatus);
  const aircraftCount = useAircraftStore((state) => Object.keys(state.aircraft).length);

  return (
    <div className="pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-3 rounded-md bg-slate-900/80 px-3 py-2 text-sm text-slate-100 shadow-lg backdrop-blur">
      <span className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${STATUS_COLOR[wsStatus]}`} />
        {STATUS_LABEL[wsStatus]}
      </span>
      <span className="text-slate-400">|</span>
      <span>{aircraftCount} aircraft</span>
    </div>
  );
}
