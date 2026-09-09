import { describe, it, expect } from "vitest";
import { parseA2MapSpec, safeParseA2MapSpec, normalizeCoordinates } from "../src/schema.js";

describe("normalizeCoordinates", () => {
  it("keeps valid [lng, lat] coordinates intact", () => {
    expect(normalizeCoordinates([139.6917, 35.6895])).toEqual([139.6917, 35.6895]);
  });

  it("inverts inverted [lat, lng] when lat is in first position and lng is > 90", () => {
    // Tokyo: 35.6895 lat, 139.6917 lng
    expect(normalizeCoordinates([35.6895, 139.6917])).toEqual([139.6917, 35.6895]);
  });

  it("inverts inverted [lat, lng] when lng is < -90", () => {
    // Los Angeles: 34.0522 lat, -118.2437 lng
    expect(normalizeCoordinates([34.0522, -118.2437])).toEqual([-118.2437, 34.0522]);
  });
});

describe("parseA2MapSpec", () => {
  it("auto-fills missing version: '1.0'", () => {
    const raw = {
      canvas: {
        camera: { center: [139.7, 35.6], zoom: 12 },
      },
    };
    const parsed = parseA2MapSpec(raw);
    expect(parsed.version).toBe("1.0");
    expect(parsed.canvas?.camera?.center).toEqual([139.7, 35.6]);
  });

  it("coerces string numbers to actual numbers", () => {
    const raw = {
      canvas: {
        camera: {
          center: ["139.7", "35.6"],
          zoom: "14",
          pitch: "45",
          bearing: "0",
          durationMs: "2500",
        },
      },
      layers: [
        {
          id: "test-layer",
          type: "fill",
          source: { type: "geojson" },
          style: {
            strokeWidth: "4",
            opacity: "0.8",
          },
        },
      ],
    };

    const parsed = parseA2MapSpec(raw);
    expect(parsed.canvas?.camera?.zoom).toBe(14);
    expect(parsed.canvas?.camera?.pitch).toBe(45);
    expect(parsed.canvas?.camera?.durationMs).toBe(2500);
    expect(parsed.layers?.[0].style?.strokeWidth).toBe(4);
    expect(parsed.layers?.[0].style?.opacity).toBe(0.8);
  });

  it("auto-normalizes inverted marker coordinates", () => {
    const raw = {
      markers: [
        {
          id: "m1",
          coordinates: [35.6895, 139.6917], // inverted
          label: "Tokyo Station",
        },
      ],
    };

    const parsed = parseA2MapSpec(raw);
    expect(parsed.markers?.[0].coordinates).toEqual([139.6917, 35.6895]);
  });

  it("validates widgets correctly", () => {
    const raw = {
      widgets: [
        {
          id: "w1",
          type: "banner",
          message: "Alert!",
          level: "warning",
          durationMs: "5000",
        },
      ],
    };

    const parsed = parseA2MapSpec(raw);
    expect(parsed.widgets?.[0].type).toBe("banner");
  });

  it("returns error on invalid layer type", () => {
    const raw = {
      layers: [{ id: "l1", type: "invalid-type", source: { type: "geojson" } }],
    };
    const result = safeParseA2MapSpec(raw);
    expect(result.success).toBe(false);
  });
});
