import type { A2MapController, A2MapSpec, A2MapMarker } from "./types.js";
import { parseA2MapSpec } from "./schema.js";
import { calculateDistance, createBuffer, getCentroid } from "./spatial.js";

/**
 * Standard JSON Schema parameters for A2Map agent tools.
 */
export const A2MAP_RENDER_MAP_TOOL = {
  name: "render_map",
  description:
    "Renders or declaratively updates the interactive geospatial map canvas, layers, 3D terrain/extrusions, markers, and HUD widgets.",
  parameters: {
    type: "object",
    properties: {
      version: {
        type: "string",
        enum: ["1.0"],
        description: "A2Map specification version, defaults to '1.0'.",
      },
      canvas: {
        type: "object",
        description: "Base canvas configuration including style, camera, and controls.",
        properties: {
          baseStyle: {
            type: "string",
            enum: ["topo", "satellite", "streets", "dark", "osm"],
            description: "Map base style preset or custom MapLibre style JSON URL.",
          },
          camera: {
            type: "object",
            properties: {
              center: {
                type: "array",
                items: { type: "number" },
                minItems: 2,
                maxItems: 2,
                description: "Map center coordinates as [longitude, latitude].",
              },
              zoom: { type: "number", description: "Zoom level (0 to 22)." },
              pitch: {
                type: "number",
                description: "Camera pitch/tilt angle in degrees (0 to 85).",
              },
              bearing: {
                type: "number",
                description: "Camera bearing/heading angle in degrees (-180 to 180).",
              },
              durationMs: {
                type: "number",
                description: "Camera animation duration in milliseconds.",
              },
            },
          },
        },
      },
      layers: {
        type: "array",
        description:
          "List of geospatial data layers (GeoJSON fill, line, circle, 3D extrusions, heatmaps).",
        items: {
          type: "object",
          required: ["id", "type", "source"],
          properties: {
            id: { type: "string", description: "Unique layer identifier." },
            type: {
              type: "string",
              enum: ["fill", "line", "circle", "fill-extrusion", "heatmap", "symbol", "raster"],
            },
            label: { type: "string" },
            source: {
              type: "object",
              required: ["type"],
              properties: {
                type: { type: "string", enum: ["geojson", "raster"] },
                data: {
                  type: "object",
                  description: "GeoJSON Feature, Geometry, or FeatureCollection.",
                },
              },
            },
            style: {
              type: "object",
              properties: {
                color: {
                  type: "string",
                  description: "Hex color or CSS color string (e.g. #3b82f6).",
                },
                strokeColor: { type: "string" },
                strokeWidth: { type: "number" },
                opacity: { type: "number" },
                height: { type: "number", description: "Height in meters for 3D fill-extrusion." },
                radius: { type: "number", description: "Radius in pixels for circle or heatmap." },
              },
            },
            visible: { type: "boolean" },
            zIndex: { type: "number", description: "Stacking order priority (lower is beneath)." },
            beforeId: {
              type: "string",
              description: "ID of layer before which to insert this layer.",
            },
          },
        },
      },
      markers: {
        type: "array",
        description: "List of point markers/pins to display.",
        items: {
          type: "object",
          required: ["id", "coordinates"],
          properties: {
            id: { type: "string" },
            coordinates: {
              type: "array",
              items: { type: "number" },
              minItems: 2,
              maxItems: 2,
              description: "[longitude, latitude]",
            },
            label: { type: "string" },
            color: { type: "string" },
            icon: { type: "string" },
            popupHtml: { type: "string" },
            draggable: { type: "boolean" },
          },
        },
      },
      widgets: {
        type: "array",
        description: "HUD widgets (legends, action panels, metric cards, banners).",
        items: {
          type: "object",
          required: ["id", "type"],
          properties: {
            id: { type: "string" },
            type: { type: "string", enum: ["legend", "action_panel", "metrics_card", "banner"] },
            position: {
              type: "string",
              enum: [
                "top-left",
                "top-right",
                "bottom-left",
                "bottom-right",
                "top-center",
                "bottom-center",
              ],
            },
          },
        },
      },
    },
  },
};

export const A2MAP_FLY_TO_TOOL = {
  name: "fly_to_location",
  description:
    "Smoothly animates the map camera to a specific coordinate location [longitude, latitude], with optional zoom, pitch, and bearing.",
  parameters: {
    type: "object",
    required: ["center"],
    properties: {
      center: {
        type: "array",
        items: { type: "number" },
        minItems: 2,
        maxItems: 2,
        description: "Target location coordinates [longitude, latitude].",
      },
      zoom: { type: "number", description: "Target zoom level (0 to 22)." },
      pitch: { type: "number", description: "Target pitch in degrees (0 to 85)." },
      bearing: { type: "number", description: "Target bearing/heading in degrees (-180 to 180)." },
      durationMs: {
        type: "number",
        description: "Animation duration in milliseconds (default 2000).",
      },
    },
  },
};

export const A2MAP_FIT_BOUNDS_TOOL = {
  name: "fit_bounds",
  description:
    "Adjusts map viewport camera to encompass a geographic bounding box [minLng, minLat, maxLng, maxLat].",
  parameters: {
    type: "object",
    required: ["bounds"],
    properties: {
      bounds: {
        type: "array",
        items: { type: "number" },
        minItems: 4,
        maxItems: 4,
        description: "[minLng, minLat, maxLng, maxLat]",
      },
      durationMs: { type: "number", description: "Animation duration in milliseconds." },
      padding: { type: "number", description: "Padding in pixels around bounds." },
    },
  },
};

export const A2MAP_ADD_MARKERS_TOOL = {
  name: "add_markers",
  description: "Adds or updates geographic marker pins on the map.",
  parameters: {
    type: "object",
    required: ["markers"],
    properties: {
      markers: {
        type: "array",
        description: "Markers to add or update.",
        items: {
          type: "object",
          required: ["id", "coordinates"],
          properties: {
            id: { type: "string" },
            coordinates: {
              type: "array",
              items: { type: "number" },
              minItems: 2,
              maxItems: 2,
              description: "[longitude, latitude]",
            },
            label: { type: "string" },
            color: { type: "string" },
            icon: { type: "string" },
            popupHtml: { type: "string" },
          },
        },
      },
    },
  },
};

export const A2MAP_INSPECT_MAP_TOOL = {
  name: "inspect_map",
  description:
    "Inspects the current map state, including camera coordinates, zoom, visible bounds, active layers, and rendered features in view.",
  parameters: {
    type: "object",
    properties: {
      includeFeatures: {
        type: "boolean",
        description: "Whether to query rendered features visible in the current viewport.",
      },
      maxFeatures: {
        type: "number",
        description: "Maximum number of visible features to return (default 20).",
      },
    },
  },
};

export const A2MAP_CREATE_BUFFER_TOOL = {
  name: "create_buffer",
  description:
    "Generates a circular buffer polygon around a center [longitude, latitude] coordinate with a specified radius in meters, optionally rendering it as a map layer.",
  parameters: {
    type: "object",
    required: ["center", "radiusMeters"],
    properties: {
      center: {
        type: "array",
        items: { type: "number" },
        minItems: 2,
        maxItems: 2,
        description: "Center coordinates as [longitude, latitude].",
      },
      radiusMeters: {
        type: "number",
        description: "Buffer radius in meters (e.g. 500 for 500m radius).",
      },
      layerId: {
        type: "string",
        description: "Optional layer ID to immediately render this buffer polygon onto the map.",
      },
      color: {
        type: "string",
        description: "Optional hex color for the buffer polygon (default #3b82f6).",
      },
      opacity: {
        type: "number",
        description: "Optional fill opacity for the buffer polygon (default 0.35).",
      },
    },
  },
};

export const A2MAP_CALCULATE_DISTANCE_TOOL = {
  name: "calculate_distance",
  description:
    "Calculates the geodesic distance between two geographic coordinates [longitude, latitude] in kilometers or meters.",
  parameters: {
    type: "object",
    required: ["coord1", "coord2"],
    properties: {
      coord1: {
        type: "array",
        items: { type: "number" },
        minItems: 2,
        maxItems: 2,
        description: "First coordinate [longitude, latitude].",
      },
      coord2: {
        type: "array",
        items: { type: "number" },
        minItems: 2,
        maxItems: 2,
        description: "Second coordinate [longitude, latitude].",
      },
      unit: {
        type: "string",
        enum: ["km", "m"],
        description: "Unit of measurement ('km' or 'm', defaults to 'km').",
      },
    },
  },
};

export const A2MAP_GET_CENTROID_TOOL = {
  name: "get_centroid",
  description: "Calculates the geometric centroid [longitude, latitude] of a list of coordinates.",
  parameters: {
    type: "object",
    required: ["coordinates"],
    properties: {
      coordinates: {
        type: "array",
        items: {
          type: "array",
          items: { type: "number" },
          minItems: 2,
          maxItems: 2,
        },
        description: "Array of [longitude, latitude] coordinates.",
      },
    },
  },
};

export const ALL_A2MAP_TOOLS = [
  A2MAP_RENDER_MAP_TOOL,
  A2MAP_FLY_TO_TOOL,
  A2MAP_FIT_BOUNDS_TOOL,
  A2MAP_ADD_MARKERS_TOOL,
  A2MAP_INSPECT_MAP_TOOL,
  A2MAP_CREATE_BUFFER_TOOL,
  A2MAP_CALCULATE_DISTANCE_TOOL,
  A2MAP_GET_CENTROID_TOOL,
] as const;

export type A2MapToolName =
  | "render_map"
  | "fly_to_location"
  | "fit_bounds"
  | "add_markers"
  | "inspect_map"
  | "create_buffer"
  | "calculate_distance"
  | "get_centroid";

export interface GetA2MapToolsOptions {
  format?: "openai" | "gemini" | "anthropic" | "json_schema";
  tools?: A2MapToolName[];
}

/**
 * Generates ready-to-use tool/function definitions formatted for OpenAI, Gemini / Google ADK, or Anthropic.
 */
export function getA2MapTools(options?: GetA2MapToolsOptions): unknown[] {
  const selectedNames = options?.tools
    ? new Set<string>(options.tools)
    : new Set(ALL_A2MAP_TOOLS.map((t) => t.name));

  const filtered = ALL_A2MAP_TOOLS.filter((t) => selectedNames.has(t.name));
  const format = options?.format ?? "openai";

  switch (format) {
    case "gemini":
      return filtered.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      }));

    case "anthropic":
      return filtered.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
      }));

    case "json_schema":
      return filtered;

    case "openai":
    default:
      return filtered.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
  }
}

/**
 * Utility to execute an LLM tool call directly against an A2MapController.
 */
export function executeA2MapToolCall(
  name: string,
  args: Record<string, unknown>,
  controller: A2MapController,
  specUpdater?: (spec: A2MapSpec) => void
): unknown {
  switch (name) {
    case "render_map": {
      const parsed = parseA2MapSpec(args);
      if (specUpdater) {
        specUpdater(parsed);
      }
      return { success: true, message: "Map spec updated." };
    }

    case "fly_to_location": {
      const center = args.center as [number, number];
      controller.flyTo({
        center,
        zoom: typeof args.zoom === "number" ? args.zoom : undefined,
        pitch: typeof args.pitch === "number" ? args.pitch : undefined,
        bearing: typeof args.bearing === "number" ? args.bearing : undefined,
        durationMs: typeof args.durationMs === "number" ? args.durationMs : undefined,
      });
      return { success: true, center };
    }

    case "fit_bounds": {
      const bounds = args.bounds as [number, number, number, number];
      const padding =
        typeof args.padding === "number"
          ? {
              top: args.padding,
              bottom: args.padding,
              left: args.padding,
              right: args.padding,
            }
          : undefined;
      controller.fitBounds(bounds, {
        durationMs: typeof args.durationMs === "number" ? args.durationMs : undefined,
        padding,
      });
      return { success: true, bounds };
    }

    case "add_markers": {
      const incomingMarkers = (args.markers as A2MapMarker[]) || [];
      if (specUpdater) {
        specUpdater({
          version: "1.0",
          markers: incomingMarkers,
        });
      }
      return { success: true, count: incomingMarkers.length };
    }

    case "inspect_map": {
      const context = controller.getAgentContext({
        includeFeatures: args.includeFeatures !== false,
        maxFeatures: typeof args.maxFeatures === "number" ? args.maxFeatures : 20,
      });
      return { success: true, context };
    }

    case "create_buffer": {
      const center = args.center as [number, number];
      const radiusMeters = Number(args.radiusMeters);
      const feature = createBuffer(center, radiusMeters);

      if (args.layerId && specUpdater) {
        specUpdater({
          version: "1.0",
          layers: [
            {
              id: String(args.layerId),
              type: "fill",
              source: {
                type: "geojson",
                data: feature,
              },
              style: {
                color: typeof args.color === "string" ? args.color : "#3b82f6",
                opacity: typeof args.opacity === "number" ? args.opacity : 0.35,
              },
            },
          ],
        });
      }

      return {
        success: true,
        center,
        radiusMeters,
        feature,
      };
    }

    case "calculate_distance": {
      const coord1 = args.coord1 as [number, number];
      const coord2 = args.coord2 as [number, number];
      const unit = (args.unit as "km" | "m") || "km";
      const distance = calculateDistance(coord1, coord2, unit);
      return { success: true, coord1, coord2, distance, unit };
    }

    case "get_centroid": {
      const coordinates = args.coordinates as Array<[number, number]>;
      const centroid = getCentroid(coordinates);
      return { success: true, centroid };
    }

    default:
      throw new Error(`Unknown A2Map tool: ${name}`);
  }
}
