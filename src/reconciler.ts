import type {
  Map as MapLibreMap,
  GeoJSONSource,
  MapMouseEvent,
  IControl,
  ControlPosition,
} from "maplibre-gl";
import {
  NavigationControl,
  ScaleControl,
  FullscreenControl,
  GeolocateControl,
  AttributionControl,
} from "maplibre-gl";
import type { A2MapSpec, A2MapLayer, A2MapEvent } from "./types.js";
import { resolveBaseStyle } from "./constants.js";
import { A2MapOverlayManager } from "./markers.js";
import { escapeHtml } from "./sanitize.js";

export type A2MapEventListener = (event: A2MapEvent) => void;

/**
 * A2MapReconciler:
 * Declarative differential reconciliation engine for MapLibre GL JS.
 */
export class A2MapReconciler {
  private map: MapLibreMap;
  private currentSpec: A2MapSpec | null = null;
  private activeLayerIds = new Set<string>();
  private activeLayerDefs = new Map<string, A2MapLayer>();
  private onEvent: A2MapEventListener;
  private overlayManager: A2MapOverlayManager;
  private activeControls = new Map<string, IControl>();

  constructor(map: MapLibreMap, onEvent: A2MapEventListener) {
    this.map = map;
    this.onEvent = onEvent;
    this.overlayManager = new A2MapOverlayManager(map, onEvent);
    this.setupGlobalMapListeners();
  }

  /**
   * Reconciles the map with the incoming A2Map specification.
   */
  public reconcile(nextSpec: A2MapSpec): void {
    if (!this.map.isStyleLoaded()) {
      this.map.once("style.load", () => this.reconcile(nextSpec));
      return;
    }

    // 1. Reconcile Controls
    this.reconcileControls(nextSpec.canvas?.controls);

    // 2. Reconcile Interactions & Constraints
    this.reconcileInteractions(nextSpec.canvas);

    // 3. Reconcile Canvas & BaseStyle
    if (
      nextSpec.canvas?.baseStyle &&
      nextSpec.canvas.baseStyle !== this.currentSpec?.canvas?.baseStyle
    ) {
      const resolvedStyle = resolveBaseStyle(nextSpec.canvas.baseStyle);
      this.activeLayerIds.clear();
      this.activeLayerDefs.clear();
      this.map.setStyle(resolvedStyle as never);
      this.map.once("style.load", () => {
        this.applyPostStyleReconcile(nextSpec);
      });
    } else {
      this.applyPostStyleReconcile(nextSpec);
    }

    this.currentSpec = nextSpec;
  }

  private applyPostStyleReconcile(spec: A2MapSpec): void {
    // 3D Terrain
    if (spec.canvas?.terrain) {
      const terrain = spec.canvas.terrain;
      this.map.setTerrain({
        source: terrain.source,
        exaggeration: terrain.exaggeration ?? 1,
      });
    }

    // Layers
    this.reconcileLayers(spec.layers || []);

    // Markers & Popups
    this.overlayManager.reconcileMarkers(spec.markers || []);
    this.overlayManager.reconcilePopups(spec.popups || []);

    // Camera
    if (spec.canvas?.camera) {
      this.reconcileCamera(spec.canvas.camera);
    }
  }

  private reconcileControls(
    controlsConfig?: A2MapSpec["canvas"] extends undefined
      ? never
      : NonNullable<A2MapSpec["canvas"]>["controls"]
  ): void {
    const config = controlsConfig ?? { navigation: true, scale: true };

    const syncControl = (
      key: string,
      enabled: boolean | object | undefined,
      create: () => IControl,
      defaultPos: ControlPosition = "top-right"
    ) => {
      const isEnabled = Boolean(enabled);
      const existing = this.activeControls.get(key);

      if (isEnabled && !existing) {
        const ctrl = create();
        const pos =
          typeof enabled === "object" && "position" in enabled
            ? (enabled.position as ControlPosition)
            : defaultPos;
        this.map.addControl(ctrl, pos);
        this.activeControls.set(key, ctrl);
      } else if (!isEnabled && existing) {
        this.map.removeControl(existing);
        this.activeControls.delete(key);
      }
    };

    syncControl(
      "navigation",
      config.navigation,
      () =>
        new NavigationControl({
          visualizePitch:
            typeof config.navigation === "object"
              ? (config.navigation.visualizePitch ?? true)
              : true,
          showCompass:
            typeof config.navigation === "object" ? (config.navigation.showCompass ?? true) : true,
          showZoom:
            typeof config.navigation === "object" ? (config.navigation.showZoom ?? true) : true,
        }),
      "top-right"
    );

    syncControl(
      "scale",
      config.scale,
      () =>
        new ScaleControl({
          unit: typeof config.scale === "object" ? config.scale.unit || "metric" : "metric",
          maxWidth: typeof config.scale === "object" ? config.scale.maxWidth || 100 : 100,
        }),
      "bottom-right"
    );

    syncControl("fullscreen", config.fullscreen, () => new FullscreenControl(), "top-right");

    syncControl(
      "geolocate",
      config.geolocate,
      () =>
        new GeolocateControl({
          trackUserLocation:
            typeof config.geolocate === "object"
              ? (config.geolocate.trackUserLocation ?? true)
              : true,
        }),
      "top-right"
    );

    syncControl(
      "attribution",
      config.attribution,
      () =>
        new AttributionControl({
          compact:
            typeof config.attribution === "object" ? (config.attribution.compact ?? true) : true,
          customAttribution:
            typeof config.attribution === "object"
              ? config.attribution.customAttribution
              : undefined,
        }),
      "bottom-right"
    );
  }

  private reconcileInteractions(canvas?: A2MapSpec["canvas"]): void {
    if (!canvas) return;

    if (canvas.interactions) {
      const i = canvas.interactions;
      if (i.scrollZoom !== undefined) {
        if (i.scrollZoom) this.map.scrollZoom.enable();
        else this.map.scrollZoom.disable();
      }
      if (i.boxZoom !== undefined) {
        if (i.boxZoom) this.map.boxZoom.enable();
        else this.map.boxZoom.disable();
      }
      if (i.dragRotate !== undefined) {
        if (i.dragRotate) this.map.dragRotate.enable();
        else this.map.dragRotate.disable();
      }
      if (i.dragPan !== undefined) {
        if (i.dragPan) this.map.dragPan.enable();
        else this.map.dragPan.disable();
      }
      if (i.keyboard !== undefined) {
        if (i.keyboard) this.map.keyboard.enable();
        else this.map.keyboard.disable();
      }
      if (i.doubleClickZoom !== undefined) {
        if (i.doubleClickZoom) this.map.doubleClickZoom.enable();
        else this.map.doubleClickZoom.disable();
      }
      if (i.touchZoomRotate !== undefined) {
        if (i.touchZoomRotate) this.map.touchZoomRotate.enable();
        else this.map.touchZoomRotate.disable();
      }
      if (i.touchPitch !== undefined) {
        if (i.touchPitch) this.map.touchPitch.enable();
        else this.map.touchPitch.disable();
      }
    }

    if (canvas.minZoom !== undefined) this.map.setMinZoom(canvas.minZoom);
    if (canvas.maxZoom !== undefined) this.map.setMaxZoom(canvas.maxZoom);
    if (canvas.minPitch !== undefined) this.map.setMinPitch(canvas.minPitch);
    if (canvas.maxPitch !== undefined) this.map.setMaxPitch(canvas.maxPitch);
    if (canvas.maxBounds) this.map.setMaxBounds(canvas.maxBounds);
  }

  private reconcileCamera(camera: NonNullable<A2MapSpec["canvas"]>["camera"]): void {
    if (!camera) return;

    const padding = camera.padding
      ? {
          top: camera.padding.top ?? 0,
          bottom: camera.padding.bottom ?? 0,
          left: camera.padding.left ?? 0,
          right: camera.padding.right ?? 0,
        }
      : undefined;

    if (camera.bounds) {
      const [minLng, minLat, maxLng, maxLat] = camera.bounds;
      this.map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        {
          duration: camera.durationMs ?? 2000,
          padding: padding ?? 80,
        }
      );
      return;
    }

    if (camera.center) {
      const animType = camera.animation || "flyTo";
      const options = {
        center: camera.center,
        zoom: camera.zoom ?? this.map.getZoom(),
        pitch: camera.pitch ?? this.map.getPitch(),
        bearing: camera.bearing ?? this.map.getBearing(),
        duration: camera.durationMs ?? 2000,
        ...(padding ? { padding } : {}),
        essential: camera.essential ?? true,
      };

      if (animType === "jumpTo") {
        this.map.jumpTo(options);
      } else if (animType === "easeTo") {
        this.map.easeTo(options);
      } else {
        this.map.flyTo(options);
      }
    }
  }

  private resolveBeforeSublayerId(beforeId?: string): string | undefined {
    if (!beforeId) return undefined;
    if (this.map.getLayer(beforeId)) return beforeId;
    const candidates = [
      `${beforeId}-fill`,
      `${beforeId}-line-bg`,
      `${beforeId}-line`,
      `${beforeId}-circle`,
      `${beforeId}-extrusion`,
      `${beforeId}-heatmap`,
      `${beforeId}-raster`,
      `${beforeId}-symbol`,
    ];
    for (const cid of candidates) {
      if (this.map.getLayer(cid)) return cid;
    }
    return undefined;
  }

  private getSubLayerIds(layerId: string): string[] {
    const subLayerSuffixes = [
      "-fill",
      "-line-bg",
      "-line",
      "-extrusion",
      "-circle",
      "-heatmap",
      "-raster",
      "-symbol",
    ];
    return subLayerSuffixes.map((s) => `${layerId}${s}`).filter((id) => this.map.getLayer(id));
  }

  private reorderLayerSublayers(layerId: string, beforeSublayerId?: string): void {
    const subLayers = this.getSubLayerIds(layerId);
    for (const id of subLayers) {
      if (this.map.getLayer(id)) {
        try {
          this.map.moveLayer(id, beforeSublayerId);
        } catch {
          // Ignore if moving is unnecessary or fails
        }
      }
    }
  }

  private reconcileLayers(layers: A2MapLayer[]): void {
    const incomingIds = new Set(layers.map((l) => l.id));

    // Remove deleted layers
    for (const oldId of this.activeLayerIds) {
      if (!incomingIds.has(oldId)) {
        this.removeLayerGroup(oldId);
        this.activeLayerIds.delete(oldId);
        this.activeLayerDefs.delete(oldId);
      }
    }

    // Sort layers by zIndex (lower zIndex rendered first / underneath)
    // eslint-disable-next-line unicorn/no-array-sort
    const sortedLayers = [...layers].sort((a, b) => {
      const zA = a.zIndex ?? 0;
      const zB = b.zIndex ?? 0;
      return zA - zB;
    });

    // Add or update layers
    for (const layer of sortedLayers) {
      this.applyLayer(layer);
      this.activeLayerIds.add(layer.id);
      this.activeLayerDefs.set(layer.id, { ...layer });
    }
  }

  private applyLayer(layer: A2MapLayer): void {
    const sourceId = `a2map-src-${layer.id}`;
    const existingSource = this.map.getSource(sourceId);
    const prevDef = this.activeLayerDefs.get(layer.id);

    // If layer type changed, remove old layers first to recreate cleanly
    if (prevDef && prevDef.type !== layer.type) {
      this.removeLayerGroup(layer.id);
    }

    if (layer.source.type === "geojson" && layer.source.data) {
      const sourceData: GeoJSON.FeatureCollection =
        layer.source.data.type === "FeatureCollection"
          ? (layer.source.data as GeoJSON.FeatureCollection)
          : {
              type: "FeatureCollection",
              features: [
                layer.source.data.type === "Feature"
                  ? (layer.source.data as GeoJSON.Feature)
                  : {
                      type: "Feature",
                      properties: {},
                      geometry: layer.source.data as GeoJSON.Geometry,
                    },
              ],
            };

      if (
        existingSource &&
        "setData" in existingSource &&
        (!prevDef || prevDef.type === layer.type)
      ) {
        (existingSource as GeoJSONSource).setData(sourceData);
        // Differentially update layer styles, visibility, and stacking order
        this.updateMapLibreLayers(layer);
      } else {
        if (!this.map.getSource(sourceId)) {
          this.map.addSource(sourceId, {
            type: "geojson",
            data: sourceData,
          });
        }
        this.createMapLibreLayers(sourceId, layer);
      }
    } else if (layer.source.type === "raster" && layer.source.tiles) {
      if (!existingSource) {
        this.map.addSource(sourceId, {
          type: "raster",
          tiles: layer.source.tiles,
          tileSize: layer.source.tileSize || 256,
          attribution: layer.source.attribution,
        });

        const beforeSublayerId = this.resolveBeforeSublayerId(layer.beforeId);
        this.map.addLayer(
          {
            id: `${layer.id}-raster`,
            type: "raster",
            source: sourceId,
            layout: {
              visibility: layer.visible === false ? "none" : "visible",
            },
            paint: {
              "raster-opacity": layer.style?.opacity ?? 1.0,
            },
          },
          beforeSublayerId
        );
      } else {
        this.updateMapLibreLayers(layer);
      }
    }
  }

  private createMapLibreLayers(sourceId: string, layer: A2MapLayer): void {
    const style = layer.style || {};
    const baseColor = style.color || "#3b82f6";
    const strokeColor = style.strokeColor || baseColor;
    const strokeWidth = style.strokeWidth || 3.0;
    const opacity = style.opacity ?? 0.4;
    const visibility = layer.visible === false ? "none" : "visible";
    const beforeSublayerId = this.resolveBeforeSublayerId(layer.beforeId);

    switch (layer.type) {
      case "fill": {
        // Translucent polygon fill (bottom)
        this.map.addLayer(
          {
            id: `${layer.id}-fill`,
            type: "fill",
            source: sourceId,
            layout: { visibility },
            paint: {
              "fill-color": baseColor,
              "fill-opacity": opacity,
            },
          },
          beforeSublayerId
        );
        // High contrast shadow outline
        this.map.addLayer(
          {
            id: `${layer.id}-line-bg`,
            type: "line",
            source: sourceId,
            layout: { visibility },
            paint: {
              "line-color": "#000000",
              "line-width": strokeWidth + 2,
              "line-opacity": 0.5,
            },
          },
          beforeSublayerId
        );
        // Crisp color stroke (top)
        this.map.addLayer(
          {
            id: `${layer.id}-line`,
            type: "line",
            source: sourceId,
            layout: { visibility },
            paint: {
              "line-color": strokeColor,
              "line-width": strokeWidth,
              "line-opacity": 1.0,
            },
          },
          beforeSublayerId
        );
        break;
      }

      case "fill-extrusion": {
        this.map.addLayer(
          {
            id: `${layer.id}-extrusion`,
            type: "fill-extrusion",
            source: sourceId,
            layout: { visibility },
            paint: {
              "fill-extrusion-color": baseColor,
              "fill-extrusion-height": style.height || 20,
              "fill-extrusion-base": style.base || 0,
              "fill-extrusion-opacity": opacity,
            },
          },
          beforeSublayerId
        );
        break;
      }

      case "line": {
        this.map.addLayer(
          {
            id: `${layer.id}-line-bg`,
            type: "line",
            source: sourceId,
            layout: { visibility },
            paint: {
              "line-color": "#000000",
              "line-width": strokeWidth + 2,
              "line-opacity": 0.5,
            },
          },
          beforeSublayerId
        );
        this.map.addLayer(
          {
            id: `${layer.id}-line`,
            type: "line",
            source: sourceId,
            layout: { visibility },
            paint: {
              "line-color": strokeColor,
              "line-width": strokeWidth,
              "line-opacity": 1.0,
              ...(style.dashArray ? { "line-dasharray": style.dashArray } : {}),
            },
          },
          beforeSublayerId
        );
        break;
      }

      case "circle": {
        this.map.addLayer(
          {
            id: `${layer.id}-circle`,
            type: "circle",
            source: sourceId,
            layout: { visibility },
            paint: {
              "circle-radius": style.radius || 7,
              "circle-color": baseColor,
              "circle-stroke-width": strokeWidth,
              "circle-stroke-color": strokeColor || "#ffffff",
            },
          },
          beforeSublayerId
        );
        break;
      }

      case "heatmap": {
        this.map.addLayer(
          {
            id: `${layer.id}-heatmap`,
            type: "heatmap",
            source: sourceId,
            layout: { visibility },
            paint: {
              "heatmap-radius": style.radius || 25,
              "heatmap-opacity": opacity,
            },
          },
          beforeSublayerId
        );
        break;
      }

      case "symbol": {
        this.map.addLayer(
          {
            id: `${layer.id}-symbol`,
            type: "symbol",
            source: sourceId,
            layout: {
              visibility,
              "text-field": style.textField || ["get", "name"],
              "text-size": style.textSize || 12,
            },
            paint: {
              "text-color": style.textColor || "#ffffff",
              "text-halo-color": style.textHaloColor || "#000000",
              "text-halo-width": style.textHaloWidth || 1.5,
            },
          },
          beforeSublayerId
        );
        break;
      }
    }
  }

  private updateMapLibreLayers(layer: A2MapLayer): void {
    const style = layer.style || {};
    const baseColor = style.color || "#3b82f6";
    const strokeColor = style.strokeColor || baseColor;
    const strokeWidth = style.strokeWidth || 3.0;
    const opacity = style.opacity ?? 0.4;
    const visibility = layer.visible === false ? "none" : "visible";

    const prevDef = this.activeLayerDefs.get(layer.id);
    if (layer.beforeId !== undefined && prevDef?.beforeId !== layer.beforeId) {
      const beforeSublayerId = this.resolveBeforeSublayerId(layer.beforeId);
      this.reorderLayerSublayers(layer.id, beforeSublayerId);
    }

    const updateVisibility = (id: string) => {
      if (this.map.getLayer(id)) {
        this.map.setLayoutProperty(id, "visibility", visibility);
      }
    };

    switch (layer.type) {
      case "fill": {
        const bgId = `${layer.id}-line-bg`;
        const lineId = `${layer.id}-line`;
        const fillId = `${layer.id}-fill`;

        updateVisibility(bgId);
        updateVisibility(lineId);
        updateVisibility(fillId);

        if (this.map.getLayer(bgId)) {
          this.map.setPaintProperty(bgId, "line-width", strokeWidth + 2);
        }
        if (this.map.getLayer(lineId)) {
          this.map.setPaintProperty(lineId, "line-color", strokeColor);
          this.map.setPaintProperty(lineId, "line-width", strokeWidth);
        }
        if (this.map.getLayer(fillId)) {
          this.map.setPaintProperty(fillId, "fill-color", baseColor);
          this.map.setPaintProperty(fillId, "fill-opacity", opacity);
        }
        break;
      }

      case "fill-extrusion": {
        const id = `${layer.id}-extrusion`;
        updateVisibility(id);
        if (this.map.getLayer(id)) {
          this.map.setPaintProperty(id, "fill-extrusion-color", baseColor);
          this.map.setPaintProperty(id, "fill-extrusion-height", style.height || 20);
          this.map.setPaintProperty(id, "fill-extrusion-base", style.base || 0);
          this.map.setPaintProperty(id, "fill-extrusion-opacity", opacity);
        }
        break;
      }

      case "line": {
        const bgId = `${layer.id}-line-bg`;
        const lineId = `${layer.id}-line`;

        updateVisibility(bgId);
        updateVisibility(lineId);

        if (this.map.getLayer(bgId)) {
          this.map.setPaintProperty(bgId, "line-width", strokeWidth + 2);
        }
        if (this.map.getLayer(lineId)) {
          this.map.setPaintProperty(lineId, "line-color", strokeColor);
          this.map.setPaintProperty(lineId, "line-width", strokeWidth);
          if (style.dashArray) {
            this.map.setPaintProperty(lineId, "line-dasharray", style.dashArray);
          }
        }
        break;
      }

      case "circle": {
        const id = `${layer.id}-circle`;
        updateVisibility(id);
        if (this.map.getLayer(id)) {
          this.map.setPaintProperty(id, "circle-radius", style.radius || 7);
          this.map.setPaintProperty(id, "circle-color", baseColor);
          this.map.setPaintProperty(id, "circle-stroke-width", strokeWidth);
          this.map.setPaintProperty(id, "circle-stroke-color", strokeColor || "#ffffff");
        }
        break;
      }

      case "heatmap": {
        const id = `${layer.id}-heatmap`;
        updateVisibility(id);
        if (this.map.getLayer(id)) {
          this.map.setPaintProperty(id, "heatmap-radius", style.radius || 25);
          this.map.setPaintProperty(id, "heatmap-opacity", opacity);
        }
        break;
      }

      case "symbol": {
        const id = `${layer.id}-symbol`;
        updateVisibility(id);
        if (this.map.getLayer(id)) {
          this.map.setLayoutProperty(id, "text-field", style.textField || ["get", "name"]);
          this.map.setLayoutProperty(id, "text-size", style.textSize || 12);
          this.map.setPaintProperty(id, "text-color", style.textColor || "#ffffff");
          this.map.setPaintProperty(id, "text-halo-color", style.textHaloColor || "#000000");
          this.map.setPaintProperty(id, "text-halo-width", style.textHaloWidth || 1.5);
        }
        break;
      }

      case "raster": {
        const id = `${layer.id}-raster`;
        updateVisibility(id);
        if (this.map.getLayer(id)) {
          this.map.setPaintProperty(id, "raster-opacity", style.opacity ?? 1.0);
        }
        break;
      }
    }
  }

  private removeLayerGroup(layerId: string): void {
    const subLayerSuffixes = [
      "-fill",
      "-line",
      "-line-bg",
      "-extrusion",
      "-circle",
      "-heatmap",
      "-raster",
      "-symbol",
    ];
    for (const suffix of subLayerSuffixes) {
      const fullId = `${layerId}${suffix}`;
      if (this.map.getLayer(fullId)) {
        this.map.removeLayer(fullId);
      }
    }
    const sourceId = `a2map-src-${layerId}`;
    if (this.map.getSource(sourceId)) {
      this.map.removeSource(sourceId);
    }
  }

  private setupGlobalMapListeners(): void {
    this.map.on("click", (e: MapMouseEvent) => {
      const features = this.map.queryRenderedFeatures(e.point);
      if (features && features.length > 0) {
        const top = features[0];
        const layerId = top.layer?.id || "";
        this.onEvent({
          type: "feature_click",
          layerId,
          featureProperties: top.properties as Record<string, unknown>,
          coordinates: [Number(e.lngLat.lng.toFixed(5)), Number(e.lngLat.lat.toFixed(5))],
        });
      } else {
        this.onEvent({
          type: "map_click",
          coordinates: [Number(e.lngLat.lng.toFixed(5)), Number(e.lngLat.lat.toFixed(5))],
        });
      }
    });

    this.map.on("mousemove", (e: MapMouseEvent) => {
      const features = this.map.queryRenderedFeatures(e.point);
      if (features && features.length > 0) {
        const top = features[0];
        const layerId = top.layer?.id || "";

        // Check if layer has tooltip config
        const rawLayerId = layerId.replace(
          /-fill|-line|-line-bg|-extrusion|-circle|-heatmap|-raster|-symbol$/,
          ""
        );
        const matchedLayer = (this.currentSpec?.layers || []).find((l) => l.id === rawLayerId);

        if (matchedLayer?.tooltip) {
          const props = top.properties || {};
          let html = `<div class="a2map-tooltip-content">`;
          if (matchedLayer.tooltip.title) {
            html += `<div class="a2map-tooltip-title">${escapeHtml(matchedLayer.tooltip.title)}</div>`;
          }
          if (matchedLayer.tooltip.fields) {
            for (const key of matchedLayer.tooltip.fields) {
              if (props[key] !== undefined) {
                html += `<div><strong>${escapeHtml(key)}:</strong> ${escapeHtml(props[key])}</div>`;
              }
            }
          }
          html += `</div>`;
          this.overlayManager.showTooltip([e.lngLat.lng, e.lngLat.lat], html);
        }

        this.onEvent({
          type: "feature_hover",
          layerId,
          featureProperties: top.properties as Record<string, unknown>,
          coordinates: [Number(e.lngLat.lng.toFixed(5)), Number(e.lngLat.lat.toFixed(5))],
        });
      } else {
        this.overlayManager.hideTooltip();
      }
    });

    this.map.on("moveend", () => {
      const center = this.map.getCenter();
      const bounds = this.map.getBounds();
      this.onEvent({
        type: "camera_move_end",
        center: [Number(center.lng.toFixed(5)), Number(center.lat.toFixed(5))],
        zoom: Number(this.map.getZoom().toFixed(2)),
        pitch: Number(this.map.getPitch().toFixed(2)),
        bearing: Number(this.map.getBearing().toFixed(2)),
        bounds: [
          Number(bounds.getWest().toFixed(5)),
          Number(bounds.getSouth().toFixed(5)),
          Number(bounds.getEast().toFixed(5)),
          Number(bounds.getNorth().toFixed(5)),
        ],
      });
    });
  }

  public destroy(): void {
    for (const ctrl of this.activeControls.values()) {
      this.map.removeControl(ctrl);
    }
    this.activeControls.clear();

    for (const layerId of this.activeLayerIds) {
      this.removeLayerGroup(layerId);
    }
    this.activeLayerIds.clear();
    this.activeLayerDefs.clear();

    this.overlayManager.destroy();
  }
}
