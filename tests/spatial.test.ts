import { describe, it, expect } from "vitest";
import {
  calculateDistance,
  createBuffer,
  getCentroid,
  computeBBox,
  createPointFeature,
  createLineFeature,
} from "../src/spatial.js";

describe("spatial utilities", () => {
  it("calculates accurate geodesic distance using Haversine formula", () => {
    // Tokyo Station to Shinjuku Station is approximately 6.5 - 7.5 km
    const tokyoStation: [number, number] = [139.7671, 35.6812];
    const shinjukuStation: [number, number] = [139.7005, 35.6896];

    const distKm = calculateDistance(tokyoStation, shinjukuStation, "km");
    expect(distKm).toBeGreaterThan(6.0);
    expect(distKm).toBeLessThan(7.5);

    const distM = calculateDistance(tokyoStation, shinjukuStation, "m");
    expect(distM).toBeCloseTo(distKm * 1000, 0);
  });

  it("generates a closed circular buffer polygon", () => {
    const center: [number, number] = [139.7671, 35.6812];
    const radiusMeters = 1000;
    const bufferFeature = createBuffer(center, radiusMeters, 32);

    expect(bufferFeature.type).toBe("Feature");
    expect(bufferFeature.geometry.type).toBe("Polygon");
    const ring = bufferFeature.geometry.coordinates[0];
    // 32 steps + 1 closing coordinate = 33 coordinates
    expect(ring.length).toBe(33);
    // First and last coordinate must match (closed polygon)
    expect(ring[0]).toEqual(ring[ring.length - 1]);

    // Check distance of generated vertices to center is approx 1000m (+-15m)
    for (let i = 0; i < ring.length - 1; i++) {
      const vertexDist = calculateDistance(center, ring[i] as [number, number], "m");
      expect(Math.abs(vertexDist - radiusMeters)).toBeLessThan(15);
    }
  });

  it("computes geometric centroid for coordinates and geojson features", () => {
    const coords: Array<[number, number]> = [
      [10, 10],
      [20, 10],
      [20, 20],
      [10, 20],
    ];
    const centroid = getCentroid(coords);
    expect(centroid[0]).toBeCloseTo(15, 2);
    expect(centroid[1]).toBeCloseTo(15, 2);

    const pointFeature = createPointFeature([139.7, 35.6], { name: "Tokyo" });
    expect(pointFeature.geometry.coordinates).toEqual([139.7, 35.6]);
    expect(getCentroid(pointFeature)).toEqual([139.7, 35.6]);
  });

  it("computes bounding box for geometries and features", () => {
    const lineFeature = createLineFeature(
      [
        [139.0, 35.0],
        [140.0, 36.0],
      ],
      { name: "Route 1" }
    );
    const bbox = computeBBox(lineFeature);
    expect(bbox).toEqual([139.0, 35.0, 140.0, 36.0]);
  });
});
