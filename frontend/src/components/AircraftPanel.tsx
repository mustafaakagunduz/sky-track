import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { AircraftType, Classification } from "../types";
import { useAircraftStore } from "../store/aircraftStore";
import ThemeToggle from "./ThemeToggle";

const AIRCRAFT_TYPES: AircraftType[] = ["MILITARY", "COMMERCIAL", "DRONE", "UNKNOWN"];
const CLASSIFICATIONS: Classification[] = ["FRIENDLY", "HOSTILE", "NEUTRAL", "UNKNOWN"];

const STATUS_COLOR: Record<string, string> = {
  connecting: "bg-amber-400",
  connected: "bg-emerald-400",
  disconnected: "bg-red-500",
};

export default function AircraftPanel() {
  const { t } = useTranslation();
  const aircraft = useAircraftStore((state) => state.aircraft);
  const wsStatus = useAircraftStore((state) => state.wsStatus);
  const filters = useAircraftStore((state) => state.filters);
  const setFilters = useAircraftStore((state) => state.setFilters);
  const selectedCallsign = useAircraftStore((state) => state.selectedCallsign);
  const setSelectedCallsign = useAircraftStore((state) => state.setSelectedCallsign);

  const rows = useMemo(() => {
    return Object.values(aircraft)
      .filter((a) => !filters.aircraftType || a.aircraft_type === filters.aircraftType)
      .filter((a) => !filters.classification || a.classification === filters.classification)
      .sort((a, b) => a.callsign.localeCompare(b.callsign));
  }, [aircraft, filters]);

  return (
    <div className="pointer-events-auto absolute right-0 top-0 z-10 flex h-full w-[26rem] flex-col rounded-l-md border-l border-slate-200 bg-white/90 text-sm text-slate-900 shadow-lg backdrop-blur transition-colors dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-700">
        <span className="font-semibold">
          {t("panel.title")} ({rows.length})
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
            <span className={`h-2 w-2 rounded-full ${STATUS_COLOR[wsStatus]}`} />
            {t(`status.${wsStatus}`)}
          </span>
          <ThemeToggle />
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-700">
        <select
          className="flex-1 rounded bg-slate-100 px-2 py-1 text-xs text-slate-900 dark:bg-slate-800 dark:text-slate-100"
          value={filters.aircraftType ?? ""}
          onChange={(e) =>
            setFilters({ aircraftType: (e.target.value || null) as AircraftType | null })
          }
        >
          <option value="">{t("panel.allTypes")}</option>
          {AIRCRAFT_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`aircraftType.${type}`)}
            </option>
          ))}
        </select>
        <select
          className="flex-1 rounded bg-slate-100 px-2 py-1 text-xs text-slate-900 dark:bg-slate-800 dark:text-slate-100"
          value={filters.classification ?? ""}
          onChange={(e) =>
            setFilters({
              classification: (e.target.value || null) as Classification | null,
            })
          }
        >
          <option value="">{t("panel.allClasses")}</option>
          {CLASSIFICATIONS.map((classification) => (
            <option key={classification} value={classification}>
              {t(`classification.${classification}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-y-auto">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-3 py-10 text-center text-slate-500 dark:text-slate-400">
            {Object.keys(aircraft).length === 0 && wsStatus !== "connected" ? (
              <>
                <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                <span>{t("panel.waiting")}</span>
              </>
            ) : (
              <span>{t("panel.empty")}</span>
            )}
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-white/95 text-slate-500 dark:bg-slate-900/95 dark:text-slate-400">
              <tr>
                <th className="px-3 py-1 font-medium">{t("panel.columnCallsign")}</th>
                <th className="px-3 py-1 font-medium">{t("panel.columnType")}</th>
                <th className="px-3 py-1 font-medium">{t("panel.columnClass")}</th>
                <th className="px-3 py-1 font-medium">{t("panel.columnPosition")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr
                  key={a.callsign}
                  onClick={() => setSelectedCallsign(a.callsign)}
                  className={`cursor-pointer border-t border-slate-100 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800 ${
                    selectedCallsign === a.callsign ? "bg-slate-200 dark:bg-slate-700" : ""
                  }`}
                >
                  <td className="px-3 py-1">{a.callsign}</td>
                  <td className="px-3 py-1">{t(`aircraftType.${a.aircraft_type}`)}</td>
                  <td className="px-3 py-1">{t(`classification.${a.classification}`)}</td>
                  <td className="px-3 py-1">
                    {a.lat.toFixed(2)}, {a.lon.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
