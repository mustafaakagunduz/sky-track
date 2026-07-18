import { useMemo } from "react";
import type { AircraftType, Classification } from "../types";
import { useAircraftStore } from "../store/aircraftStore";

const AIRCRAFT_TYPES: AircraftType[] = ["MILITARY", "COMMERCIAL", "DRONE", "UNKNOWN"];
const CLASSIFICATIONS: Classification[] = ["FRIENDLY", "HOSTILE", "NEUTRAL", "UNKNOWN"];

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

export default function AircraftPanel() {
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
    <div className="pointer-events-auto absolute right-0 top-0 z-10 flex h-full w-[26rem] flex-col rounded-l-md bg-slate-900/90 text-sm text-slate-100 shadow-lg backdrop-blur">
      <div className="flex items-center justify-between border-b border-slate-700 px-3 py-2">
        <span className="font-semibold">Aircraft ({rows.length})</span>
        <span className="flex items-center gap-2 text-xs text-slate-300">
          <span className={`h-2 w-2 rounded-full ${STATUS_COLOR[wsStatus]}`} />
          {STATUS_LABEL[wsStatus]}
        </span>
      </div>

      <div className="flex gap-2 border-b border-slate-700 px-3 py-2">
        <select
          className="flex-1 rounded bg-slate-800 px-2 py-1 text-xs text-slate-100"
          value={filters.aircraftType ?? ""}
          onChange={(e) =>
            setFilters({ aircraftType: (e.target.value || null) as AircraftType | null })
          }
        >
          <option value="">All types</option>
          {AIRCRAFT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <select
          className="flex-1 rounded bg-slate-800 px-2 py-1 text-xs text-slate-100"
          value={filters.classification ?? ""}
          onChange={(e) =>
            setFilters({
              classification: (e.target.value || null) as Classification | null,
            })
          }
        >
          <option value="">All classes</option>
          {CLASSIFICATIONS.map((classification) => (
            <option key={classification} value={classification}>
              {classification}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-y-auto">
        {rows.length === 0 ? (
          <div className="px-3 py-6 text-center text-slate-400">
            No aircraft match the current filters.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-900/95 text-slate-400">
              <tr>
                <th className="px-3 py-1 font-medium">Callsign</th>
                <th className="px-3 py-1 font-medium">Type</th>
                <th className="px-3 py-1 font-medium">Class</th>
                <th className="px-3 py-1 font-medium">Lat/Lon</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr
                  key={a.callsign}
                  onClick={() => setSelectedCallsign(a.callsign)}
                  className={`cursor-pointer border-t border-slate-800 hover:bg-slate-800 ${
                    selectedCallsign === a.callsign ? "bg-slate-700" : ""
                  }`}
                >
                  <td className="px-3 py-1">{a.callsign}</td>
                  <td className="px-3 py-1">{a.aircraft_type}</td>
                  <td className="px-3 py-1">{a.classification}</td>
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
