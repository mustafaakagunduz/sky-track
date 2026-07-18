import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { fetchNearby } from "../api";
import { useAircraftStore } from "../store/aircraftStore";

const MIN_RADIUS_KM = 10;
const MAX_RADIUS_KM = 200;

export default function RadiusSearchControl() {
  const { t } = useTranslation();
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
      .catch(() => setNearbyError(t("nearby.error")))
      .finally(() => setNearbyLoading(false));
    // Only re-run when the radius changes, not when center/results/loading change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearby.radiusKm]);

  return (
    <div className="pointer-events-auto w-64 rounded-md border border-slate-200 bg-white/90 p-3 text-sm text-slate-900 shadow-lg backdrop-blur transition-colors dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100">
      <div className="flex items-center justify-between">
        <span className="font-semibold">{t("nearby.title")}</span>
        <button
          onClick={() => setNearbyActive(!nearby.active)}
          className={`rounded px-2 py-1 text-xs font-medium ${
            nearby.active
              ? "bg-sky-500 text-slate-900"
              : "bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100"
          }`}
        >
          {nearby.active ? t("nearby.on") : t("nearby.off")}
        </button>
      </div>

      {nearby.active && (
        <div className="mt-3 space-y-2">
          <label className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            {t("nearby.radius")}
            <span className="text-slate-900 dark:text-slate-100">{nearby.radiusKm} km</span>
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
            <p className="text-xs text-slate-500 dark:text-slate-400">{t("nearby.prompt")}</p>
          )}
          {nearby.loading && <p className="text-xs text-slate-500 dark:text-slate-400">{t("nearby.searching")}</p>}
          {nearby.error && <p className="text-xs text-red-500 dark:text-red-400">{nearby.error}</p>}
          {!nearby.loading && !nearby.error && nearby.results && (
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {nearby.results.length === 0
                ? t("nearby.empty")
                : t("nearby.results", { count: nearby.results.length, radius: nearby.radiusKm })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
