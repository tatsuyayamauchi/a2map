import type { A2MapWidget, A2MapEvent } from "./types.js";

export type WidgetEventCallback = (event: A2MapEvent) => void;

/**
 * Manages dynamic Generative UI widgets rendered over the MapLibre canvas.
 */
export class A2MapWidgetManager {
  private container: HTMLElement;
  private onEvent: WidgetEventCallback;
  private mountedWidgets = new Map<string, HTMLElement>();

  constructor(container: HTMLElement, onEvent: WidgetEventCallback) {
    this.container = container;
    this.onEvent = onEvent;
  }

  /**
   * Reconciles the list of widgets declared in the spec.
   */
  public reconcile(widgets: A2MapWidget[] = []): void {
    const incomingIds = new Set(widgets.map((w) => w.id));

    // Remove deleted widgets
    for (const [id, el] of this.mountedWidgets.entries()) {
      if (!incomingIds.has(id)) {
        el.remove();
        this.mountedWidgets.delete(id);
      }
    }

    // Render or update incoming widgets
    for (const widget of widgets) {
      let el = this.mountedWidgets.get(widget.id);
      if (!el) {
        el = document.createElement("div");
        el.className = `a2map-widget a2map-widget-${widget.type} a2map-pos-${widget.position || "bottom-left"}`;
        el.dataset.widgetId = widget.id;
        this.container.appendChild(el);
        this.mountedWidgets.set(widget.id, el);
      } else {
        el.className = `a2map-widget a2map-widget-${widget.type} a2map-pos-${widget.position || "bottom-left"}`;
      }

      this.renderWidgetContent(el, widget);
    }
  }

  public destroy(): void {
    for (const el of this.mountedWidgets.values()) {
      el.remove();
    }
    this.mountedWidgets.clear();
  }

  private renderWidgetContent(el: HTMLElement, widget: A2MapWidget): void {
    el.innerHTML = "";

    switch (widget.type) {
      case "legend": {
        const titleEl = document.createElement("div");
        titleEl.className = "a2map-legend-title";
        titleEl.textContent = widget.title || "Legend";
        el.appendChild(titleEl);

        const listEl = document.createElement("div");
        listEl.className = "a2map-legend-list";

        for (const item of widget.items) {
          const row = document.createElement("div");
          row.className = "a2map-legend-row";

          const colorDot = document.createElement("span");
          colorDot.className = "a2map-legend-dot";
          colorDot.style.backgroundColor = item.color;
          row.appendChild(colorDot);

          const label = document.createElement("span");
          label.className = "a2map-legend-label";
          label.textContent = item.label;
          row.appendChild(label);

          listEl.appendChild(row);
        }
        el.appendChild(listEl);
        break;
      }

      case "action_panel": {
        if (widget.title) {
          const title = document.createElement("div");
          title.className = "a2map-panel-title";
          title.textContent = widget.title;
          el.appendChild(title);
        }

        if (widget.description) {
          const desc = document.createElement("div");
          desc.className = "a2map-panel-desc";
          desc.textContent = widget.description;
          el.appendChild(desc);
        }

        const actionsContainer = document.createElement("div");
        actionsContainer.className = "a2map-panel-actions";

        for (const action of widget.actions) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = `a2map-btn a2map-btn-${action.variant || "secondary"}`;
          btn.textContent = `${action.icon ? action.icon + " " : ""}${action.label}`;
          if (action.disabled) {
            btn.disabled = true;
          }

          btn.addEventListener("click", () => {
            this.onEvent({
              type: "widget_action",
              widgetId: widget.id,
              actionId: action.id,
              payload: action.payload,
            });
          });

          actionsContainer.appendChild(btn);
        }
        el.appendChild(actionsContainer);
        break;
      }

      case "metrics_card": {
        const title = document.createElement("div");
        title.className = "a2map-metrics-title";
        title.textContent = widget.title;
        el.appendChild(title);

        const grid = document.createElement("div");
        grid.className = "a2map-metrics-grid";

        for (const m of widget.metrics) {
          const card = document.createElement("div");
          card.className = "a2map-metric-item";

          const label = document.createElement("div");
          label.className = "a2map-metric-label";
          label.textContent = m.label;
          card.appendChild(label);

          const val = document.createElement("div");
          val.className = "a2map-metric-val";
          val.textContent = `${m.value}${m.unit ? " " + m.unit : ""}`;
          card.appendChild(val);

          grid.appendChild(card);
        }
        el.appendChild(grid);
        break;
      }

      case "banner": {
        const banner = document.createElement("div");
        banner.className = `a2map-banner-inner a2map-banner-${widget.level || "info"}`;
        banner.textContent = widget.message;
        el.appendChild(banner);

        if (widget.durationMs) {
          setTimeout(() => {
            el.remove();
            this.mountedWidgets.delete(widget.id);
          }, widget.durationMs);
        }
        break;
      }
    }
  }
}
