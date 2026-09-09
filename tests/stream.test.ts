import { describe, it, expect, vi } from "vitest";
import { A2MapStreamConsumer } from "../src/stream.js";
import type { A2MapSpec } from "../src/types.js";

describe("A2MapStreamConsumer", () => {
  it("parses complete JSON object chunk", () => {
    const onSpec = vi.fn();
    const consumer = new A2MapStreamConsumer(onSpec);

    const validSpec: A2MapSpec = {
      version: "1.0",
      canvas: { baseStyle: "streets" },
    };

    consumer.pushChunk(JSON.stringify(validSpec));

    expect(onSpec).toHaveBeenCalledTimes(1);
    expect(onSpec).toHaveBeenCalledWith(validSpec);
  });

  it("parses JSON wrapped inside markdown code blocks", () => {
    const onSpec = vi.fn();
    const consumer = new A2MapStreamConsumer(onSpec);

    consumer.pushChunk("Here is the generated map:\n```json\n");
    consumer.pushChunk('{"version": "1.0", "canvas": {"baseStyle": "topo"}}\n```\nEnjoy!');

    expect(onSpec).toHaveBeenCalledTimes(1);
    expect(onSpec).toHaveBeenCalledWith({
      version: "1.0",
      canvas: { baseStyle: "topo" },
    });
  });

  it("accumulates progressive incomplete chunks until valid JSON arrives", () => {
    const onSpec = vi.fn();
    const consumer = new A2MapStreamConsumer(onSpec);

    consumer.pushChunk('{"version":');
    expect(onSpec).not.toHaveBeenCalled();

    consumer.pushChunk(' "1.0", "canvas":');
    expect(onSpec).not.toHaveBeenCalled();

    consumer.pushChunk(' {"baseStyle": "dark"}}');
    expect(onSpec).toHaveBeenCalledTimes(1);
    expect(onSpec).toHaveBeenCalledWith({
      version: "1.0",
      canvas: { baseStyle: "dark" },
    });
  });

  it("resets internal buffer on reset()", () => {
    const onSpec = vi.fn();
    const consumer = new A2MapStreamConsumer(onSpec);

    consumer.pushChunk('{"version": "1.');
    consumer.reset();
    consumer.pushChunk('{"version": "1.0"}');

    expect(onSpec).toHaveBeenCalledWith({ version: "1.0" });
  });

  it("ignores non-spec JSON without version 1.0", () => {
    const onSpec = vi.fn();
    const consumer = new A2MapStreamConsumer(onSpec);

    consumer.pushChunk('{"random": "value"}');
    expect(onSpec).not.toHaveBeenCalled();
  });
});
