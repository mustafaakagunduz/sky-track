import type { NearbyAircraft, TrackPoint } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request to ${url} failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function fetchTrack(callsign: string): Promise<TrackPoint[]> {
  return getJson<TrackPoint[]>(`${API_URL}/aircraft/${encodeURIComponent(callsign)}/track/`);
}

export function fetchNearby(
  lat: number,
  lon: number,
  radiusKm: number,
): Promise<NearbyAircraft[]> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    radius_km: String(radiusKm),
  });
  return getJson<NearbyAircraft[]>(`${API_URL}/aircraft/nearby/?${params}`);
}
