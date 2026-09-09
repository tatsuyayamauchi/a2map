import type { A2MapSpec } from "./types.js";
import { safeParseA2MapSpec } from "./schema.js";

/**
 * Progressive streaming parser for A2Map specification updates.
 * Accumulates JSON patches or complete specs from agent streams.
 */
export class A2MapStreamConsumer {
  private buffer = "";
  private onSpecUpdate: (spec: A2MapSpec) => void;

  constructor(onSpecUpdate: (spec: A2MapSpec) => void) {
    this.onSpecUpdate = onSpecUpdate;
  }

  /**
   * Consumes a streamed text chunk (e.g. from SSE or WebSocket).
   */
  public pushChunk(chunk: string): void {
    this.buffer += chunk;
    this.tryParse();
  }

  /**
   * Resets consumer buffer.
   */
  public reset(): void {
    this.buffer = "";
  }

  private tryParse(): void {
    // Look for JSON object enclosed in ```json ... ``` or raw {...}
    const jsonMatch =
      this.buffer.match(/```json\s*([\s\S]*?)\s*```/) || this.buffer.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) return;

    try {
      const candidate = JSON.parse(jsonMatch[1]);
      const result = safeParseA2MapSpec(candidate);
      if (result.success) {
        this.onSpecUpdate(result.data as A2MapSpec);
      }
    } catch {
      // Chunk may still be incomplete, wait for subsequent chunks
    }
  }
}
