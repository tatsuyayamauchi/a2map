import React, { useState } from "react";
import { A2MapViewer, type A2MapSpec, type A2MapEvent } from "../src/index.js";

/**
 * Example 2: Vector Layers & 3D Extrusion
 * Demonstrates high-contrast outline polygons, 3D extruded geometry,
 * circle markers, and interactive hover tooltips.
 */
export const PolygonAnd3DExample: React.FC = () => {
  const [hoveredInfo, setHoveredInfo] = useState<string | null>(null);

  const spec: A2MapSpec = {
    version: "1.0",
    canvas: {
      baseStyle: "satellite",
      camera: {
        center: [139.75, 35.68],
        zoom: 14,
        pitch: 50,
        bearing: 25,
        animation: "flyTo",
      },
      controls: {
        navigation: true,
        scale: true,
      },
    },
    layers: [
      // 2D Base Boundary with high-contrast double outline
      {
        id: "district-boundary",
        type: "fill",
        source: {
          type: "geojson",
          data: {
            type: "Feature",
            properties: { name: "Outer District Area", category: "Zone A" },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [139.74, 35.675],
                  [139.765, 35.675],
                  [139.765, 35.69],
                  [139.74, 35.69],
                  [139.74, 35.675],
                ],
              ],
            },
          },
        },
        style: {
          color: "#3b82f6",
          strokeColor: "#60a5fa",
          strokeWidth: 3.5,
          opacity: 0.25,
        },
        tooltip: {
          title: "District Boundary",
          fields: ["name", "category"],
        },
      },
      // 3D Extruded Blocks (e.g. canopy heights or buildings)
      {
        id: "extruded-blocks",
        type: "fill-extrusion",
        source: {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: { name: "Sector 1 (Height: 45m)", height: 45 },
                geometry: {
                  type: "Polygon",
                  coordinates: [
                    [
                      [139.745, 35.68],
                      [139.752, 35.68],
                      [139.752, 35.686],
                      [139.745, 35.686],
                      [139.745, 35.68],
                    ],
                  ],
                },
              },
              {
                type: "Feature",
                properties: { name: "Sector 2 (Height: 80m)", height: 80 },
                geometry: {
                  type: "Polygon",
                  coordinates: [
                    [
                      [139.755, 35.681],
                      [139.762, 35.681],
                      [139.762, 35.687],
                      [139.755, 35.687],
                      [139.755, 35.681],
                    ],
                  ],
                },
              },
            ],
          },
        },
        style: {
          color: "#10b981",
          height: 60,
          opacity: 0.8,
        },
        tooltip: {
          title: "Extrusion Profile",
          fields: ["name", "height"],
        },
      },
    ],
  };

  const handleEvent = (event: A2MapEvent) => {
    if (event.type === "feature_hover" && event.featureProperties) {
      setHoveredInfo(JSON.stringify(event.featureProperties));
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {hoveredInfo && (
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            zIndex: 20,
            background: "rgba(0,0,0,0.8)",
            color: "#fff",
            padding: "8px 12px",
            borderRadius: "8px",
          }}
        >
          Hovered: {hoveredInfo}
        </div>
      )}
      <A2MapViewer spec={spec} onEvent={handleEvent} />
    </div>
  );
};
