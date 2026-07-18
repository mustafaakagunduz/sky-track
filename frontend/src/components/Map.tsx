import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import { useAircraftStore } from "../store/aircraftStore";

const AIRCRAFT_SOURCE_ID = "aircraft";
const AIRCRAFT_LAYER_ID = "aircraft-layer";
const AIRCRAFT_ICON_ID = "aircraft-triangle";

const CLASSIFICATION_COLOR: Record<string, string> = {
  FRIENDLY: "#4ade80",
  HOSTILE: "#f87171",
  NEUTRAL: "#60a5fa",
  UNKNOWN: "#9ca3af",
};

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

export default function Map() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          basemap: {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
              "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
              "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
            ],
            tileSize: 256,
            attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
          },
        },
        layers: [{ id: "basemap", type: "raster", source: "basemap" }],
      },
      center: [28.9, 40.9],
      zoom: 8,
    });
    mapRef.current = map;

    map.on("load", () => {
      map.addImage(AIRCRAFT_ICON_ID, buildTriangleIcon(), { sdf: true });

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

      const unsubscribe = useAircraftStore.subscribe((state) => {
        const source = map.getSource(AIRCRAFT_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
        source?.setData(toFeatureCollection(state.aircraft) as GeoJSON.FeatureCollection);
      });

      map.once("remove", unsubscribe);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="h-full w-full" />;
}
