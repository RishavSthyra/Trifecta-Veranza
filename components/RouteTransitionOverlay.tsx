"use client";

import { useEffect, useRef, useState } from "react";
import {
  HIDE_ROUTE_TRANSITION_OVERLAY_EVENT,
  SHOW_ROUTE_TRANSITION_OVERLAY_EVENT,
  type RouteTransitionOverlayDetail,
} from "@/lib/route-transition-overlay";

const FADE_OUT_DURATION_MS = 220;

export default function RouteTransitionOverlay() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(
    null,
  );

  useEffect(() => {
    const clearHideTimeout = () => {
      if (hideTimeoutRef.current !== null) {
        globalThis.clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };

    const handleShow = (event: Event) => {
      const customEvent = event as CustomEvent<RouteTransitionOverlayDetail>;
      clearHideTimeout();
      setImageUrl(customEvent.detail.imageUrl);
      setIsVisible(true);
    };

    const handleHide = () => {
      setIsVisible(false);
      clearHideTimeout();
      hideTimeoutRef.current = globalThis.setTimeout(() => {
        setImageUrl(null);
      }, FADE_OUT_DURATION_MS);
    };

    window.addEventListener(
      SHOW_ROUTE_TRANSITION_OVERLAY_EVENT,
      handleShow as EventListener,
    );
    window.addEventListener(HIDE_ROUTE_TRANSITION_OVERLAY_EVENT, handleHide);

    return () => {
      clearHideTimeout();
      window.removeEventListener(
        SHOW_ROUTE_TRANSITION_OVERLAY_EVENT,
        handleShow as EventListener,
      );
      window.removeEventListener(
        HIDE_ROUTE_TRANSITION_OVERLAY_EVENT,
        handleHide,
      );
    };
  }, []);

  if (!imageUrl) return null;

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-[120] transition-opacity duration-200 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('${imageUrl}')` }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_34%,rgba(0,0,0,0.55)_100%)]" />
    </div>
  );
}
