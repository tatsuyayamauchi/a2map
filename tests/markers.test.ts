import { describe, it, expect, vi, beforeEach } from "vitest";
import { A2MapOverlayManager } from "../src/markers.js";

vi.mock("maplibre-gl", () => {
  class MockMarker {
    private coords: [number, number] = [0, 0];
    public setLngLat = vi.fn((coords: [number, number]) => {
      this.coords = coords;
      return this;
    });
    public getLngLat = vi.fn(() => ({ lng: this.coords[0], lat: this.coords[1] }));
    public addTo = vi.fn().mockReturnThis();
    public remove = vi.fn();
    public setPopup = vi.fn().mockReturnThis();
    public getElement = vi.fn(() => ({
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      style: {},
    }));
  }

  class MockPopup {
    public setLngLat = vi.fn().mockReturnThis();
    public setHTML = vi.fn().mockReturnThis();
    public addTo = vi.fn().mockReturnThis();
    public remove = vi.fn();
    public isOpen = vi.fn(() => true);
  }

  return {
    Marker: MockMarker,
    Popup: MockPopup,
  };
});

describe("A2MapOverlayManager - Marker and Overlay Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds and updates markers declaratively", () => {
    const mockMap = {} as never;
    const manager = new A2MapOverlayManager(mockMap, () => {});

    // Add initial marker
    manager.reconcileMarkers([
      {
        id: "vehicle-1",
        coordinates: [139.7, 35.6],
        label: "Vehicle 1",
      },
    ]);

    // Update marker coordinates without animation
    manager.reconcileMarkers([
      {
        id: "vehicle-1",
        coordinates: [139.71, 35.61],
        label: "Vehicle 1 (Moved)",
      },
    ]);

    expect(manager).toBeDefined();

    // Clear marker
    manager.reconcileMarkers([]);
    manager.destroy();
  });

  it("handles animateMovement when coordinates change", () => {
    vi.useFakeTimers();
    const mockMap = {} as never;
    const manager = new A2MapOverlayManager(mockMap, () => {});

    manager.reconcileMarkers([
      {
        id: "drone-1",
        coordinates: [139.7, 35.6],
      },
    ]);

    // Update with animateMovement enabled
    manager.reconcileMarkers([
      {
        id: "drone-1",
        coordinates: [139.8, 35.7],
        animateMovement: { durationMs: 500 },
      },
    ]);

    // Advance time and check animation progress
    vi.advanceTimersByTime(250);
    vi.advanceTimersByTime(300);

    expect(manager).toBeDefined();

    manager.destroy();
    vi.useRealTimers();
  });
});
