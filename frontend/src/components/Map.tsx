import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import i18n from "../i18n";
import { fetchNearby } from "../api";
import { useAircraftStore } from "../store/aircraftStore";
import { useThemeStore, type Theme } from "../store/themeStore";

const AIRCRAFT_SOURCE_ID = "aircraft";
const AIRCRAFT_LAYER_ID = "aircraft-layer";
const AIRCRAFT_ICON_ID: Record<string, string> = {
  MILITARY: "aircraft-icon-military",
  COMMERCIAL: "aircraft-icon-commercial",
  DRONE: "aircraft-icon-drone",
  UNKNOWN: "aircraft-icon-unknown",
};
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

const ICON_SIZE = 32;

function newIconCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = ICON_SIZE;
  canvas.height = ICON_SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "white";
  return ctx;
}

function fillPolygon(ctx: CanvasRenderingContext2D, points: [number, number][]) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.fill();
}

// Plain triangle, used when aircraft type is not known.
function buildUnknownIcon(): ImageData {
  const ctx = newIconCanvas();
  fillPolygon(ctx, [
    [16, 2],
    [28, 28],
    [4, 28],
  ]);
  return ctx.getImageData(0, 0, ICON_SIZE, ICON_SIZE);
}

// Classic airplane top-view silhouette: straight fuselage, wings roughly centered.
function buildCommercialIcon(): ImageData {
  const ctx = newIconCanvas();
  fillPolygon(ctx, [
    [16, 1],
    [19, 9],
    [30, 19],
    [30, 22],
    [19, 17],
    [19, 24],
    [24, 29],
    [24, 31],
    [16, 28],
    [8, 31],
    [8, 29],
    [13, 24],
    [13, 17],
    [2, 22],
    [2, 19],
    [13, 9],
  ]);
  return ctx.getImageData(0, 0, ICON_SIZE, ICON_SIZE);
}

// Fighter-jet silhouette: narrower fuselage, wings swept further back.
function buildMilitaryIcon(): ImageData {
  const ctx = newIconCanvas();
  fillPolygon(ctx, [
    [16, 1],
    [18, 11],
    [30, 23],
    [30, 25],
    [18, 20],
    [18, 26],
    [22, 30],
    [22, 31],
    [16, 29],
    [10, 31],
    [10, 30],
    [14, 26],
    [14, 20],
    [2, 25],
    [2, 23],
    [14, 11],
  ]);
  return ctx.getImageData(0, 0, ICON_SIZE, ICON_SIZE);
}

// Quadcopter viewed from above: center body, four arms, four rotor circles.
function buildDroneIcon(): ImageData {
  const ctx = newIconCanvas();
  const arms: [number, number][] = [
    [7, 7],
    [25, 7],
    [7, 25],
    [25, 25],
  ];
  ctx.lineWidth = 3;
  ctx.strokeStyle = "white";
  arms.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(16, 16);
    ctx.lineTo(x, y);
    ctx.stroke();
  });
  arms.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  fillPolygon(ctx, [
    [13, 13],
    [19, 13],
    [19, 19],
    [13, 19],
  ]);
  return ctx.getImageData(0, 0, ICON_SIZE, ICON_SIZE);
}

const AIRCRAFT_ICON_BUILDER: Record<string, () => ImageData> = {
  MILITARY: buildMilitaryIcon,
  COMMERCIAL: buildCommercialIcon,
  DRONE: buildDroneIcon,
  UNKNOWN: buildUnknownIcon,
};

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
      Object.entries(AIRCRAFT_ICON_ID).forEach(([type, id]) => {
        map.addImage(id, AIRCRAFT_ICON_BUILDER[type](), { sdf: true });
      });

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
          "icon-image": [
            "match",
            ["get", "aircraft_type"],
            "MILITARY",
            AIRCRAFT_ICON_ID.MILITARY,
            "COMMERCIAL",
            AIRCRAFT_ICON_ID.COMMERCIAL,
            "DRONE",
            AIRCRAFT_ICON_ID.DRONE,
            AIRCRAFT_ICON_ID.UNKNOWN,
          ],
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
      map.setStyle(buildMapStyle(state.theme), { diff: false });
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
