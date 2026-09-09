import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { a2MapSpecSchema } from "../dist/schema.js";
import { ALL_A2MAP_TOOLS } from "../dist/tools.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const schemaDir = path.resolve(rootDir, "schema");

if (!fs.existsSync(schemaDir)) {
  fs.mkdirSync(schemaDir, { recursive: true });
}

// 1. Export A2MapSpec JSON Schema
const specJsonSchema = z.toJSONSchema(a2MapSpecSchema, { io: "input" });
specJsonSchema.title = "A2MapSpec";
specJsonSchema.description =
  "Agent-to-Map UI (A2Map) declarative geospatial map specification schema for generative AI agents.";
specJsonSchema.$id =
  "https://raw.githubusercontent.com/tatsuyayamauchi/a2map/main/schema/a2map.schema.json";

const specPath = path.resolve(schemaDir, "a2map.schema.json");
fs.writeFileSync(specPath, JSON.stringify(specJsonSchema, null, 2) + "\n", "utf-8");
console.log(`[export-schema] Successfully wrote ${path.relative(rootDir, specPath)}`);

// 2. Export A2Map LLM Agent Tools Schema (OpenAI / JSON Schema format)
const toolsJsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://raw.githubusercontent.com/tatsuyayamauchi/a2map/main/schema/a2map-tools.schema.json",
  title: "A2MapAgentTools",
  description:
    "Standard LLM Function Calling tool definitions for controlling A2Map from any backend (Go, Python, etc.).",
  tools: ALL_A2MAP_TOOLS,
};

const toolsPath = path.resolve(schemaDir, "a2map-tools.schema.json");
fs.writeFileSync(toolsPath, JSON.stringify(toolsJsonSchema, null, 2) + "\n", "utf-8");
console.log(`[export-schema] Successfully wrote ${path.relative(rootDir, toolsPath)}`);
