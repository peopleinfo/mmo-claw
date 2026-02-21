import { useCallback, useEffect, useRef, useState } from "react";

import { POCKETPAW_API_DOCS_URL, POCKETPAW_VIEW_URL } from "../lib/pocketpaw";

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
  const hasShownViewRef = useRef(false);
  const [viewError, setViewError] = useState<string | null>(null);

  const showView = useCallback(async (): Promise<void> => {
    const el = containerRef.current;
    if (!el) return;

    const bounds = getElementWindowBounds(el);
    if (bounds.width <= 0 || bounds.height <= 0) return;

    try {
      const response = await window.desktopApi.showPocketpawView({
        bounds,
        url: POCKETPAW_VIEW_URL,
      });
      if (response.ok) {
        hasShownViewRef.current = true;
        setViewError(null);
        return;
      }

      hasShownViewRef.current = false;
      setViewError(response.error.message);
    } catch (error) {
      hasShownViewRef.current = false;
      setViewError(
        error instanceof Error
          ? error.message
          : "Unable to open PocketPaw view.",
      );
    }
  }, []);

  const hideView = useCallback(async () => {
    await window.desktopApi.hidePocketpawView();
  }, []);

  // Show the view on mount, hide on unmount.
  useEffect(() => {
    const animationFrameId = window.requestAnimationFrame(() => {
      void showView();
    });

    void showView();
    return () => {
      window.cancelAnimationFrame(animationFrameId);
      hasShownViewRef.current = false;
      void hideView();
    };
  }, [showView, hideView]);

  // Keep the native view sized to match the container via ResizeObserver.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      const bounds = getElementWindowBounds(el);
      if (bounds.width <= 0 || bounds.height <= 0) {
        return;
      }

      if (!hasShownViewRef.current) {
        void showView();
        return;
      }

      void window.desktopApi.resizePocketpawView(bounds);
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [showView]);

  return (
    <div className="pocketpaw-view-shell">
      <div className="pocketpaw-view-toolbar">
        <span className="pocketpaw-view-toolbar__url">{POCKETPAW_VIEW_URL}</span>
        <div className="pocketpaw-view-toolbar__actions">
          <button
            type="button"
            className="pocketpaw-view-toolbar__btn"
            title="Reload PocketPaw"
            onClick={() => void showView()}
          >
            Reload
          </button>
          <button
            type="button"
            className="pocketpaw-view-toolbar__btn"
            title="Open in external browser"
            onClick={() =>
              void window.desktopApi.openPocketpaw({ baseUrl: POCKETPAW_VIEW_URL })
            }
          >
            External
          </button>
          <button
            type="button"
            className="pocketpaw-view-toolbar__btn"
            title="Open PocketPaw API docs in external browser"
            onClick={() =>
              void window.desktopApi.openPocketpaw({ baseUrl: POCKETPAW_API_DOCS_URL })
            }
          >
            API Docs
          </button>
        </div>
      </div>
      {viewError ? (
        <p className="desktop-muted">
          PocketPaw view failed: {viewError}. Try External or API Docs.
        </p>
      ) : null}
      {/* This transparent div acts as the spatial anchor for the native view overlay. */}
      <div ref={containerRef} className="pocketpaw-view-stage" />
    </div>
  );
};
