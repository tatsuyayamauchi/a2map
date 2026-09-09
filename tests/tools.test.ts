import { describe, it, expect, vi } from "vitest";
import { getA2MapTools, executeA2MapToolCall } from "../src/tools.js";
import type { A2MapController } from "../src/types.js";

describe("getA2MapTools", () => {
  it("defaults to OpenAI tool format", () => {
    const tools = getA2MapTools() as Array<{ type: string; function: { name: string } }>;
    expect(tools.length).toBe(5);
    expect(tools[0].type).toBe("function");
    expect(tools[0].function.name).toBe("render_map");
  });

  it("formats tools for Gemini / Google ADK", () => {
    const tools = getA2MapTools({ format: "gemini" }) as Array<{
      name: string;
      parameters: object;
    }>;
    expect(tools.length).toBe(5);
    expect(tools[0].name).toBe("render_map");
    expect(tools[0].parameters).toBeDefined();
  });

  it("formats tools for Anthropic / Claude", () => {
    const tools = getA2MapTools({ format: "anthropic" }) as Array<{
      name: string;
      input_schema: object;
    }>;
    expect(tools.length).toBe(5);
    expect(tools[0].name).toBe("render_map");
    expect(tools[0].input_schema).toBeDefined();
  });

  it("filters tools by name when requested", () => {
    const tools = getA2MapTools({ tools: ["fly_to_location", "inspect_map"] }) as Array<{
      type: string;
      function: { name: string };
    }>;
    expect(tools.length).toBe(2);
    expect(tools.map((t) => t.function.name)).toEqual(["fly_to_location", "inspect_map"]);
  });
});

const createMockController = (): A2MapController => ({
  getMapInstance: vi.fn(),
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
  getAgentContext: vi.fn(() => ({
    camera: {
      center: [139.7, 35.6],
      zoom: 12,
      pitch: 0,
      bearing: 0,
      bounds: [139.5, 35.4, 139.9, 35.8],
    },
    activeLayers: [],
    markers: [],
  })),
});

describe("executeA2MapToolCall", () => {
  it("executes fly_to_location tool call", () => {
    const controller = createMockController();
    const result = executeA2MapToolCall(
      "fly_to_location",
      { center: [139.7, 35.6], zoom: 15, pitch: 45 },
      controller
    );

    expect(controller.flyTo).toHaveBeenCalledWith({
      center: [139.7, 35.6],
      zoom: 15,
      pitch: 45,
      bearing: undefined,
      durationMs: undefined,
    });
    expect(result).toEqual({ success: true, center: [139.7, 35.6] });
  });

  it("executes fit_bounds tool call", () => {
    const controller = createMockController();
    const result = executeA2MapToolCall(
      "fit_bounds",
      { bounds: [139.0, 35.0, 140.0, 36.0], durationMs: 1000 },
      controller
    );

    expect(controller.fitBounds).toHaveBeenCalledWith([139.0, 35.0, 140.0, 36.0], {
      durationMs: 1000,
      padding: undefined,
    });
    expect(result).toEqual({ success: true, bounds: [139.0, 35.0, 140.0, 36.0] });
  });

  it("executes inspect_map tool call", () => {
    const controller = createMockController();
    const result = executeA2MapToolCall("inspect_map", { includeFeatures: false }, controller) as {
      success: boolean;
      context: object;
    };

    expect(controller.getAgentContext).toHaveBeenCalledWith({
      includeFeatures: false,
      maxFeatures: 20,
    });
    expect(result.success).toBe(true);
    expect(result.context).toBeDefined();
  });

  it("executes render_map tool call and notifies specUpdater", () => {
    const controller = createMockController();
    const specUpdater = vi.fn();

    const result = executeA2MapToolCall(
      "render_map",
      {
        canvas: { baseStyle: "satellite" },
      },
      controller,
      specUpdater
    );

    expect(specUpdater).toHaveBeenCalledWith(
      expect.objectContaining({
        version: "1.0",
        canvas: { baseStyle: "satellite" },
      })
    );
    expect(result).toEqual({ success: true, message: "Map spec updated." });
  });

  it("throws on unknown tool name", () => {
    const controller = createMockController();
    expect(() => executeA2MapToolCall("non_existent_tool", {}, controller)).toThrow(
      "Unknown A2Map tool: non_existent_tool"
    );
  });
});
