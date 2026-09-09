import { Marker, Popup, type Map as MapLibreMap } from "maplibre-gl";
import type { A2MapMarker, A2MapPopup, A2MapEvent } from "./types.js";

export class A2MapOverlayManager {
  private map: MapLibreMap;
  private onEvent: (event: A2MapEvent) => void;
  private activeMarkers = new Map<string, Marker>();
  private activePopups = new Map<string, Popup>();
  private hoverPopup: Popup | null = null;

  constructor(map: MapLibreMap, onEvent: (event: A2MapEvent) => void) {
    this.map = map;
    this.onEvent = onEvent;
  }

  public reconcileMarkers(markers: A2MapMarker[] = []): void {
    const incomingIds = new Set(markers.map((m) => m.id));

    // Remove deleted markers
    for (const [id, marker] of this.activeMarkers.entries()) {
      if (!incomingIds.has(id)) {
        marker.remove();
        this.activeMarkers.delete(id);
      }
    }

    // Add or update markers
    for (const markerDef of markers) {
      let marker = this.activeMarkers.get(markerDef.id);

      if (!marker) {
        let el = markerDef.element;
        if (!el && markerDef.label) {
          el = document.createElement("div");
          el.className = "a2map-custom-marker";
          el.innerHTML = `
            <div class="a2map-marker-pin" style="background-color: ${markerDef.color || "#3b82f6"}">
              ${markerDef.icon ? `<span>${markerDef.icon}</span>` : ""}
            </div>
            <div class="a2map-marker-label">${markerDef.label}</div>
          `;
        }

        marker = new Marker({
          element: el,
          color: markerDef.color || "#3b82f6",
          draggable: markerDef.draggable ?? false,
        })
          .setLngLat(markerDef.coordinates)
          .addTo(this.map);

        if (markerDef.popupHtml) {
          const popup = new Popup({ offset: 25 }).setHTML(markerDef.popupHtml);
          marker.setPopup(popup);
        }

        if (markerDef.draggable) {
          marker.on("dragend", () => {
            const lngLat = marker?.getLngLat();
            if (lngLat) {
              this.onEvent({
                type: "marker_drag_end",
                markerId: markerDef.id,
                coordinates: [Number(lngLat.lng.toFixed(5)), Number(lngLat.lat.toFixed(5))],
              });
            }
          });
        }

        const markerEl = marker.getElement();
        markerEl.addEventListener("click", () => {
          this.onEvent({
            type: "marker_click",
            markerId: markerDef.id,
            coordinates: markerDef.coordinates,
          });
        });

        this.activeMarkers.set(markerDef.id, marker);
      } else {
        marker.setLngLat(markerDef.coordinates);
      }
    }
  }

  public reconcilePopups(popups: A2MapPopup[] = []): void {
    const incomingIds = new Set(popups.map((p) => p.id));

    // Remove deleted popups
    for (const [id, popup] of this.activePopups.entries()) {
      if (!incomingIds.has(id)) {
        popup.remove();
        this.activePopups.delete(id);
      }
    }

    // Add or update popups
    for (const popupDef of popups) {
      let popup = this.activePopups.get(popupDef.id);
      if (!popup) {
        popup = new Popup({
          closeButton: popupDef.closeButton ?? true,
          closeOnClick: popupDef.closeOnClick ?? false,
          maxWidth: popupDef.maxWidth || "320px",
        })
          .setLngLat(popupDef.coordinates)
          .setHTML(popupDef.content)
          .addTo(this.map);

        this.activePopups.set(popupDef.id, popup);
      } else {
        popup.setLngLat(popupDef.coordinates);
        popup.setHTML(popupDef.content);
      }
    }
  }

  public showTooltip(coordinates: [number, number], html: string): void {
    if (!this.hoverPopup) {
      this.hoverPopup = new Popup({
        closeButton: false,
        closeOnClick: false,
        className: "a2map-hover-tooltip",
      });
    }
    this.hoverPopup.setLngLat(coordinates).setHTML(html).addTo(this.map);
  }

  public hideTooltip(): void {
    if (this.hoverPopup) {
      this.hoverPopup.remove();
    }
  }

  public destroy(): void {
    for (const m of this.activeMarkers.values()) {
      m.remove();
    }
    this.activeMarkers.clear();

    for (const p of this.activePopups.values()) {
      p.remove();
    }
    this.activePopups.clear();

    if (this.hoverPopup) {
      this.hoverPopup.remove();
      this.hoverPopup = null;
    }
  }
}
