import { z } from "zod";
import type { A2MapSpec } from "./types.js";

/**
 * Intelligent coordinate normalizer.
 * In GIS / MapLibre: [longitude, latitude] where longitude in [-180, 180] and latitude in [-90, 90].
 * LLMs frequently invert order and output [lat, lng] (e.g. [35.6895, 139.6917]).
 * If second value exceeds latitude limits (-90 to 90) and first is within [-90, 90], automatically flip.
 */
export function normalizeCoordinates(coords: [number, number]): [number, number] {
  const [first, second] = coords;
  if ((second > 90 || second < -90) && first >= -90 && first <= 90) {
    return [second, first];
  }
  return [first, second];
}

export const a2MapLngLatSchema = z
  .union([z.tuple([z.coerce.number(), z.coerce.number()]), z.array(z.coerce.number()).length(2)])
  .transform((val) => normalizeCoordinates([val[0], val[1]]));

export const a2MapBoundsSchema = z
  .union([
    z.tuple([z.coerce.number(), z.coerce.number(), z.coerce.number(), z.coerce.number()]),
    z.array(z.coerce.number()).length(4),
  ])
  .transform((val): [number, number, number, number] => {
    let [minLng, minLat, maxLng, maxLat] = val;
    // Auto-fix if bounds latitudes/longitudes were reversed
    if (
      (minLat > 90 || minLat < -90 || maxLat > 90 || maxLat < -90) &&
      Math.abs(minLng) <= 90 &&
      Math.abs(maxLng) <= 90
    ) {
      [minLng, minLat, maxLng, maxLat] = [minLat, minLng, maxLat, maxLng];
    }
    return [minLng, minLat, maxLng, maxLat];
  });

export const a2MapCameraPaddingSchema = z.object({
  top: z.coerce.number().optional(),
  bottom: z.coerce.number().optional(),
  left: z.coerce.number().optional(),
  right: z.coerce.number().optional(),
});

export const a2MapCameraSchema = z.object({
  center: a2MapLngLatSchema.optional(),
  zoom: z.coerce.number().optional(),
  pitch: z.coerce.number().optional(),
  bearing: z.coerce.number().optional(),
  bounds: a2MapBoundsSchema.optional(),
  padding: a2MapCameraPaddingSchema.optional(),
  animation: z.enum(["flyTo", "jumpTo", "easeTo"]).optional(),
  durationMs: z.coerce.number().optional(),
  essential: z.boolean().optional(),
});

export const a2MapTerrainConfigSchema = z.object({
  source: z.string(),
  exaggeration: z.coerce.number().optional(),
});

const controlPositionSchema = z.enum(["top-left", "top-right", "bottom-left", "bottom-right"]);

export const a2MapControlsConfigSchema = z.object({
  navigation: z
    .union([
      z.boolean(),
      z.object({
        showCompass: z.boolean().optional(),
        showZoom: z.boolean().optional(),
        visualizePitch: z.boolean().optional(),
        position: controlPositionSchema.optional(),
      }),
    ])
    .optional(),
  scale: z
    .union([
      z.boolean(),
      z.object({
        maxWidth: z.coerce.number().optional(),
        unit: z.enum(["metric", "imperial", "nautical"]).optional(),
        position: controlPositionSchema.optional(),
      }),
    ])
    .optional(),
  fullscreen: z
    .union([z.boolean(), z.object({ position: controlPositionSchema.optional() })])
    .optional(),
  geolocate: z
    .union([
      z.boolean(),
      z.object({
        position: controlPositionSchema.optional(),
        trackUserLocation: z.boolean().optional(),
      }),
    ])
    .optional(),
  attribution: z
    .union([
      z.boolean(),
      z.object({
        compact: z.boolean().optional(),
        customAttribution: z.union([z.string(), z.array(z.string())]).optional(),
        position: controlPositionSchema.optional(),
      }),
    ])
    .optional(),
});

export const a2MapInteractionsConfigSchema = z.object({
  scrollZoom: z.boolean().optional(),
  boxZoom: z.boolean().optional(),
  dragRotate: z.boolean().optional(),
  dragPan: z.boolean().optional(),
  keyboard: z.boolean().optional(),
  doubleClickZoom: z.boolean().optional(),
  touchZoomRotate: z.boolean().optional(),
  touchPitch: z.boolean().optional(),
});

export const a2MapCanvasSchema = z.object({
  baseStyle: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  projection: z.enum(["mercator", "globe"]).optional(),
  camera: a2MapCameraSchema.optional(),
  terrain: a2MapTerrainConfigSchema.optional(),
  controls: a2MapControlsConfigSchema.optional(),
  interactions: a2MapInteractionsConfigSchema.optional(),
  minZoom: z.coerce.number().optional(),
  maxZoom: z.coerce.number().optional(),
  minPitch: z.coerce.number().optional(),
  maxPitch: z.coerce.number().optional(),
  maxBounds: a2MapBoundsSchema.optional(),
});

export const a2MapLayerStyleSchema = z.object({
  color: z.string().optional(),
  strokeColor: z.string().optional(),
  strokeWidth: z.coerce.number().optional(),
  opacity: z.coerce.number().optional(),
  dashArray: z.array(z.coerce.number()).optional(),
  height: z.coerce.number().optional(),
  base: z.coerce.number().optional(),
  radius: z.coerce.number().optional(),
  textField: z.union([z.string(), z.array(z.unknown())]).optional(),
  textSize: z.coerce.number().optional(),
  textColor: z.string().optional(),
  textHaloColor: z.string().optional(),
  textHaloWidth: z.coerce.number().optional(),
  animated: z
    .union([
      z.boolean(),
      z.object({
        durationMs: z.coerce.number().optional(),
        dashLength: z.coerce.number().optional(),
      }),
    ])
    .optional(),
});

export const a2MapTooltipConfigSchema = z.object({
  fields: z.array(z.string()).optional(),
  title: z.string().optional(),
  template: z.string().optional(),
});

export const a2MapClusterStyleSchema = z.object({
  radius: z.coerce.number().optional(),
  colors: z
    .array(
      z.object({
        count: z.coerce.number(),
        color: z.string(),
      })
    )
    .optional(),
  textColor: z.string().optional(),
});

export const a2MapLayerSourceSchema = z.object({
  type: z.enum(["geojson", "raster", "vector", "pmtiles"]),
  data: z.any().optional(),
  tiles: z.array(z.string()).optional(),
  tileSize: z.coerce.number().optional(),
  attribution: z.string().optional(),
  url: z.string().optional(),
  cluster: z.boolean().optional(),
  clusterMaxZoom: z.coerce.number().optional(),
  clusterRadius: z.coerce.number().optional(),
});

export const a2MapLayerSchema = z.object({
  id: z.string(),
  type: z.enum(["fill", "line", "circle", "fill-extrusion", "heatmap", "raster", "symbol"]),
  label: z.string().optional(),
  source: a2MapLayerSourceSchema,
  sourceLayer: z.string().optional(),
  style: a2MapLayerStyleSchema.optional(),
  clusterStyle: a2MapClusterStyleSchema.optional(),
  visible: z.boolean().optional(),
  minZoom: z.coerce.number().optional(),
  maxZoom: z.coerce.number().optional(),
  interactive: z.boolean().optional(),
  tooltip: a2MapTooltipConfigSchema.optional(),
  beforeId: z.string().optional(),
  zIndex: z.coerce.number().optional(),
});

export const a2MapMarkerSchema = z.object({
  id: z.string(),
  coordinates: a2MapLngLatSchema,
  color: z.string().optional(),
  label: z.string().optional(),
  icon: z.string().optional(),
  draggable: z.boolean().optional(),
  popupHtml: z.string().optional(),
  element: z.any().optional(),
  animateMovement: z
    .union([
      z.boolean(),
      z.object({
        durationMs: z.coerce.number().optional(),
      }),
    ])
    .optional(),
});

export const a2MapPopupSchema = z.object({
  id: z.string(),
  coordinates: a2MapLngLatSchema,
  title: z.string().optional(),
  content: z.string(),
  closeButton: z.boolean().optional(),
  closeOnClick: z.boolean().optional(),
  maxWidth: z.string().optional(),
});

const a2MapWidgetPositionSchema = z.enum([
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
  "top-center",
  "bottom-center",
]);

export const a2MapLegendItemSchema = z.object({
  label: z.string(),
  color: z.string(),
  shape: z.enum(["square", "circle", "line"]).optional(),
  description: z.string().optional(),
});

export const a2MapActionItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  icon: z.string().optional(),
  variant: z.enum(["primary", "secondary", "danger", "ghost"]).optional(),
  disabled: z.boolean().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const a2MapMetricItemSchema = z.object({
  label: z.string(),
  value: z.union([z.string(), z.number()]),
  unit: z.string().optional(),
  change: z.string().optional(),
  trend: z.enum(["up", "down", "neutral"]).optional(),
});

export const a2MapWidgetSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string(),
    type: z.literal("legend"),
    position: a2MapWidgetPositionSchema.optional(),
    title: z.string().optional(),
    items: z.array(a2MapLegendItemSchema),
  }),
  z.object({
    id: z.string(),
    type: z.literal("action_panel"),
    position: a2MapWidgetPositionSchema.optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    actions: z.array(a2MapActionItemSchema),
  }),
  z.object({
    id: z.string(),
    type: z.literal("metrics_card"),
    position: a2MapWidgetPositionSchema.optional(),
    title: z.string(),
    metrics: z.array(a2MapMetricItemSchema),
  }),
  z.object({
    id: z.string(),
    type: z.literal("banner"),
    position: a2MapWidgetPositionSchema.optional(),
    message: z.string(),
    level: z.enum(["info", "success", "warning", "alert"]).optional(),
    durationMs: z.coerce.number().optional(),
  }),
]);

/**
 * Root specification schema with auto-filling version if omitted.
 */
export const a2MapSpecSchema = z.preprocess(
  (val) => {
    if (typeof val === "object" && val !== null) {
      const obj = val as Record<string, unknown>;
      const hasMapKeys =
        "canvas" in obj ||
        "layers" in obj ||
        "markers" in obj ||
        "popups" in obj ||
        "widgets" in obj;
      if (!("version" in obj) && hasMapKeys) {
        return { version: "1.0", ...obj };
      }
    }
    return val;
  },
  z.object({
    version: z.literal("1.0"),
    canvas: a2MapCanvasSchema.optional(),
    layers: z.array(a2MapLayerSchema).optional(),
    markers: z.array(a2MapMarkerSchema).optional(),
    popups: z.array(a2MapPopupSchema).optional(),
    widgets: z.array(a2MapWidgetSchema).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
);

/**
 * Parses and auto-normalizes an unknown object into a valid A2MapSpec.
 * Throws ZodError on unrecoverable validation failure.
 */
export function parseA2MapSpec(input: unknown): A2MapSpec {
  return a2MapSpecSchema.parse(input) as A2MapSpec;
}

/**
 * Safely parses and normalizes an A2MapSpec, returning status and data/errors.
 */
export function safeParseA2MapSpec(input: unknown) {
  return a2MapSpecSchema.safeParse(input);
}
