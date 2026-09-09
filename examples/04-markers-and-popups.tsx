import React, { useState } from "react";
import { A2MapViewer, type A2MapSpec, type A2MapEvent } from "../src/index.js";

/**
 * Example 4: Interactive Markers & Popups
 * Demonstrates draggable markers, popup content, and marker drag event handling.
 */
export const MarkersAndPopupsExample: React.FC = () => {
  const [markerPos, setMarkerPos] = useState<[number, number]>([139.767, 35.681]);

  const spec: A2MapSpec = {
    version: "1.0",
    canvas: {
      baseStyle: "streets",
      camera: {
        center: markerPos,
        zoom: 14,
      },
      controls: { navigation: true, scale: true },
    },
    markers: [
      {
        id: "draggable-sensor",
        coordinates: markerPos,
        color: "#ef4444",
        label: "Draggable Sensor Pin",
        draggable: true,
        popupHtml: `
          <div style="color: #0f172a; padding: 4px;">
            <h4 style="margin: 0 0 4px 0;">Observation Sensor #1</h4>
            <p style="margin: 0; font-size: 12px;">Drag to reposition coordinates.</p>
          </div>
        `,
      },
      {
        id: "fixed-hub",
        coordinates: [139.755, 35.685],
        color: "#10b981",
        label: "Central Logistics Hub",
        icon: "🏢",
        popupHtml: "<p>Stationary Control Center</p>",
      },
    ],
    popups: [
      {
        id: "info-bubble",
        coordinates: [139.775, 35.678],
        title: "Active Weather Station",
        content: "<p>Real-time telemetry online. Temperature: 22°C</p>",
        closeButton: true,
      },
    ],
  };

  const handleEvent = (event: A2MapEvent) => {
    if (event.type === "marker_drag_end" && event.markerId === "draggable-sensor") {
      setMarkerPos(event.coordinates);
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          zIndex: 20,
          background: "rgba(15,23,42,0.9)",
          color: "#fff",
          padding: "10px 14px",
          borderRadius: "8px",
          fontSize: "13px",
        }}
      >
        <strong>Sensor Position:</strong> [{markerPos[0]}, {markerPos[1]}] (Drag the red marker!)
      </div>
      <A2MapViewer spec={spec} onEvent={handleEvent} />
    </div>
  );
};
