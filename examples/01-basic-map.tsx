import React, { useRef, useState } from "react";
import { A2MapViewer, type A2MapSpec, type A2MapHandle } from "../src/index.js";

/**
 * Example 1: Basic Map & Camera Navigation
 * Demonstrates declarative camera settings, basemap switching,
 * controls configuration, and programmatic controller calls.
 */
export const BasicMapExample: React.FC = () => {
  const mapRef = useRef<A2MapHandle>(null);
  const [baseStyle, setBaseStyle] = useState<"topo" | "satellite" | "streets" | "dark">("topo");

  const spec: A2MapSpec = {
    version: "1.0",
    canvas: {
      baseStyle,
      camera: {
        center: [139.6917, 35.6895], // Tokyo
        zoom: 11,
        pitch: 30,
        bearing: 0,
        animation: "flyTo",
      },
      controls: {
        navigation: true,
        scale: true,
        fullscreen: true,
        geolocate: true,
      },
      interactions: {
        scrollZoom: true,
        dragPan: true,
        dragRotate: true,
      },
    },
  };

  const flyToLocation = (center: [number, number], zoom: number) => {
    mapRef.current?.flyTo({
      center,
      zoom,
      pitch: 45,
      durationMs: 2500,
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Top Navigation Toolbar */}
      <div
        style={{
          padding: "12px 16px",
          background: "#0f172a",
          color: "#fff",
          display: "flex",
          gap: "10px",
          alignItems: "center",
        }}
      >
        <strong>A2Map Example 1: Basic Navigation</strong>
        <select
          value={baseStyle}
          onChange={(e) =>
            setBaseStyle(e.target.value as "topo" | "satellite" | "streets" | "dark")
          }
          style={{
            padding: "6px 10px",
            borderRadius: "6px",
            background: "#1e293b",
            color: "#fff",
            border: "1px solid #334155",
          }}
        >
          <option value="topo">Topo (Color)</option>
          <option value="satellite">Satellite (Imagery)</option>
          <option value="streets">Streets (Light)</option>
          <option value="dark">Dark Matter</option>
        </select>
        <button
          onClick={() => flyToLocation([139.7671, 35.6812], 14)}
          style={{
            padding: "6px 12px",
            borderRadius: "6px",
            background: "#3b82f6",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          Fly to Tokyo Station
        </button>
        <button
          onClick={() => flyToLocation([-74.006, 40.7128], 12)}
          style={{
            padding: "6px 12px",
            borderRadius: "6px",
            background: "#3b82f6",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          Fly to New York
        </button>
        <button
          onClick={() => mapRef.current?.resetNorth()}
          style={{
            padding: "6px 12px",
            borderRadius: "6px",
            background: "#475569",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          Reset North
        </button>
      </div>

      {/* Map View */}
      <div style={{ flex: 1, position: "relative" }}>
        <A2MapViewer ref={mapRef} spec={spec} onEvent={(e) => console.log("Map Event:", e)} />
      </div>
    </div>
  );
};
