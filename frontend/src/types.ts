export type AircraftType = "MILITARY" | "COMMERCIAL" | "DRONE" | "UNKNOWN";
export type Classification = "FRIENDLY" | "HOSTILE" | "NEUTRAL" | "UNKNOWN";

export interface AircraftPosition {
  callsign: string;
  lat: number;
  lon: number;
  altitude: number;
  heading: number;
  speed: number;
  aircraft_type: AircraftType;
  classification: Classification;
}

export interface PositionsMessage {
  type: "positions";
  aircraft: AircraftPosition[];
}
