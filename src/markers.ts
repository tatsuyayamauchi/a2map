import { Marker, Popup, type Map as MapLibreMap } from "maplibre-gl";
import type { A2MapMarker, A2MapPopup, A2MapEvent } from "./types.js";
import { escapeHtml, sanitizeHtml } from "./sanitize.js";

export class A2MapOverlayManager {
  private map: MapLibreMap;
  private onEvent: (event: A2MapEvent) => void;
  private activeMarkers = new Map<string, Marker>();
  private activeMarkerDefs = new Map<string, A2MapMarker>();
  private activePopups = new Map<string, Popup>();
  private activePopupDefs = new Map<string, A2MapPopup>();
  private hoverPopup: Popup | null = null;
  private markerAnimationFrames = new Map<string, number>();

  constructor(map: MapLibreMap, onEvent: (event: A2MapEvent) => void) {
    this.map = map;
    this.onEvent = onEvent;
  }

  private cancelMarkerAnimation(markerId: string): void {
    const frame = this.markerAnimationFrames.get(markerId);
    if (frame !== undefined && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(frame);
      this.markerAnimationFrames.delete(markerId);
    }
  }

  private animateMarkerCoordinates(
    markerId: string,
    marker: Marker,
    from: [number, number],
    to: [number, number],
    durationMs: number
  ): void {
    this.cancelMarkerAnimation(markerId);

    if (typeof requestAnimationFrame !== "function") {
      marker.setLngLat(to);
      return;
    }

    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      // Smooth easeInOutQuad easing
      const ease =
        progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      const currentLng = from[0] + (to[0] - from[0]) * ease;
      const currentLat = from[1] + (to[1] - from[1]) * ease;

      marker.setLngLat([currentLng, currentLat]);

      if (progress < 1) {
        this.markerAnimationFrames.set(markerId, requestAnimationFrame(step));
      } else {
        this.markerAnimationFrames.delete(markerId);
        marker.setLngLat(to);
      }
    };

    this.markerAnimationFrames.set(markerId, requestAnimationFrame(step));
  }

  public reconcileMarkers(markers: A2MapMarker[] = []): void {
    const incomingIds = new Set(markers.map((m) => m.id));

    // Remove deleted markers
    for (const [id, marker] of this.activeMarkers.entries()) {
      if (!incomingIds.has(id)) {
        this.cancelMarkerAnimation(id);
        marker.remove();
        this.activeMarkers.delete(id);
        this.activeMarkerDefs.delete(id);
      }
    }

    // Add or update markers
    for (const markerDef of markers) {
      const existingMarker = this.activeMarkers.get(markerDef.id);
      const prevDef = this.activeMarkerDefs.get(markerDef.id);

      if (!existingMarker) {
        const marker = this.createMarker(markerDef);
        this.activeMarkers.set(markerDef.id, marker);
        this.activeMarkerDefs.set(markerDef.id, { ...markerDef });
      } else {
        // Update coordinates
        if (
          !prevDef ||
          prevDef.coordinates[0] !== markerDef.coordinates[0] ||
          prevDef.coordinates[1] !== markerDef.coordinates[1]
        ) {
          if (markerDef.animateMovement && prevDef) {
            const duration =
              typeof markerDef.animateMovement === "object" &&
              typeof markerDef.animateMovement.durationMs === "number"
                ? markerDef.animateMovement.durationMs
                : 800;
            this.animateMarkerCoordinates(
              markerDef.id,
              existingMarker,
              prevDef.coordinates,
              markerDef.coordinates,
              duration
            );
          } else {
            this.cancelMarkerAnimation(markerDef.id);
            existingMarker.setLngLat(markerDef.coordinates);
          }
        }

        // Check if visuals or properties changed
        const visualsChanged =
          !prevDef ||
          prevDef.color !== markerDef.color ||
          prevDef.label !== markerDef.label ||
          prevDef.icon !== markerDef.icon ||
          prevDef.element !== markerDef.element;

        if (visualsChanged) {
          // Re-create marker for visual style changes to guarantee consistent DOM/SVG state
          existingMarker.remove();
          const newMarker = this.createMarker(markerDef);
          this.activeMarkers.set(markerDef.id, newMarker);
        } else {
          // Update draggable
          if (prevDef?.draggable !== markerDef.draggable) {
            existingMarker.setDraggable(markerDef.draggable ?? false);
          }

          // Update popup
          if (prevDef?.popupHtml !== markerDef.popupHtml) {
            if (markerDef.popupHtml) {
              const sanitizedPopup = sanitizeHtml(markerDef.popupHtml);
              const existingPopup = existingMarker.getPopup();
              if (existingPopup) {
                existingPopup.setHTML(sanitizedPopup);
              } else {
                existingMarker.setPopup(new Popup({ offset: 25 }).setHTML(sanitizedPopup));
              }
            } else {
              const existingPopup = existingMarker.getPopup();
              if (existingPopup) {
                existingPopup.remove();
              }
            }
          }
        }

        this.activeMarkerDefs.set(markerDef.id, { ...markerDef });
      }
    }
  }

  private createMarker(markerDef: A2MapMarker): Marker {
    let el = markerDef.element;
    if (!el && markerDef.label && typeof document !== "undefined") {
      el = document.createElement("div");
      el.className = "a2map-custom-marker";
      const sanitizedColor = escapeHtml(markerDef.color || "#3b82f6");
      const iconSpan = markerDef.icon ? `<span>${escapeHtml(markerDef.icon)}</span>` : "";
      const labelSpan = escapeHtml(markerDef.label);

      el.innerHTML = `
        <div class="a2map-marker-pin" style="background-color: ${sanitizedColor}">
          ${iconSpan}
        </div>
        <div class="a2map-marker-label">${labelSpan}</div>
      `;
    }

    const marker = new Marker({
      element: el,
      color: markerDef.color || "#3b82f6",
      draggable: markerDef.draggable ?? false,
    })
      .setLngLat(markerDef.coordinates)
      .addTo(this.map);

    if (markerDef.popupHtml) {
      const sanitizedPopup = sanitizeHtml(markerDef.popupHtml);
      const popup = new Popup({ offset: 25 }).setHTML(sanitizedPopup);
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

    return marker;
  }

  public reconcilePopups(popups: A2MapPopup[] = []): void {
    const incomingIds = new Set(popups.map((p) => p.id));

    // Remove deleted popups
    for (const [id, popup] of this.activePopups.entries()) {
      if (!incomingIds.has(id)) {
        popup.remove();
        this.activePopups.delete(id);
        this.activePopupDefs.delete(id);
      }
    }

    // Add or update popups
    for (const popupDef of popups) {
      let popup = this.activePopups.get(popupDef.id);
      const prevDef = this.activePopupDefs.get(popupDef.id);
      const sanitizedContent = sanitizeHtml(popupDef.content);

      if (!popup) {
        popup = new Popup({
          closeButton: popupDef.closeButton ?? true,
          closeOnClick: popupDef.closeOnClick ?? false,
          maxWidth: popupDef.maxWidth || "320px",
        })
          .setLngLat(popupDef.coordinates)
          .setHTML(sanitizedContent)
          .addTo(this.map);

        this.activePopups.set(popupDef.id, popup);
      } else {
        if (
          !prevDef ||
          prevDef.coordinates[0] !== popupDef.coordinates[0] ||
          prevDef.coordinates[1] !== popupDef.coordinates[1]
        ) {
          popup.setLngLat(popupDef.coordinates);
        }
        if (!prevDef || prevDef.content !== popupDef.content) {
          popup.setHTML(sanitizedContent);
        }
      }
      this.activePopupDefs.set(popupDef.id, { ...popupDef });
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
    // Content is pre-sanitized before passing to showTooltip
    this.hoverPopup.setLngLat(coordinates).setHTML(html).addTo(this.map);
  }

  public hideTooltip(): void {
    if (this.hoverPopup) {
      this.hoverPopup.remove();
    }
  }

  public destroy(): void {
    for (const id of Array.from(this.markerAnimationFrames.keys())) {
      this.cancelMarkerAnimation(id);
    }
    for (const m of this.activeMarkers.values()) {
      m.remove();
    }
    this.activeMarkers.clear();
    this.activeMarkerDefs.clear();

    for (const p of this.activePopups.values()) {
      p.remove();
    }
    this.activePopups.clear();
    this.activePopupDefs.clear();

    if (this.hoverPopup) {
      this.hoverPopup.remove();
      this.hoverPopup = null;
    }
  }
}
