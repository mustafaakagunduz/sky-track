import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { fetchTrack } from "../api";
import { useAircraftStore } from "../store/aircraftStore";

export default function DetailCard() {
  const { t } = useTranslation();
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
        if (!cancelled) setTrailError(t("detail.trailError"));
      })
      .finally(() => {
        if (!cancelled) setTrailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCallsign, setTrail, setTrailLoading, setTrailError, t]);

  if (!selectedCallsign) return null;

  return (
    <div className="animate-fade-in-up pointer-events-auto absolute left-4 top-16 z-10 w-72 rounded-md border border-slate-200 bg-white/90 text-sm text-slate-900 shadow-lg backdrop-blur transition-colors dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-700">
        <span className="font-semibold">{selectedCallsign}</span>
        <button
          onClick={() => setSelectedCallsign(null)}
          className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          aria-label={t("detail.close")}
        >
          ✕
        </button>
      </div>

      {!aircraft ? (
        <div className="px-3 py-4 text-center text-slate-500 dark:text-slate-400">
          {t("detail.gone")}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1 px-3 py-2 text-xs">
          <span className="text-slate-500 dark:text-slate-400">{t("detail.type")}</span>
          <span>{t(`aircraftType.${aircraft.aircraft_type}`)}</span>
          <span className="text-slate-500 dark:text-slate-400">{t("detail.classification")}</span>
          <span>{t(`classification.${aircraft.classification}`)}</span>
          <span className="text-slate-500 dark:text-slate-400">{t("detail.position")}</span>
          <span>
            {aircraft.lat.toFixed(3)}, {aircraft.lon.toFixed(3)}
          </span>
          <span className="text-slate-500 dark:text-slate-400">{t("detail.altitude")}</span>
          <span>{Math.round(aircraft.altitude)} m</span>
          <span className="text-slate-500 dark:text-slate-400">{t("detail.heading")}</span>
          <span>{Math.round(aircraft.heading)}°</span>
          <span className="text-slate-500 dark:text-slate-400">{t("detail.speed")}</span>
          <span>{Math.round(aircraft.speed)} m/s</span>
        </div>
      )}

      {(trailLoading || trailError) && (
        <div className="border-t border-slate-200 px-3 py-2 text-xs dark:border-slate-700">
          {trailLoading && <span className="text-slate-500 dark:text-slate-400">{t("detail.trailLoading")}</span>}
          {trailError && <span className="text-red-500 dark:text-red-400">{trailError}</span>}
        </div>
      )}
    </div>
  );
}
