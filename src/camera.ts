import type { Map as MapLibreMap } from "maplibre-gl";
import type {
  A2MapCamera,
  A2MapCameraPadding,
  A2MapController,
  A2MapAgentContext,
  A2MapContextOptions,
  A2MapVisibleFeature,
  A2MapSpec,
} from "./types.js";

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
export function createA2MapController(
  mapProvider: () => MapLibreMap | null,
  specProvider?: () => A2MapSpec | null
): A2MapController {
  const getMap = () => mapProvider();

  return {
    getMapInstance: () => getMap(),

    getAgentContext: (options?: A2MapContextOptions): A2MapAgentContext | null => {
      const map = getMap();
      if (!map) return null;

      const center = map.getCenter();
      const bounds = map.getBounds();
      const currentSpec = specProvider?.();

      let visibleFeatures: A2MapVisibleFeature[] | undefined;
      if (options?.includeFeatures !== false) {
        try {
          const queryOpts = options?.targetLayerIds
            ? { layers: options.targetLayerIds }
            : undefined;
          const rendered = map.queryRenderedFeatures(undefined, queryOpts) || [];
          const max = options?.maxFeatures ?? 20;
          const seen = new Set<string>();
          visibleFeatures = [];

          for (const f of rendered) {
            const layerId = f.layer?.id || "";
            // Skip background styles without clear ID
            if (!layerId || layerId === "background") continue;
            const key = `${layerId}-${JSON.stringify(f.properties)}`;
            if (seen.has(key)) continue;
            seen.add(key);

            visibleFeatures.push({
              layerId,
              geometryType: f.geometry?.type || "Unknown",
              properties: (f.properties as Record<string, unknown>) || {},
            });

            if (visibleFeatures.length >= max) break;
          }
        } catch {
          // If queryRenderedFeatures fails before style load
        }
      }

      return {
        camera: {
          center: [Number(center.lng.toFixed(5)), Number(center.lat.toFixed(5))],
          zoom: Number(map.getZoom().toFixed(2)),
          pitch: Number(map.getPitch().toFixed(2)),
          bearing: Number(map.getBearing().toFixed(2)),
          bounds: [
            Number(bounds.getWest().toFixed(5)),
            Number(bounds.getSouth().toFixed(5)),
            Number(bounds.getEast().toFixed(5)),
            Number(bounds.getNorth().toFixed(5)),
          ],
        },
        activeLayers: (currentSpec?.layers || []).map((l) => ({
          id: l.id,
          type: l.type,
          visible: l.visible !== false,
          label: l.label,
        })),
        markers: (currentSpec?.markers || []).map((m) => ({
          id: m.id,
          coordinates: m.coordinates,
          label: m.label,
        })),
        visibleFeatures,
      };
    },

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
          ...(pad ? { padding: pad } : {}),
          duration: options?.durationMs ?? 1500,
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
      map.zoomTo(zoom, { duration: options?.durationMs ?? 500 });
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

/**
 * Formats A2MapAgentContext into a token-efficient Markdown prompt string for LLMs.
 */
export function formatAgentContextAsPrompt(context: A2MapAgentContext | null): string {
  if (!context) return "Map viewport is currently unavailable.";

  const { camera, activeLayers, markers, visibleFeatures } = context;

  const lines: string[] = [
    "### Current Map Viewport Context",
    `- **Camera**: Center: [${camera.center[0]}, ${camera.center[1]}], Zoom: ${camera.zoom}, Pitch: ${camera.pitch}°, Bearing: ${camera.bearing}°`,
    `- **Visible Bounds**: [West: ${camera.bounds[0]}, South: ${camera.bounds[1]}, East: ${camera.bounds[2]}, North: ${camera.bounds[3]}]`,
  ];

  if (activeLayers.length > 0) {
    lines.push(`- **Active Layers (${activeLayers.length})**:`);
    for (const l of activeLayers) {
      lines.push(
        `  - \`${l.id}\` (${l.type}, ${l.visible ? "visible" : "hidden"}${l.label ? `, "${l.label}"` : ""})`
      );
    }
  }

  if (markers.length > 0) {
    lines.push(`- **Active Markers (${markers.length})**:`);
    for (const m of markers) {
      lines.push(
        `  - \`${m.id}\` at [${m.coordinates[0]}, ${m.coordinates[1]}]${m.label ? ` ("${m.label}")` : ""}`
      );
    }
  }

  if (visibleFeatures && visibleFeatures.length > 0) {
    lines.push(`- **Visible Features (top ${visibleFeatures.length})**:`);
    for (const f of visibleFeatures) {
      const summaryProps = Object.entries(f.properties)
        .slice(0, 4)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join(", ");
      lines.push(
        `  - [${f.layerId}] (${f.geometryType})${summaryProps ? ` { ${summaryProps} }` : ""}`
      );
    }
  }

  return lines.join("\n");
}
