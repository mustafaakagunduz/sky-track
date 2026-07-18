import { useEffect } from "react";
import { fetchTrack } from "../api";
import { useAircraftStore } from "../store/aircraftStore";

export default function DetailCard() {
  const selectedCallsign = useAircraftStore((state) => state.selectedCallsign);
  const setSelectedCallsign = useAircraftStore((state) => state.setSelectedCallsign);
  const aircraft = useAircraftStore((state) =>
    selectedCallsign ? state.aircraft[selectedCallsign] : undefined,
  );
  const trailLoading = useAircraftStore((state) => state.trailLoading);
  const trailError = useAircraftStore((state) => state.trailError);
  const setTrail = useAircraftStore((state) => state.setTrail);
  const setTrailLoading = useAircraftStore((state) => state.setTrailLoading);
  const setTrailError = useAircraftStore((state) => state.setTrailError);

  useEffect(() => {
    if (!selectedCallsign) {
      setTrail([]);
      setTrailError(null);
      return;
    }

    let cancelled = false;
    setTrailLoading(true);
    setTrailError(null);

    fetchTrack(selectedCallsign)
      .then((points) => {
        if (!cancelled) setTrail(points);
      })
      .catch(() => {
        if (!cancelled) setTrailError("Failed to load trail.");
      })
      .finally(() => {
        if (!cancelled) setTrailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCallsign, setTrail, setTrailLoading, setTrailError]);

  if (!selectedCallsign) return null;

  return (
    <div className="pointer-events-auto absolute right-4 top-4 z-10 w-72 rounded-md bg-slate-900/90 text-sm text-slate-100 shadow-lg backdrop-blur">
      <div className="flex items-center justify-between border-b border-slate-700 px-3 py-2">
        <span className="font-semibold">{selectedCallsign}</span>
        <button
          onClick={() => setSelectedCallsign(null)}
          className="text-slate-400 hover:text-slate-100"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {!aircraft ? (
        <div className="px-3 py-4 text-center text-slate-400">
          This aircraft is no longer reporting.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1 px-3 py-2 text-xs">
          <span className="text-slate-400">Type</span>
          <span>{aircraft.aircraft_type}</span>
          <span className="text-slate-400">Classification</span>
          <span>{aircraft.classification}</span>
          <span className="text-slate-400">Position</span>
          <span>
            {aircraft.lat.toFixed(3)}, {aircraft.lon.toFixed(3)}
          </span>
          <span className="text-slate-400">Altitude</span>
          <span>{Math.round(aircraft.altitude)} m</span>
          <span className="text-slate-400">Heading</span>
          <span>{Math.round(aircraft.heading)}°</span>
          <span className="text-slate-400">Speed</span>
          <span>{Math.round(aircraft.speed)} m/s</span>
        </div>
      )}

      <div className="border-t border-slate-700 px-3 py-2 text-xs">
        {trailLoading && <span className="text-slate-400">Loading trail…</span>}
        {trailError && <span className="text-red-400">{trailError}</span>}
      </div>
    </div>
  );
}
