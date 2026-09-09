import React, { useState } from "react";
import { A2MapViewer, type A2MapSpec, type A2MapEvent } from "../src/index.js";

interface PresetQuery {
  label: string;
  prompt: string;
}

const PRESET_QUERIES: PresetQuery[] = [
  {
    label: "🏙️ 渋谷の3D都市と主要スポット",
    prompt:
      "渋谷駅周辺を3Dビル群で表示し、スクランブル交差点や主要ランドマークにピンを立てて、凡例と歩行圏分析ボタンを出して",
  },
  {
    label: "🏯 大阪城公園と周辺緑地",
    prompt:
      "大阪城公園の天守閣にピンを立てて、公園の緑地エリアを緑色ポリゴンで囲んで、散策ルートのメトリクスを表示して",
  },
  {
    label: "🌋 阿蘇山カルデラと警戒ゾーン",
    prompt:
      "阿蘇山のカルデラを衛星写真で見せて、中岳火口を中心に半径2kmの警戒区域を赤色の二重枠線で囲って",
  },
  {
    label: "🌲 北海道・大雪山の森林保護区",
    prompt:
      "北海道の大雪山国立公園の山岳地帯を地形図（Topo）で表示し、原生林保護エリアを緑色ポリゴンで描画して",
  },
  {
    label: "🗼 パリのエッフェル塔とセーヌ川",
    prompt: "パリのエッフェル塔周辺を俯瞰して、ルーヴル美術館とエッフェル塔にピンを立てて",
  },
];

const INITIAL_SPEC: A2MapSpec = {
  version: "1.0",
  canvas: {
    baseStyle: "streets",
    camera: {
      center: [139.7006, 35.6591],
      zoom: 15.5,
      pitch: 58,
      bearing: -30,
      animation: "flyTo",
      durationMs: 2000,
    },
    controls: { navigation: true, scale: true, fullscreen: true },
  },
  layers: [
    {
      id: "shibuya-init-block",
      type: "fill-extrusion",
      source: {
        type: "geojson",
        data: {
          type: "Feature",
          properties: { name: "Shibuya Scramble Square", height: 230 },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [139.7015, 35.6585],
                [139.7028, 35.6585],
                [139.7028, 35.6595],
                [139.7015, 35.6595],
                [139.7015, 35.6585],
              ],
            ],
          },
        },
      },
      style: { color: "#38bdf8", height: 180, opacity: 0.85 },
      tooltip: { title: "ビル情報", fields: ["name", "height"] },
    },
  ],
  markers: [
    {
      id: "scramble-pin",
      coordinates: [139.7006, 35.6591],
      label: "渋谷スクランブル交差点",
      color: "#ef4444",
      popupHtml:
        "<h3>渋谷スクランブル交差点</h3><p>世界一有名な交差点。AIが指示に応じて自動生成しました。</p>",
    },
  ],
  widgets: [
    {
      id: "init-banner",
      type: "banner",
      position: "top-center",
      message:
        "💡 上部の入力欄に「大阪城」「沖縄の海」「清水寺」「Grand Canyon」など自由に話しかけてください",
      level: "info",
      durationMs: 6000,
    },
    {
      id: "init-legend",
      type: "legend",
      position: "bottom-left",
      title: "地図凡例",
      items: [{ label: "3Dビルディング (Extrusion)", color: "#38bdf8" }],
    },
  ],
};

/**
 * Example 5: Natural Language Prompt to Map (True LLM + Geocoding Integration)
 * Calls backend Gemini API + Nominatim Geocoding to autonomously synthesize A2MapSpec.
 */
export const NaturalLanguageToMapExample: React.FC = () => {
  const [inputText, setInputText] = useState("");
  const [currentPrompt, setCurrentPrompt] = useState("渋谷駅周辺を3Dビル群で表示して");
  const [currentSpec, setCurrentSpec] = useState<A2MapSpec>(INITIAL_SPEC);
  const [summaryText, setSummaryText] = useState<string>("初期サンプルを表示中");
  const [geocodedInfo, setGeocodedInfo] = useState<string | null>("渋谷区, 東京都");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showJsonInspector, setShowJsonInspector] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Request map generation from backend Gemini + Geocoding
  const executeGenerate = async (prompt: string) => {
    setIsGenerating(true);
    setErrorMessage(null);
    setCurrentPrompt(prompt);

    try {
      const response = await fetch("/api/a2map/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as {
        success: boolean;
        spec: A2MapSpec;
        summary: string;
        geocoded?: { displayName: string; lat: number; lon: number } | null;
      };

      if (data.spec) {
        setCurrentSpec(data.spec);
        setSummaryText(data.summary || "地図を自律生成しました");
        setGeocodedInfo(
          data.geocoded
            ? `${data.geocoded.displayName.split(",").slice(0, 3).join(", ")} (${data.geocoded.lon.toFixed(3)}, ${data.geocoded.lat.toFixed(3)})`
            : null
        );
      }
    } catch (err) {
      console.error("[NaturalLanguageToMap] Failed to generate map:", err);
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectPreset = (preset: PresetQuery) => {
    setInputText("");
    executeGenerate(preset.prompt);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    executeGenerate(inputText.trim());
  };

  const handleEvent = (event: A2MapEvent) => {
    if (event.type === "widget_action") {
      if (event.actionId === "calc-buffer") {
        // Expand buffer
        setCurrentSpec((prev) => ({
          ...prev,
          layers: [
            ...(prev.layers || []),
            {
              id: "dynamic-buffer-zone",
              type: "fill",
              source: {
                type: "geojson",
                data: {
                  type: "Feature",
                  properties: { name: "周辺500m バッファゾーン" },
                  geometry: {
                    type: "Polygon",
                    coordinates: [
                      [
                        [
                          (prev.canvas?.camera?.center?.[0] || 139.7) - 0.005,
                          (prev.canvas?.camera?.center?.[1] || 35.6) - 0.005,
                        ],
                        [
                          (prev.canvas?.camera?.center?.[0] || 139.7) + 0.005,
                          (prev.canvas?.camera?.center?.[1] || 35.6) - 0.005,
                        ],
                        [
                          (prev.canvas?.camera?.center?.[0] || 139.7) + 0.005,
                          (prev.canvas?.camera?.center?.[1] || 35.6) + 0.005,
                        ],
                        [
                          (prev.canvas?.camera?.center?.[0] || 139.7) - 0.005,
                          (prev.canvas?.camera?.center?.[1] || 35.6) + 0.005,
                        ],
                        [
                          (prev.canvas?.camera?.center?.[0] || 139.7) - 0.005,
                          (prev.canvas?.camera?.center?.[1] || 35.6) - 0.005,
                        ],
                      ],
                    ],
                  },
                },
              },
              style: { color: "#10b981", strokeColor: "#34d399", strokeWidth: 3, opacity: 0.3 },
            },
          ],
          widgets: [
            ...(prev.widgets || []),
            {
              id: "buffer-done-banner",
              type: "banner",
              position: "top-center",
              message: "✓ 周辺500mの解析バッファゾーンを動的展開しました！",
              level: "success",
              durationMs: 4000,
            },
          ],
        }));
      }
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
      {/* Top Prompt & Preset Toolbar */}
      <div
        style={{
          background: "#0f172a",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          padding: "12px 20px",
        }}
      >
        {/* Preset Queries */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            marginBottom: "10px",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 600 }}>
            指示例 (クリックですぐ試せます):
          </span>
          {PRESET_QUERIES.map((p) => (
            <button
              key={p.label}
              type="button"
              disabled={isGenerating}
              onClick={() => handleSelectPreset(p)}
              style={{
                background: currentPrompt === p.prompt ? "#2563eb" : "rgba(255,255,255,0.06)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.12)",
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "12px",
                cursor: isGenerating ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowJsonInspector(!showJsonInspector)}
            style={{
              marginLeft: "auto",
              background: showJsonInspector ? "#334155" : "rgba(255,255,255,0.08)",
              color: "#38bdf8",
              border: "1px solid rgba(56,189,248,0.3)",
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "12px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {showJsonInspector ? "✕ JSONを閉じる" : "📋 AI生成JSONを表示"}
          </button>
        </div>

        {/* Custom Input Bar */}
        <form onSubmit={handleCustomSubmit} style={{ display: "flex", gap: "10px" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <span
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "16px",
              }}
            >
              🎙️
            </span>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="任意の地名・施設名・指示を入力（例: 「大阪城公園を見せて」「清水寺にズームして」「那覇空港の滑走路を航空写真で」）"
              style={{
                width: "100%",
                padding: "8px 12px 8px 38px",
                borderRadius: "8px",
                background: "#1e293b",
                border: "1px solid #334155",
                color: "#fff",
                fontSize: "13px",
                boxSizing: "border-box",
              }}
            />
          </div>
          <button
            type="submit"
            disabled={isGenerating}
            style={{
              background: isGenerating ? "#475569" : "#10b981",
              color: "#fff",
              border: "none",
              padding: "0 20px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: isGenerating ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {isGenerating ? (
              <>
                <span className="spinner">⏳</span>
                <span>LLM思考 & ジオコーディング中...</span>
              </>
            ) : (
              <span>AI地図生成 ➔</span>
            )}
          </button>
        </form>

        {/* Status / Geocoded feedback banner */}
        {(summaryText || geocodedInfo || errorMessage) && (
          <div
            style={{
              marginTop: "8px",
              fontSize: "11px",
              display: "flex",
              gap: "12px",
              alignItems: "center",
            }}
          >
            {errorMessage && <span style={{ color: "#ef4444" }}>⚠️ {errorMessage}</span>}
            {!errorMessage && (
              <>
                <span style={{ color: "#38bdf8" }}>🤖 AI解析: {summaryText}</span>
                {geocodedInfo && (
                  <span
                    style={{
                      color: "#94a3b8",
                      background: "rgba(255,255,255,0.06)",
                      padding: "1px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    📍 ジオコーディング: {geocodedInfo}
                  </span>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Main Map View & Optional JSON Inspector */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex" }}>
        <div style={{ flex: 1, position: "relative", height: "100%" }}>
          <A2MapViewer spec={currentSpec} onEvent={handleEvent} />
        </div>

        {/* JSON Inspector Side Drawer */}
        {showJsonInspector && (
          <aside
            style={{
              width: "400px",
              height: "100%",
              background: "rgba(11, 15, 25, 0.96)",
              backdropFilter: "blur(12px)",
              borderLeft: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              flexDirection: "column",
              zIndex: 30,
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#38bdf8" }}>
                LLMが自律生成した A2MapSpec
              </span>
              <button
                type="button"
                onClick={() => setShowJsonInspector(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                ✕
              </button>
            </div>
            <pre
              style={{
                flex: 1,
                margin: 0,
                padding: "12px 16px",
                overflowY: "auto",
                fontSize: "11px",
                fontFamily: "monospace",
                color: "#e2e8f0",
                lineHeight: 1.45,
                background: "transparent",
              }}
            >
              {JSON.stringify(currentSpec, null, 2)}
            </pre>
          </aside>
        )}
      </div>
    </div>
  );
};
