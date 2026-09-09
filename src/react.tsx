import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { A2MapSpec, A2MapEvent, A2MapController } from "./types.js";
import { A2MapReconciler } from "./reconciler.js";
import { A2MapWidgetManager } from "./widgets.js";
import { createA2MapController } from "./camera.js";
import { resolveBaseStyle } from "./constants.js";
import "./a2map.css";

export interface A2MapViewerProps {
  spec: A2MapSpec;
  onEvent?: (event: A2MapEvent) => void;
  onMapReady?: (controller: A2MapController) => void;
  className?: string;
  style?: React.CSSProperties;
}

export type A2MapHandle = A2MapController;

/**
 * A2MapViewer:
 * React component wrapping declarative A2Map engine and MapLibre GL JS.
 */
export const A2MapViewer = forwardRef<A2MapHandle, A2MapViewerProps>(
  ({ spec, onEvent, onMapReady, className = "", style }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<MapLibreMap | null>(null);
    const reconcilerRef = useRef<A2MapReconciler | null>(null);
    const widgetManagerRef = useRef<A2MapWidgetManager | null>(null);

    const onEventRef = useRef(onEvent);
    useEffect(() => {
      onEventRef.current = onEvent;
    }, [onEvent]);

    const onMapReadyRef = useRef(onMapReady);
    useEffect(() => {
      onMapReadyRef.current = onMapReady;
    }, [onMapReady]);

    const specRef = useRef(spec);
    useEffect(() => {
      specRef.current = spec;
    }, [spec]);

    const controllerRef = useRef<A2MapController>(
      createA2MapController(
        () => mapRef.current,
        () => specRef.current
      )
    );

    useImperativeHandle(ref, () => controllerRef.current);

    // Initialize MapLibre Canvas
    useEffect(() => {
      if (!containerRef.current || !widgetContainerRef.current) return;

      const initialStyle = resolveBaseStyle(spec.canvas?.baseStyle);

      const map = new MapLibreMap({
        container: containerRef.current,
        style: initialStyle as never,
        center: spec.canvas?.camera?.center || [0, 20],
        zoom: spec.canvas?.camera?.zoom || 2,
        pitch: spec.canvas?.camera?.pitch || 0,
        bearing: spec.canvas?.camera?.bearing || 0,
        minZoom: spec.canvas?.minZoom,
        maxZoom: spec.canvas?.maxZoom,
        minPitch: spec.canvas?.minPitch,
        maxPitch: spec.canvas?.maxPitch,
        maxBounds: spec.canvas?.maxBounds,
        attributionControl: false, // Reconciler handles attribution
      });

      const reconciler = new A2MapReconciler(map, (event) => {
        onEventRef.current?.(event);
      });

      const widgetManager = new A2MapWidgetManager(widgetContainerRef.current, (event) => {
        onEventRef.current?.(event);
      });

      map.on("load", () => {
        map.resize();
        reconciler.reconcile(spec);
        widgetManager.reconcile(spec.widgets || []);
        onMapReadyRef.current?.(controllerRef.current);
      });

      const resizeObserver = new ResizeObserver(() => {
        map.resize();
      });
      resizeObserver.observe(containerRef.current);

      mapRef.current = map;
      reconcilerRef.current = reconciler;
      widgetManagerRef.current = widgetManager;

      return () => {
        resizeObserver.disconnect();
        widgetManager.destroy();
        reconciler.destroy();
        map.remove();
        mapRef.current = null;
        reconcilerRef.current = null;
        widgetManagerRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update on Spec Change
    useEffect(() => {
      if (reconcilerRef.current) {
        reconcilerRef.current.reconcile(spec);
      }
      if (widgetManagerRef.current) {
        widgetManagerRef.current.reconcile(spec.widgets || []);
      }
    }, [spec]);

    return (
      <div
        className={`a2map-root-container ${className}`}
        style={{ position: "relative", width: "100%", height: "100%", ...style }}
      >
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
        <div ref={widgetContainerRef} className="a2map-widget-overlay" />
      </div>
    );
  }
);

A2MapViewer.displayName = "A2MapViewer";
