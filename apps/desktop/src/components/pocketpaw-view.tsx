import { useCallback, useEffect, useRef } from "react";

const POCKETPAW_URL = "http://127.0.0.1:8888";

/**
 * Compute the bounds of an element relative to the native window's (0,0) origin,
 * accounting for devicePixelRatio so the WebContentsView aligns perfectly on
 * HiDPI displays.
 */
const getElementWindowBounds = (
  el: HTMLElement,
): { x: number; y: number; width: number; height: number } => {
  const rect = el.getBoundingClientRect();
  const dpr = window.devicePixelRatio ?? 1;

  return {
    x: Math.round(rect.left * dpr),
    y: Math.round(rect.top * dpr),
    width: Math.round(rect.width * dpr),
    height: Math.round(rect.height * dpr),
  };
};

export const PocketpawView = (): JSX.Element => {
  const containerRef = useRef<HTMLDivElement>(null);

  const showView = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;

    const bounds = getElementWindowBounds(el);
    if (bounds.width <= 0 || bounds.height <= 0) return;

    await window.desktopApi.showPocketpawView({ bounds, url: POCKETPAW_URL });
  }, []);

  const hideView = useCallback(async () => {
    await window.desktopApi.hidePocketpawView();
  }, []);

  // Show the view on mount, hide on unmount.
  useEffect(() => {
    void showView();
    return () => {
      void hideView();
    };
  }, [showView, hideView]);

  // Keep the native view sized to match the container via ResizeObserver.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      const bounds = getElementWindowBounds(el);
      if (bounds.width > 0 && bounds.height > 0) {
        void window.desktopApi.resizePocketpawView(bounds);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="pocketpaw-view-shell">
      <div className="pocketpaw-view-toolbar">
        <span className="pocketpaw-view-toolbar__url">{POCKETPAW_URL}</span>
        <div className="pocketpaw-view-toolbar__actions">
          <button
            type="button"
            className="pocketpaw-view-toolbar__btn"
            title="Reload PocketPaw"
            onClick={() => void showView()}
          >
            ↺ Reload
          </button>
          <button
            type="button"
            className="pocketpaw-view-toolbar__btn"
            title="Open in external browser"
            onClick={() =>
              void window.desktopApi.openPocketpaw({ baseUrl: POCKETPAW_URL })
            }
          >
            ↗ External
          </button>
        </div>
      </div>
      {/* This transparent div acts as the spatial anchor for the native view overlay. */}
      <div ref={containerRef} className="pocketpaw-view-stage" />
    </div>
  );
};
