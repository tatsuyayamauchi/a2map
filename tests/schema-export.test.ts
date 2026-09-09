import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("JSON Schema export", () => {
  const schemaPath = path.resolve(process.cwd(), "schema/a2map.schema.json");
  const toolsPath = path.resolve(process.cwd(), "schema/a2map-tools.schema.json");

  it("exports a valid a2map.schema.json", () => {
    expect(fs.existsSync(schemaPath)).toBe(true);
    const content = fs.readFileSync(schemaPath, "utf-8");
    const json = JSON.parse(content);

    expect(json.title).toBe("A2MapSpec");
    expect(json.type).toBe("object");
    expect(json.properties).toBeDefined();
    expect(json.properties.version).toBeDefined();
    expect(json.properties.canvas).toBeDefined();
    expect(json.properties.layers).toBeDefined();
    expect(json.properties.markers).toBeDefined();
    expect(json.properties.widgets).toBeDefined();
  });

  it("exports a valid a2map-tools.schema.json with 8 agent tools", () => {
    expect(fs.existsSync(toolsPath)).toBe(true);
    const content = fs.readFileSync(toolsPath, "utf-8");
    const json = JSON.parse(content);

    expect(json.title).toBe("A2MapAgentTools");
    expect(Array.isArray(json.tools)).toBe(true);
    expect(json.tools.length).toBe(8);

    const toolNames = json.tools.map((t: { name: string }) => t.name);
    expect(toolNames).toContain("render_map");
    expect(toolNames).toContain("fly_to_location");
    expect(toolNames).toContain("fit_bounds");
    expect(toolNames).toContain("add_markers");
    expect(toolNames).toContain("inspect_map");
    expect(toolNames).toContain("create_buffer");
    expect(toolNames).toContain("calculate_distance");
    expect(toolNames).toContain("get_centroid");
  });
});
