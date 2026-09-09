import type { Map as MapLibreMap } from "maplibre-gl";
import type { A2MapCamera, A2MapCameraPadding, A2MapController } from "./types.js";

function toPaddingOptions(padding?: A2MapCameraPadding) {
  if (!padding) return undefined;
  return {
    top: padding.top ?? 0,
    bottom: padding.bottom ?? 0,
    left: padding.left ?? 0,
    right: padding.right ?? 0,
  };
}

/**
 * Creates an A2MapController wrapping a MapLibre instance.
 */
export function createA2MapController(mapProvider: () => MapLibreMap | null): A2MapController {
  const getMap = () => mapProvider();

  return {
    getMapInstance: () => getMap(),

    flyTo: (options: A2MapCamera) => {
      const map = getMap();
      if (!map || !options.center) return;
      const pad = toPaddingOptions(options.padding);
      map.flyTo({
        center: options.center,
        zoom: options.zoom ?? map.getZoom(),
        pitch: options.pitch ?? map.getPitch(),
        bearing: options.bearing ?? map.getBearing(),
        ...(pad ? { padding: pad } : {}),
        duration: options.durationMs ?? 2000,
        essential: options.essential ?? true,
      });
    },

    easeTo: (options: A2MapCamera) => {
      const map = getMap();
      if (!map || !options.center) return;
      const pad = toPaddingOptions(options.padding);
      map.easeTo({
        center: options.center,
        zoom: options.zoom ?? map.getZoom(),
        pitch: options.pitch ?? map.getPitch(),
        bearing: options.bearing ?? map.getBearing(),
        ...(pad ? { padding: pad } : {}),
        duration: options.durationMs ?? 1000,
      });
    },

    jumpTo: (options: A2MapCamera) => {
      const map = getMap();
      if (!map || !options.center) return;
      const pad = toPaddingOptions(options.padding);
      map.jumpTo({
        center: options.center,
        zoom: options.zoom ?? map.getZoom(),
        pitch: options.pitch ?? map.getPitch(),
        bearing: options.bearing ?? map.getBearing(),
        ...(pad ? { padding: pad } : {}),
      });
    },

    fitBounds: (
      bounds: [number, number, number, number],
      options?: { padding?: A2MapCameraPadding; durationMs?: number }
    ) => {
      const map = getMap();
      if (!map) return;
      const [minLng, minLat, maxLng, maxLat] = bounds;
      const pad = toPaddingOptions(options?.padding);
      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        {
          padding: pad ?? 50,
          duration: options?.durationMs ?? 2000,
        }
      );
    },

    panTo: (coordinates: [number, number], options?: { durationMs?: number }) => {
      const map = getMap();
      if (!map) return;
      map.panTo(coordinates, { duration: options?.durationMs ?? 1000 });
    },

    zoomIn: (options?: { durationMs?: number }) => {
      const map = getMap();
      if (!map) return;
      map.zoomIn({ duration: options?.durationMs ?? 500 });
    },

    zoomOut: (options?: { durationMs?: number }) => {
      const map = getMap();
      if (!map) return;
      map.zoomOut({ duration: options?.durationMs ?? 500 });
    },

    zoomTo: (zoom: number, options?: { durationMs?: number }) => {
      const map = getMap();
      if (!map) return;
      map.zoomTo(zoom, { duration: options?.durationMs ?? 1000 });
    },

    rotateTo: (bearing: number, options?: { durationMs?: number }) => {
      const map = getMap();
      if (!map) return;
      map.rotateTo(bearing, { duration: options?.durationMs ?? 1000 });
    },

    resetNorth: (options?: { durationMs?: number }) => {
      const map = getMap();
      if (!map) return;
      map.resetNorth({ duration: options?.durationMs ?? 1000 });
    },

    resetNorthPitch: (options?: { durationMs?: number }) => {
      const map = getMap();
      if (!map) return;
      map.resetNorthPitch({ duration: options?.durationMs ?? 1000 });
    },

    resize: () => {
      const map = getMap();
      if (!map) return;
      map.resize();
    },
  };
}
