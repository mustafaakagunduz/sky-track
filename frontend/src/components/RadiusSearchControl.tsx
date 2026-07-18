import { useEffect, useRef } from "react";
import { fetchNearby } from "../api";
import { useAircraftStore } from "../store/aircraftStore";

const MIN_RADIUS_KM = 10;
const MAX_RADIUS_KM = 200;

export default function RadiusSearchControl() {
  const nearby = useAircraftStore((state) => state.nearby);
  const setNearbyActive = useAircraftStore((state) => state.setNearbyActive);
  const setNearbyRadius = useAircraftStore((state) => state.setNearbyRadius);
  const setNearbyResults = useAircraftStore((state) => state.setNearbyResults);
  const setNearbyLoading = useAircraftStore((state) => state.setNearbyLoading);
  const setNearbyError = useAircraftStore((state) => state.setNearbyError);

  const isFirstRadiusChange = useRef(true);

  useEffect(() => {
    if (isFirstRadiusChange.current) {
      isFirstRadiusChange.current = false;
      return;
    }
    if (!nearby.center) return;

    setNearbyLoading(true);
    setNearbyError(null);
    fetchNearby(nearby.center.lat, nearby.center.lon, nearby.radiusKm)
      .then(setNearbyResults)
      .catch(() => setNearbyError("Failed to fetch nearby aircraft."))
      .finally(() => setNearbyLoading(false));
    // Only re-run when the radius changes, not when center/results/loading change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearby.radiusKm]);

  return (
    <div className="pointer-events-auto absolute bottom-4 right-4 z-10 w-64 rounded-md bg-slate-900/90 p-3 text-sm text-slate-100 shadow-lg backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="font-semibold">Nearby search</span>
        <button
          onClick={() => setNearbyActive(!nearby.active)}
          className={`rounded px-2 py-1 text-xs font-medium ${
            nearby.active ? "bg-sky-500 text-slate-900" : "bg-slate-700 text-slate-100"
          }`}
        >
          {nearby.active ? "On" : "Off"}
        </button>
      </div>

      {nearby.active && (
        <div className="mt-3 space-y-2">
          <label className="flex items-center justify-between text-xs text-slate-400">
            Radius
            <span className="text-slate-100">{nearby.radiusKm} km</span>
          </label>
          <input
            type="range"
            min={MIN_RADIUS_KM}
            max={MAX_RADIUS_KM}
            step={10}
            value={nearby.radiusKm}
            onChange={(e) => setNearbyRadius(Number(e.target.value))}
            className="w-full"
          />

          {!nearby.center && (
            <p className="text-xs text-slate-400">Click the map to search around a point.</p>
          )}
          {nearby.loading && <p className="text-xs text-slate-400">Searching…</p>}
          {nearby.error && <p className="text-xs text-red-400">{nearby.error}</p>}
          {!nearby.loading && !nearby.error && nearby.results && (
            <p className="text-xs text-slate-300">
              {nearby.results.length === 0
                ? "No aircraft found within radius."
                : `${nearby.results.length} aircraft within ${nearby.radiusKm} km.`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
