# a2map (Agent-to-Map Protocol & Controller)

**English** | [日本語 (README.ja.md)](./README.ja.md)

> **Agent-to-User-Interface (A2UI) Protocol, Controller and Differential Renderer for MapLibre GL JS.**

`a2map` is a framework-agnostic protocol and React-ready renderer designed for Generative AI agents that interact with geospatial maps. It allows AI agents to declare and orchestrate the entire map canvas—including camera movements, vector layers, 3D extrusions, heatmaps, markers, popups, and generative UI widgets—using a declarative, safe JSON specification.

---

## Features

- **Declarative Map Protocol (`A2MapSpec`)**:
  Control camera, basemaps, controls, layers, markers, and widgets using safe, structured JSON.
- **Full MapLibre GL Capability**:
  Includes programmatic navigation (`flyTo`, `easeTo`, `fitBounds`, `panTo`, `zoomIn`/`zoomOut`, `rotateTo`, `resetNorth`), controls (`NavigationControl`, `ScaleControl`, `FullscreenControl`, `GeolocateControl`, `AttributionControl`), interaction toggles (`scrollZoom`, `dragPan`, etc.), 3D terrain, and custom markers/popups.
- **Virtual DOM-style Differential Reconciler (`A2MapReconciler`)**:
  Applies incremental GeoJSON and style updates without tearing down layers (`source.setData()`), ensuring zero-flicker transitions.
- **Generative UI Widgets (`A2MapWidgetManager`)**:
  Overlay dynamic legends, metrics cards, action buttons, and status banners directly onto the map canvas.
- **Bidirectional Map-to-Agent Event Loop (`A2MapEvent`)**:
  Captures user interactions (clicks, button actions, camera movements, marker drags) and relays them back to your AI agent.
- **React Ready (`<A2MapViewer />`)**:
  Ready-to-use React component with `ref` support exposing the full imperative `A2MapController`.

---

## Installation

```bash
npm install a2map maplibre-gl
# or
pnpm add a2map maplibre-gl
```

---

## Quick Start

```tsx
import React, { useState, useRef } from "react";
import { A2MapViewer, type A2MapSpec, type A2MapEvent, type A2MapHandle } from "a2map";

export const App = () => {
  const mapRef = useRef<A2MapHandle>(null);

  const [spec, setSpec] = useState<A2MapSpec>({
    version: "1.0",
    canvas: {
      baseStyle: "topo", // "topo" | "satellite" | "streets" | "dark" | custom style URL
      camera: {
        center: [139.6917, 35.6895], // Tokyo [lng, lat]
        zoom: 12,
        pitch: 45,
        bearing: 0,
        animation: "flyTo",
      },
      controls: {
        navigation: true,
        scale: true,
        fullscreen: true,
      },
      interactions: {
        scrollZoom: true,
        dragPan: true,
      },
    },
    layers: [
      {
        id: "sample-polygon",
        type: "fill",
        source: {
          type: "geojson",
          data: {
            type: "Feature",
            properties: { name: "Central District" },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [139.68, 35.68],
                  [139.71, 35.68],
                  [139.71, 35.7],
                  [139.68, 35.7],
                  [139.68, 35.68],
                ],
              ],
            },
          },
        },
        style: {
          color: "#3b82f6",
          strokeColor: "#60a5fa",
          strokeWidth: 3,
          opacity: 0.35,
        },
        tooltip: {
          title: "District Info",
          fields: ["name"],
        },
      },
    ],
    markers: [
      {
        id: "hub-1",
        coordinates: [139.695, 35.69],
        label: "Headquarters",
        color: "#10b981",
        popupHtml: "<h3>Main Hub</h3><p>Active Station</p>",
      },
    ],
    widgets: [
      {
        id: "main-legend",
        type: "legend",
        position: "bottom-left",
        title: "Layer Legend",
        items: [{ label: "Target Region", color: "#3b82f6" }],
      },
      {
        id: "quick-actions",
        type: "action_panel",
        position: "bottom-right",
        title: "Agent Actions",
        description: "Choose an action to prompt the AI agent",
        actions: [
          {
            id: "analyze-buffer",
            label: "Calculate 5km Buffer",
            icon: "⚡",
            variant: "primary",
          },
        ],
      },
    ],
  });

  const handleMapEvent = (event: A2MapEvent) => {
    console.log("A2Map Event Received:", event);
    if (event.type === "widget_action" && event.actionId === "analyze-buffer") {
      // Send event payload back to your AI agent
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <A2MapViewer
        ref={mapRef}
        spec={spec}
        onEvent={handleMapEvent}
        onMapReady={(controller) => {
          // Programmatic camera call example:
          // controller.zoomIn();
        }}
      />
    </div>
  );
};
```

---

## Imperative Controller API (`A2MapController`)

Access the controller via `ref` or `onMapReady`:

```typescript
interface A2MapController {
  getMapInstance: () => MapLibreMap | null;
  flyTo: (options: A2MapCamera) => void;
  easeTo: (options: A2MapCamera) => void;
  jumpTo: (options: A2MapCamera) => void;
  fitBounds: (
    bounds: [number, number, number, number],
    options?: { padding?: A2MapCameraPadding; durationMs?: number }
  ) => void;
  panTo: (coordinates: [number, number], options?: { durationMs?: number }) => void;
  zoomIn: (options?: { durationMs?: number }) => void;
  zoomOut: (options?: { durationMs?: number }) => void;
  zoomTo: (zoom: number, options?: { durationMs?: number }) => void;
  rotateTo: (bearing: number, options?: { durationMs?: number }) => void;
  resetNorth: (options?: { durationMs?: number }) => void;
  resetNorthPitch: (options?: { durationMs?: number }) => void;
  resize: () => void;
}
```

---

## Examples Directory (`examples/`)

Refer to the included example files for practical implementation recipes:

- [`examples/01-basic-map.tsx`](./examples/01-basic-map.tsx): Basic Map, basemap switching, camera animation, and navigation.
- [`examples/02-polygon-and-3d.tsx`](./examples/02-polygon-and-3d.tsx): High-contrast polygon stroke, 3D fill-extrusion, and hover tooltip.
- [`examples/03-agent-generative-ui.tsx`](./examples/03-agent-generative-ui.tsx): Dynamic generative UI widgets and agent feedback loop.
- [`examples/04-markers-and-popups.tsx`](./examples/04-markers-and-popups.tsx): Draggable pins, custom HTML markers, and popups.
- [`examples/05-natural-language-to-map.tsx`](./examples/05-natural-language-to-map.tsx): **Natural Language Prompt to Map (AI Agent autonomously synthesizes A2MapSpec and renders map in real-time).**

## 🌐 Multi-Language (Go, Python, etc.) Integration & JSON Schema

Because `a2map` is designed around a fully declarative JSON protocol, backends written in Go, Python, Rust, or any language can easily generate map specs and control the map.

### Exporting JSON Schema

```bash
pnpm schema:export
```

This exports standard JSON Schema (Draft 2020-12) files into the `schema/` directory:

- [`schema/a2map.schema.json`](./schema/a2map.schema.json): Complete specification schema for `A2MapSpec`.
- [`schema/a2map-tools.schema.json`](./schema/a2map-tools.schema.json): Standard Function Calling tool definitions (8 tools) for LLMs.

#### Example: Generating Go Structs

You can use [quicktype](https://github.com/glideapps/quicktype) or [go-jsonschema](https://github.com/omissis/go-jsonschema) to generate native Go structs:

```bash
# Generate Go structs using quicktype
npx quicktype -s schema -o a2map_spec.go schema/a2map.schema.json --package a2map
```

---

## License

Apache-2.0
