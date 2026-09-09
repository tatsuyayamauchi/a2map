import type { A2MapBaseStyle } from "./types.js";

/**
 * Standard self-contained raster basemap configurations.
 * Users can also pass their own MapLibre Style Specification JSON or style URL.
 */
export const DEFAULT_BASE_STYLES: Record<string, object> = {
  topo: {
    version: 8,
    sources: {
      "osm-voyager": {
        type: "raster",
        tiles: [
          "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
          "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
          "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        ],
        tileSize: 256,
        attribution: "© CARTO, © OpenStreetMap contributors",
      },
    },
    layers: [
      {
        id: "osm-voyager-layer",
        type: "raster",
        source: "osm-voyager",
        minzoom: 0,
        maxzoom: 20,
      },
    ],
  },
  satellite: {
    version: 8,
    sources: {
      "satellite-raster": {
        type: "raster",
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        attribution: "Esri, Maxar, Earthstar Geographics",
      },
    },
    layers: [
      {
        id: "satellite-raster-layer",
        type: "raster",
        source: "satellite-raster",
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  },
  streets: {
    version: 8,
    sources: {
      "streets-raster": {
        type: "raster",
        tiles: [
          "https://a.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}@2x.png",
          "https://b.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}@2x.png",
          "https://c.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}@2x.png",
        ],
        tileSize: 256,
        attribution: "© CARTO, © OpenStreetMap contributors",
      },
    },
    layers: [
      {
        id: "streets-raster-layer",
        type: "raster",
        source: "streets-raster",
        minzoom: 0,
        maxzoom: 20,
      },
    ],
  },
  dark: {
    version: 8,
    sources: {
      "dark-raster": {
        type: "raster",
        tiles: [
          "https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png",
          "https://b.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png",
          "https://c.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png",
        ],
        tileSize: 256,
        attribution: "© CARTO, © OpenStreetMap contributors",
      },
    },
    layers: [
      {
        id: "dark-raster-layer",
        type: "raster",
        source: "dark-raster",
        minzoom: 0,
        maxzoom: 20,
      },
    ],
  },
  osm: {
    version: 8,
    sources: {
      "osm-standard": {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors",
      },
    },
    layers: [
      {
        id: "osm-standard-layer",
        type: "raster",
        source: "osm-standard",
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  },
};

export function resolveBaseStyle(style?: A2MapBaseStyle): object | string {
  if (!style) return DEFAULT_BASE_STYLES.topo;
  if (typeof style === "object") return style;
  if (DEFAULT_BASE_STYLES[style]) {
    return DEFAULT_BASE_STYLES[style];
  }
  return style;
}
