import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import i18n from "../i18n";
import { fetchNearby } from "../api";
import { useAircraftStore } from "../store/aircraftStore";
import { useThemeStore, type Theme } from "../store/themeStore";

const AIRCRAFT_SOURCE_ID = "aircraft";
const AIRCRAFT_LAYER_ID = "aircraft-layer";
const AIRCRAFT_ICON_ID = "aircraft-triangle";
const TRAIL_SOURCE_ID = "trail";
const TRAIL_LAYER_ID = "trail-layer";
const CIRCLE_SOURCE_ID = "nearby-circle";
const CIRCLE_FILL_LAYER_ID = "nearby-circle-fill";
const CIRCLE_LINE_LAYER_ID = "nearby-circle-line";

const CLASSIFICATION_COLOR: Record<string, string> = {
  FRIENDLY: "#4ade80",
  HOSTILE: "#f87171",
  NEUTRAL: "#60a5fa",
  UNKNOWN: "#9ca3af",
};

const EARTH_RADIUS_KM = 6371;

function buildTriangleIcon(): ImageData {
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.beginPath();
  ctx.moveTo(size / 2, 2);
  ctx.lineTo(size - 4, size - 4);
  ctx.lineTo(4, size - 4);
  ctx.closePath();
  ctx.fillStyle = "white";
  ctx.fill();
  return ctx.getImageData(0, 0, size, size);
}

function toFeatureCollection(
  aircraft: Record<string, ReturnType<typeof useAircraftStore.getState>["aircraft"][string]>,
) {
  return {
    type: "FeatureCollection" as const,
    features: Object.values(aircraft).map((a) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [a.lon, a.lat] },
      properties: {
        callsign: a.callsign,
        heading: a.heading,
        classification: a.classification,
        aircraft_type: a.aircraft_type,
      },
    })),
  };
}

function toTrailFeatureCollection(trail: ReturnType<typeof useAircraftStore.getState>["trail"]) {
  const ordered = [...trail].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: ordered.map((p) => [p.lon, p.lat]),
        },
        properties: {},
      },
    ],
  };
}

function circlePolygon(centerLat: number, centerLon: number, radiusKm: number) {
  const points = 64;
  const coords: [number, number][] = [];
  const latRad = (centerLat * Math.PI) / 180;
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dLat = (radiusKm / EARTH_RADIUS_KM) * Math.cos(angle);
    const dLon = ((radiusKm / EARTH_RADIUS_KM) * Math.sin(angle)) / Math.cos(latRad);
    coords.push([centerLon + (dLon * 180) / Math.PI, centerLat + (dLat * 180) / Math.PI]);
  }
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        geometry: { type: "Polygon" as const, coordinates: [coords] },
        properties: {},
      },
    ],
  };
}

const EMPTY_FEATURE_COLLECTION = { type: "FeatureCollection" as const, features: [] };

function buildMapStyle(theme: Theme): maplibregl.StyleSpecification {
  const variant = theme === "dark" ? "dark_all" : "light_all";
  return {
    version: 8,
    sources: {
      basemap: {
        type: "raster",
        tiles: [
          `https://a.basemaps.cartocdn.com/${variant}/{z}/{x}/{y}{r}.png`,
          `https://b.basemaps.cartocdn.com/${variant}/{z}/{x}/{y}{r}.png`,
          `https://c.basemaps.cartocdn.com/${variant}/{z}/{x}/{y}{r}.png`,
        ],
        tileSize: 256,
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
      },
    },
    layers: [{ id: "basemap", type: "raster", source: "basemap" }],
  };
}

export default function Map() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildMapStyle(useThemeStore.getState().theme),
      center: [28.9, 40.9],
      zoom: 8,
    });
    mapRef.current = map;

    const applyState = (state: ReturnType<typeof useAircraftStore.getState>) => {
      const aircraftSource = map.getSource(AIRCRAFT_SOURCE_ID) as
        | maplibregl.GeoJSONSource
        | undefined;
      if (!aircraftSource) return;
      aircraftSource.setData(toFeatureCollection(state.aircraft) as GeoJSON.FeatureCollection);

      const trailSource = map.getSource(TRAIL_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      trailSource?.setData(
        (state.selectedCallsign
          ? toTrailFeatureCollection(state.trail)
          : EMPTY_FEATURE_COLLECTION) as GeoJSON.FeatureCollection,
      );

      const circleSource = map.getSource(CIRCLE_SOURCE_ID) as
        | maplibregl.GeoJSONSource
        | undefined;
      circleSource?.setData(
        (state.nearby.center
          ? circlePolygon(state.nearby.center.lat, state.nearby.center.lon, state.nearby.radiusKm)
          : EMPTY_FEATURE_COLLECTION) as GeoJSON.FeatureCollection,
      );

      map.setLayoutProperty(AIRCRAFT_LAYER_ID, "icon-size", [
        "case",
        ["==", ["get", "callsign"], state.selectedCallsign ?? ""],
        0.95,
        0.6,
      ]);

      if (state.nearby.results) {
        const matching = state.nearby.results.map((r) => r.callsign);
        map.setPaintProperty(AIRCRAFT_LAYER_ID, "icon-opacity", [
          "case",
          ["in", ["get", "callsign"], ["literal", matching]],
          1,
          0.25,
        ]);
      } else {
        map.setPaintProperty(AIRCRAFT_LAYER_ID, "icon-opacity", 1);
      }
    };

    map.on("style.load", () => {
      map.addImage(AIRCRAFT_ICON_ID, buildTriangleIcon(), { sdf: true });

      map.addSource(CIRCLE_SOURCE_ID, { type: "geojson", data: EMPTY_FEATURE_COLLECTION });
      map.addLayer({
        id: CIRCLE_FILL_LAYER_ID,
        type: "fill",
        source: CIRCLE_SOURCE_ID,
        paint: { "fill-color": "#38bdf8", "fill-opacity": 0.1 },
      });
      map.addLayer({
        id: CIRCLE_LINE_LAYER_ID,
        type: "line",
        source: CIRCLE_SOURCE_ID,
        paint: { "line-color": "#38bdf8", "line-width": 2 },
      });

      map.addSource(TRAIL_SOURCE_ID, { type: "geojson", data: EMPTY_FEATURE_COLLECTION });
      map.addLayer({
        id: TRAIL_LAYER_ID,
        type: "line",
        source: TRAIL_SOURCE_ID,
        paint: { "line-color": "#fbbf24", "line-width": 2 },
      });

      map.addSource(AIRCRAFT_SOURCE_ID, {
        type: "geojson",
        data: toFeatureCollection({}),
      });

      map.addLayer({
        id: AIRCRAFT_LAYER_ID,
        type: "symbol",
        source: AIRCRAFT_SOURCE_ID,
        layout: {
          "icon-image": AIRCRAFT_ICON_ID,
          "icon-size": 0.6,
          "icon-rotate": ["get", "heading"],
          "icon-rotation-alignment": "map",
          "icon-allow-overlap": true,
        },
        paint: {
          "icon-color": [
            "match",
            ["get", "classification"],
            "FRIENDLY",
            CLASSIFICATION_COLOR.FRIENDLY,
            "HOSTILE",
            CLASSIFICATION_COLOR.HOSTILE,
            "NEUTRAL",
            CLASSIFICATION_COLOR.NEUTRAL,
            CLASSIFICATION_COLOR.UNKNOWN,
          ],
        },
      });

      applyState(useAircraftStore.getState());
    });

    map.on("click", AIRCRAFT_LAYER_ID, (e) => {
      if (useAircraftStore.getState().nearby.active) return;
      const feature = e.features?.[0];
      const callsign = feature?.properties?.callsign;
      if (callsign) {
        useAircraftStore.getState().setSelectedCallsign(callsign);
      }
    });

    map.on("mouseenter", AIRCRAFT_LAYER_ID, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", AIRCRAFT_LAYER_ID, () => {
      map.getCanvas().style.cursor = "";
    });

    map.on("click", (e) => {
      const { nearby } = useAircraftStore.getState();
      if (!nearby.active) return;

      const lat = e.lngLat.lat;
      const lon = e.lngLat.lng;
      useAircraftStore.getState().setNearbyCenter({ lat, lon });
      useAircraftStore.getState().setNearbyLoading(true);
      useAircraftStore.getState().setNearbyError(null);

      fetchNearby(lat, lon, useAircraftStore.getState().nearby.radiusKm)
        .then((results) => useAircraftStore.getState().setNearbyResults(results))
        .catch(() => useAircraftStore.getState().setNearbyError(i18n.t("nearby.error")))
        .finally(() => useAircraftStore.getState().setNearbyLoading(false));
    });

    const unsubscribeAircraft = useAircraftStore.subscribe(applyState);
    const unsubscribeTheme = useThemeStore.subscribe((state) => {
      map.setStyle(buildMapStyle(state.theme));
    });

    return () => {
      unsubscribeAircraft();
      unsubscribeTheme();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="h-full w-full" />;
}
