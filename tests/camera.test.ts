import { describe, it, expect, vi } from "vitest";
import { createA2MapController, formatAgentContextAsPrompt } from "../src/camera.js";
import type { A2MapSpec } from "../src/types.js";

const createMockMap = () => ({
  flyTo: vi.fn(),
  easeTo: vi.fn(),
  jumpTo: vi.fn(),
  fitBounds: vi.fn(),
  panTo: vi.fn(),
  zoomIn: vi.fn(),
  zoomOut: vi.fn(),
  zoomTo: vi.fn(),
  rotateTo: vi.fn(),
  resetNorth: vi.fn(),
  resetNorthPitch: vi.fn(),
  resize: vi.fn(),
  getZoom: vi.fn(() => 10.5),
  getPitch: vi.fn(() => 30.0),
  getBearing: vi.fn(() => 15.0),
  getCenter: vi.fn(() => ({ lng: 139.6917, lat: 35.6895 })),
  getBounds: vi.fn(() => ({
    getWest: () => 139.6,
    getSouth: () => 35.6,
    getEast: () => 139.8,
    getNorth: () => 35.8,
  })),
  queryRenderedFeatures: vi.fn(() => [
    {
      layer: { id: "poi-layer" },
      geometry: { type: "Point" },
      properties: { name: "Tokyo Tower", height: 333 },
    },
  ]),
});

describe("createA2MapController", () => {
  it("handles null map gracefully without errors", () => {
    const controller = createA2MapController(() => null);
    expect(controller.getMapInstance()).toBeNull();
    expect(controller.getAgentContext()).toBeNull();

    expect(() => {
      controller.flyTo({ center: [139.7, 35.6] });
      controller.zoomIn();
      controller.fitBounds([139, 35, 140, 36]);
      controller.resize();
    }).not.toThrow();
  });

  it("calls flyTo with appropriate options", () => {
    const mockMap = createMockMap();
    const controller = createA2MapController(() => mockMap as never);

    controller.flyTo({
      center: [139.7, 35.6],
      zoom: 14,
      pitch: 45,
      bearing: 90,
      durationMs: 3000,
      padding: { top: 20, bottom: 20, left: 10, right: 10 },
    });

    expect(mockMap.flyTo).toHaveBeenCalledWith({
      center: [139.7, 35.6],
      zoom: 14,
      pitch: 45,
      bearing: 90,
      duration: 3000,
      essential: true,
      padding: { top: 20, bottom: 20, left: 10, right: 10 },
    });
  });

  it("calls fitBounds with coordinates and options", () => {
    const mockMap = createMockMap();
    const controller = createA2MapController(() => mockMap as never);

    controller.fitBounds([139.0, 35.0, 140.0, 36.0], {
      durationMs: 1500,
      padding: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    expect(mockMap.fitBounds).toHaveBeenCalledWith(
      [
        [139.0, 35.0],
        [140.0, 36.0],
      ],
      {
        duration: 1500,
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
      }
    );
  });

  it("calls zoomIn, zoomOut, zoomTo, rotateTo, panTo, and resize", () => {
    const mockMap = createMockMap();
    const controller = createA2MapController(() => mockMap as never);

    controller.zoomIn({ durationMs: 400 });
    expect(mockMap.zoomIn).toHaveBeenCalledWith({ duration: 400 });

    controller.zoomOut({ durationMs: 400 });
    expect(mockMap.zoomOut).toHaveBeenCalledWith({ duration: 400 });

    controller.zoomTo(16, { durationMs: 800 });
    expect(mockMap.zoomTo).toHaveBeenCalledWith(16, { duration: 800 });

    controller.rotateTo(180, { durationMs: 500 });
    expect(mockMap.rotateTo).toHaveBeenCalledWith(180, { duration: 500 });

    controller.panTo([139.7, 35.6], { durationMs: 600 });
    expect(mockMap.panTo).toHaveBeenCalledWith([139.7, 35.6], { duration: 600 });

    controller.resetNorth();
    expect(mockMap.resetNorth).toHaveBeenCalled();

    controller.resetNorthPitch();
    expect(mockMap.resetNorthPitch).toHaveBeenCalled();

    controller.resize();
    expect(mockMap.resize).toHaveBeenCalled();
  });

  it("returns comprehensive agent context with camera, layers, markers, and visible features", () => {
    const mockMap = createMockMap();
    const spec: A2MapSpec = {
      version: "1.0",
      layers: [
        {
          id: "route-layer",
          type: "line",
          label: "Bus Route",
          source: { type: "geojson" },
        },
      ],
      markers: [
        {
          id: "m1",
          coordinates: [139.7, 35.6],
          label: "Station",
        },
      ],
    };

    const controller = createA2MapController(
      () => mockMap as never,
      () => spec
    );

    const context = controller.getAgentContext();
    expect(context).not.toBeNull();
    expect(context?.camera.center).toEqual([139.6917, 35.6895]);
    expect(context?.camera.zoom).toBe(10.5);
    expect(context?.activeLayers).toHaveLength(1);
    expect(context?.activeLayers[0].id).toBe("route-layer");
    expect(context?.markers).toHaveLength(1);
    expect(context?.visibleFeatures).toHaveLength(1);
    expect(context?.visibleFeatures?.[0].properties.name).toBe("Tokyo Tower");
  });
});

describe("formatAgentContextAsPrompt", () => {
  it("formats context into readable markdown for LLM ingestion", () => {
    const context = {
      camera: {
        center: [139.7, 35.6] as [number, number],
        zoom: 14,
        pitch: 30,
        bearing: 0,
        bounds: [139.6, 35.5, 139.8, 35.7] as [number, number, number, number],
      },
      activeLayers: [{ id: "zones", type: "fill" as const, visible: true, label: "Hazard Zones" }],
      markers: [
        {
          id: "shelter-1",
          coordinates: [139.71, 35.62] as [number, number],
          label: "Evacuation Center",
        },
      ],
      visibleFeatures: [
        { layerId: "zones", geometryType: "Polygon", properties: { danger: "high" } },
      ],
    };

    const prompt = formatAgentContextAsPrompt(context);
    expect(prompt).toContain("### Current Map Viewport Context");
    expect(prompt).toContain("Center: [139.7, 35.6]");
    expect(prompt).toContain('`zones` (fill, visible, "Hazard Zones")');
    expect(prompt).toContain('`shelter-1` at [139.71, 35.62] ("Evacuation Center")');
    expect(prompt).toContain('[zones] (Polygon) { danger: "high" }');
  });

  it("handles null context safely", () => {
    expect(formatAgentContextAsPrompt(null)).toBe("Map viewport is currently unavailable.");
  });
});
