import { describe, it, expect, vi } from "vitest";
import { A2MapReconciler } from "../src/reconciler.js";
import type { A2MapSpec } from "../src/types.js";

vi.mock("maplibre-gl", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("maplibre-gl");
  class MockControl {
    onAdd() {
      return {};
    }
    onRemove() {}
  }
  return {
    ...actual,
    NavigationControl: MockControl,
    ScaleControl: MockControl,
    FullscreenControl: MockControl,
    GeolocateControl: MockControl,
    AttributionControl: MockControl,
  };
});

const createMockMap = () => {
  const layers = new Map<string, unknown>();
  const sources = new Map<string, unknown>();

  return {
    isStyleLoaded: vi.fn(() => true),
    once: vi.fn(),
    on: vi.fn(),
    addSource: vi.fn((id, src) => {
      const sourceObj = { ...src, setData: vi.fn() };
      sources.set(id, sourceObj);
      return sourceObj;
    }),
    getSource: vi.fn((id) => sources.get(id)),
    removeSource: vi.fn((id) => sources.delete(id)),
    addLayer: vi.fn((layer) => layers.set(layer.id, layer)),
    getLayer: vi.fn((id) => layers.get(id)),
    removeLayer: vi.fn((id) => layers.delete(id)),
    moveLayer: vi.fn(),
    setPaintProperty: vi.fn(),
    setLayoutProperty: vi.fn(),
    addControl: vi.fn(),
    removeControl: vi.fn(),
    getZoom: vi.fn(() => 10),
    getPitch: vi.fn(() => 0),
    getBearing: vi.fn(() => 0),
    getCenter: vi.fn(() => ({ lng: 0, lat: 0 })),
    getBounds: vi.fn(() => ({
      getWest: () => -10,
      getSouth: () => -10,
      getEast: () => 10,
      getNorth: () => 10,
    })),
    scrollZoom: { enable: vi.fn(), disable: vi.fn() },
    boxZoom: { enable: vi.fn(), disable: vi.fn() },
    dragRotate: { enable: vi.fn(), disable: vi.fn() },
    dragPan: { enable: vi.fn(), disable: vi.fn() },
    keyboard: { enable: vi.fn(), disable: vi.fn() },
    doubleClickZoom: { enable: vi.fn(), disable: vi.fn() },
    touchZoomRotate: { enable: vi.fn(), disable: vi.fn() },
    touchPitch: { enable: vi.fn(), disable: vi.fn() },
  };
};

describe("A2MapReconciler - Layer Ordering and Differential Updates", () => {
  it("sorts incoming layers by zIndex before adding", () => {
    const mockMap = createMockMap();
    const reconciler = new A2MapReconciler(mockMap as never, () => {});

    const spec: A2MapSpec = {
      version: "1.0",
      layers: [
        {
          id: "top-layer",
          type: "circle",
          zIndex: 10,
          source: { type: "geojson", data: { type: "FeatureCollection", features: [] } },
        },
        {
          id: "bottom-layer",
          type: "circle",
          zIndex: 1,
          source: { type: "geojson", data: { type: "FeatureCollection", features: [] } },
        },
      ],
    };

    reconciler.reconcile(spec);

    const addLayerCalls = mockMap.addLayer.mock.calls;
    // The first layer added should be bottom-layer (zIndex: 1), then top-layer (zIndex: 10)
    expect(addLayerCalls[0][0].id).toBe("bottom-layer-circle");
    expect(addLayerCalls[1][0].id).toBe("top-layer-circle");
  });

  it("passes beforeId target sublayer to addLayer", () => {
    const mockMap = createMockMap();
    const reconciler = new A2MapReconciler(mockMap as never, () => {});

    // First reconcile with existing-layer
    reconciler.reconcile({
      version: "1.0",
      layers: [
        {
          id: "existing-layer",
          type: "circle",
          source: { type: "geojson", data: { type: "FeatureCollection", features: [] } },
        },
      ],
    });

    // Now reconcile with a new layer placed before existing-layer
    reconciler.reconcile({
      version: "1.0",
      layers: [
        {
          id: "existing-layer",
          type: "circle",
          source: { type: "geojson", data: { type: "FeatureCollection", features: [] } },
        },
        {
          id: "new-layer",
          type: "circle",
          beforeId: "existing-layer",
          source: { type: "geojson", data: { type: "FeatureCollection", features: [] } },
        },
      ],
    });

    // Check addLayer for new-layer-circle received "existing-layer-circle" as second argument
    const newLayerCall = mockMap.addLayer.mock.calls.find((c) => c[0].id === "new-layer-circle");
    expect(newLayerCall).toBeDefined();
    expect(newLayerCall[1]).toBe("existing-layer-circle");
  });

  it("differentially updates paint properties on style change", () => {
    const mockMap = createMockMap();
    const reconciler = new A2MapReconciler(mockMap as never, () => {});

    // Step 1: Initial render
    reconciler.reconcile({
      version: "1.0",
      layers: [
        {
          id: "poly",
          type: "fill",
          source: { type: "geojson", data: { type: "FeatureCollection", features: [] } },
          style: { color: "#ff0000", opacity: 0.5 },
        },
      ],
    });

    // Step 2: Update color and opacity
    reconciler.reconcile({
      version: "1.0",
      layers: [
        {
          id: "poly",
          type: "fill",
          source: { type: "geojson", data: { type: "FeatureCollection", features: [] } },
          style: { color: "#00ff00", opacity: 0.9 },
        },
      ],
    });

    const source = mockMap.getSource("a2map-src-poly") as { setData: ReturnType<typeof vi.fn> };
    expect(source.setData).toHaveBeenCalled();
    expect(mockMap.setPaintProperty).toHaveBeenCalledWith("poly-fill", "fill-color", "#00ff00");
    expect(mockMap.setPaintProperty).toHaveBeenCalledWith("poly-fill", "fill-opacity", 0.9);
  });
});
