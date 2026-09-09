import { describe, it, expect, vi } from "vitest";
import { createA2MapController } from "../src/camera.js";

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
  getZoom: vi.fn(() => 10),
  getPitch: vi.fn(() => 30),
  getBearing: vi.fn(() => 15),
});

describe("createA2MapController", () => {
  it("handles null map gracefully without errors", () => {
    const controller = createA2MapController(() => null);
    expect(controller.getMapInstance()).toBeNull();

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
});
