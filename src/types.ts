import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { ControlPosition, Map as MapLibreMap } from "maplibre-gl";

/**
 * A2Map (Agent-to-Map UI) Protocol Specification
 * Open-source declarative protocol and controller for MapLibre GL JS.
 */

export type A2MapProjection = "mercator" | "globe";

export type A2MapBaseStyle = "satellite" | "topo" | "streets" | "dark" | "light" | string | object;

export interface A2MapCameraPadding {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

export interface A2MapCamera {
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  pitch?: number;
  bearing?: number;
  bounds?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  padding?: A2MapCameraPadding;
  animation?: "flyTo" | "jumpTo" | "easeTo";
  durationMs?: number;
  essential?: boolean;
}

export interface A2MapTerrainConfig {
  source: string;
  exaggeration?: number;
}

export interface A2MapControlsConfig {
  navigation?:
    | boolean
    | {
        showCompass?: boolean;
        showZoom?: boolean;
        visualizePitch?: boolean;
        position?: ControlPosition;
      };
  scale?:
    | boolean
    | { maxWidth?: number; unit?: "metric" | "imperial" | "nautical"; position?: ControlPosition };
  fullscreen?: boolean | { position?: ControlPosition };
  geolocate?: boolean | { position?: ControlPosition; trackUserLocation?: boolean };
  attribution?:
    | boolean
    | { compact?: boolean; customAttribution?: string | string[]; position?: ControlPosition };
}

export interface A2MapInteractionsConfig {
  scrollZoom?: boolean;
  boxZoom?: boolean;
  dragRotate?: boolean;
  dragPan?: boolean;
  keyboard?: boolean;
  doubleClickZoom?: boolean;
  touchZoomRotate?: boolean;
  touchPitch?: boolean;
}

export interface A2MapCanvas {
  baseStyle?: A2MapBaseStyle;
  projection?: A2MapProjection;
  camera?: A2MapCamera;
  terrain?: A2MapTerrainConfig;
  controls?: A2MapControlsConfig;
  interactions?: A2MapInteractionsConfig;
  minZoom?: number;
  maxZoom?: number;
  minPitch?: number;
  maxPitch?: number;
  maxBounds?: [number, number, number, number];
}

export type A2MapLayerType =
  | "fill"
  | "line"
  | "circle"
  | "fill-extrusion"
  | "heatmap"
  | "raster"
  | "symbol";

export interface A2MapLayerStyle {
  color?: string;
  strokeColor?: string;
  strokeWidth?: number;
  opacity?: number;
  dashArray?: number[];
  height?: number; // 3D extrusion height
  base?: number; // 3D base elevation
  radius?: number; // Circle or Heatmap radius
  textField?: string;
  textSize?: number;
  textColor?: string;
  textHaloColor?: string;
  textHaloWidth?: number;
}

export interface A2MapTooltipConfig {
  fields?: string[]; // GeoJSON property keys to display
  title?: string;
  template?: string; // HTML or Markdown format
}

export interface A2MapLayer {
  id: string;
  type: A2MapLayerType;
  label?: string;
  source: {
    type: "geojson" | "raster";
    data?: Feature | FeatureCollection | Geometry;
    tiles?: string[];
    tileSize?: number;
    attribution?: string;
  };
  style?: A2MapLayerStyle;
  visible?: boolean;
  minZoom?: number;
  maxZoom?: number;
  interactive?: boolean;
  tooltip?: A2MapTooltipConfig;
}

export interface A2MapMarker {
  id: string;
  coordinates: [number, number];
  color?: string;
  label?: string;
  icon?: string;
  draggable?: boolean;
  popupHtml?: string;
  element?: HTMLElement;
}

export interface A2MapPopup {
  id: string;
  coordinates: [number, number];
  title?: string;
  content: string; // Text or HTML
  closeButton?: boolean;
  closeOnClick?: boolean;
  maxWidth?: string;
}

export type A2MapWidgetPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "top-center"
  | "bottom-center";

export interface A2MapLegendItem {
  label: string;
  color: string;
  shape?: "square" | "circle" | "line";
  description?: string;
}

export interface A2MapActionItem {
  id: string;
  label: string;
  icon?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  payload?: Record<string, unknown>;
}

export interface A2MapMetricItem {
  label: string;
  value: string | number;
  unit?: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
}

export type A2MapWidget =
  | {
      id: string;
      type: "legend";
      position?: A2MapWidgetPosition;
      title?: string;
      items: A2MapLegendItem[];
    }
  | {
      id: string;
      type: "action_panel";
      position?: A2MapWidgetPosition;
      title?: string;
      description?: string;
      actions: A2MapActionItem[];
    }
  | {
      id: string;
      type: "metrics_card";
      position?: A2MapWidgetPosition;
      title: string;
      metrics: A2MapMetricItem[];
    }
  | {
      id: string;
      type: "banner";
      position?: A2MapWidgetPosition;
      message: string;
      level?: "info" | "success" | "warning" | "alert";
      durationMs?: number;
    };

/**
 * Root A2Map Specification
 */
export interface A2MapSpec {
  version: "1.0";
  canvas?: A2MapCanvas;
  layers?: A2MapLayer[];
  markers?: A2MapMarker[];
  popups?: A2MapPopup[];
  widgets?: A2MapWidget[];
  metadata?: Record<string, unknown>;
}

/**
 * Events sent from Map back to the caller / agent
 */
export type A2MapEvent =
  | {
      type: "widget_action";
      actionId: string;
      widgetId: string;
      payload?: Record<string, unknown>;
    }
  | {
      type: "feature_click";
      layerId: string;
      featureProperties?: Record<string, unknown>;
      coordinates: [number, number];
    }
  | {
      type: "feature_hover";
      layerId: string;
      featureProperties?: Record<string, unknown>;
      coordinates: [number, number];
    }
  | {
      type: "marker_click";
      markerId: string;
      coordinates: [number, number];
    }
  | {
      type: "marker_drag_end";
      markerId: string;
      coordinates: [number, number];
    }
  | {
      type: "camera_move_end";
      center: [number, number];
      zoom: number;
      pitch: number;
      bearing: number;
      bounds: [number, number, number, number];
    }
  | {
      type: "map_click";
      coordinates: [number, number];
    };

/**
 * Programmatic controller interface for MapLibre GL
 */
export interface A2MapController {
  getMapInstance: () => MapLibreMap | null;
  flyTo: (options: A2MapCamera) => void;
  easeTo: (options: A2MapCamera) => void;
  jumpTo: (options: A2MapCamera) => void;
  fitBounds: (
    bounds: [number, number, number, number],
    options?: { padding?: A2MapCameraPadding; durationMs?: number }
  ) => void;
  panTo: (coordinates: [number, number], options?: { durationMs?: number }) => void;
  zoomIn: (options?: { durationMs?: number }) => void;
  zoomOut: (options?: { durationMs?: number }) => void;
  zoomTo: (zoom: number, options?: { durationMs?: number }) => void;
  rotateTo: (bearing: number, options?: { durationMs?: number }) => void;
  resetNorth: (options?: { durationMs?: number }) => void;
  resetNorthPitch: (options?: { durationMs?: number }) => void;
  resize: () => void;
}
