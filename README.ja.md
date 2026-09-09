# a2map (Agent-to-Map Protocol & Controller)

[English](./README.md) | **日本語**

> **MapLibre GL JS のための Agent-to-User-Interface (A2UI) プロトコル、コントローラー、および差分レンダラー。**

`a2map` は、生成 AI（LLM / AI エージェント）が地理空間地図のキャンバス全体（カメラ移動、ベクターレイヤー、3D 押し出し、熱マップ、マーカー、ポップアップ、動的 UI ウィジェット）を宣言的な JSON スキーマとして自律生成し、クライアント側でチラつきなくリアクティブに描画するためのオープンソースライブラリです。

---

## 🌟 主な機能

- **宣言的マッププロトコル (`A2MapSpec`)**:
  カメラ位置、ベースマップ、各種コントロール、レイヤー、マーカー、ウィジェットを安全で構造化された JSON のみで完全制御。
- **MapLibre GL の基本機能を網羅**:
  命令的なカメラ操作（`flyTo`, `easeTo`, `fitBounds`, `panTo`, `zoomIn`/`zoomOut`, `rotateTo`, `resetNorth`）、UI コントロール（ナビゲーション、スケールバー、フルスクリーン、現在地、著作権）、インタラクション制限（スクロールズーム、ドラッグパン等の個別トグル）、3D 地形、カスタムマーカー／ポップアップをサポート。
- **仮想 DOM 的な差分レンダラー (`A2MapReconciler`)**:
  GeoJSON やスタイルの更新時にレイヤーを破棄・再生成せず、差分のみ `source.setData()` で高速反映（チラつきのない描画を実現）。
- **生成的 UI ウィジェット (`A2MapWidgetManager`)**:
  凡例（Legend）、メトリクスカード（Metrics Card）、アクションパネル（Action Panel）、トーストバナー（Banner）を地図上にオーバーレイ配置。
- **双方向イベントループ (`A2MapEvent`)**:
  ユーザーの地図操作（クリック、ボタン押下、カメラ移動、マーカーのドラッグ）を検知し、AI エージェントへリアルタイムにフィードバック。
- **React 対応 (`<A2MapViewer />`)**:
  `ref` や `onMapReady` を通じて、宣言的な描画と命令的な `A2MapController` API をシームレスに利用可能。

---

## 📦 インストール

```bash
npm install a2map maplibre-gl
# または
pnpm add a2map maplibre-gl
```

---

## 🚀 クイックスタート

```tsx
import React, { useState, useRef } from "react";
import { A2MapViewer, type A2MapSpec, type A2MapEvent, type A2MapHandle } from "a2map";

export const App = () => {
  const mapRef = useRef<A2MapHandle>(null);

  const [spec, setSpec] = useState<A2MapSpec>({
    version: "1.0",
    canvas: {
      baseStyle: "topo", // "topo" | "satellite" | "streets" | "dark" | カスタムURL
      camera: {
        center: [139.6917, 35.6895], // 東京 [経度, 緯度]
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
            properties: { name: "解析対象エリア" },
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
          title: "エリア属性情報",
          fields: ["name"],
        },
      },
    ],
    markers: [
      {
        id: "hub-1",
        coordinates: [139.695, 35.69],
        label: "観測拠点",
        color: "#10b981",
        popupHtml: "<h3>中央ステーション</h3><p>稼働中</p>",
      },
    ],
    widgets: [
      {
        id: "main-legend",
        type: "legend",
        position: "bottom-left",
        title: "凡例",
        items: [{ label: "対象地域", color: "#3b82f6" }],
      },
      {
        id: "quick-actions",
        type: "action_panel",
        position: "bottom-right",
        title: "エージェントアクション",
        description: "AI エージェントに次の空間処理を依頼します",
        actions: [
          {
            id: "analyze-buffer",
            label: "5km バッファを計算",
            icon: "⚡",
            variant: "primary",
          },
        ],
      },
    ],
  });

  const handleMapEvent = (event: A2MapEvent) => {
    console.log("A2Map イベント受信:", event);
    if (event.type === "widget_action" && event.actionId === "analyze-buffer") {
      // エージェントにイベント情報を送信し、新しい A2MapSpec を受け取る
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <A2MapViewer
        ref={mapRef}
        spec={spec}
        onEvent={handleMapEvent}
        onMapReady={(controller) => {
          // 命令的なカメラ操作例:
          // controller.zoomIn();
        }}
      />
    </div>
  );
};
```

---

## 🕹️ コントローラー API (`A2MapController`)

React の `ref`（`A2MapHandle`）または `onMapReady` コールバックからアクセス可能です：

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

## 📂 実装例 (`examples/`)

具体的な利用シーンに合わせたサンプルコードを用意しています：

- [`examples/01-basic-map.tsx`](./examples/01-basic-map.tsx): 基本的なマップ表示、ベースマップ切り替え、カメラ移動、ナビゲーション操作
- [`examples/02-polygon-and-3d.tsx`](./examples/02-polygon-and-3d.tsx): 二重枠線ポリゴン、3D 押し出し立体表示（fill-extrusion）、ホバーツールチップ
- [`examples/03-agent-generative-ui.tsx`](./examples/03-agent-generative-ui.tsx): 凡例、メトリクスカード、アクションパネルと双方向フィードバックループ
- [`examples/04-markers-and-popups.tsx`](./examples/04-markers-and-popups.tsx): ドラッグ可能なピンマーカー、カスタム吹出しポップアップ、ドラッグ完了イベント
- [`examples/05-natural-language-to-map.tsx`](./examples/05-natural-language-to-map.tsx): **【目玉機能】自然言語（口頭・テキスト）指示から AI が地図スペック（A2MapSpec）を自律生成しリアルタイム描画するインタラクティブデモ**

---

## 📜 ライセンス

Apache-2.0
