import { describe, it, expect } from "vitest";
import { resolveBaseStyle, DEFAULT_BASE_STYLES } from "../src/constants.js";

describe("resolveBaseStyle", () => {
  it("defaults to topo style when undefined", () => {
    expect(resolveBaseStyle()).toEqual(DEFAULT_BASE_STYLES.topo);
    expect(resolveBaseStyle(undefined)).toEqual(DEFAULT_BASE_STYLES.topo);
  });

  it("resolves named preset styles", () => {
    expect(resolveBaseStyle("topo")).toEqual(DEFAULT_BASE_STYLES.topo);
    expect(resolveBaseStyle("satellite")).toEqual(DEFAULT_BASE_STYLES.satellite);
    expect(resolveBaseStyle("streets")).toEqual(DEFAULT_BASE_STYLES.streets);
    expect(resolveBaseStyle("dark")).toEqual(DEFAULT_BASE_STYLES.dark);
    expect(resolveBaseStyle("osm")).toEqual(DEFAULT_BASE_STYLES.osm);
  });

  it("passes through custom style URLs and objects", () => {
    const customUrl = "https://demotiles.maplibre.org/style.json";
    expect(resolveBaseStyle(customUrl)).toBe(customUrl);

    const customObj = { version: 8, sources: {}, layers: [] };
    expect(resolveBaseStyle(customObj)).toBe(customObj);
  });
});
