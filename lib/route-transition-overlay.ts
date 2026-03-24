const SHOW_ROUTE_TRANSITION_OVERLAY_EVENT = "app:route-transition-overlay:show";
const HIDE_ROUTE_TRANSITION_OVERLAY_EVENT = "app:route-transition-overlay:hide";

type RouteTransitionOverlayDetail = {
  imageUrl: string;
};

export function showRouteTransitionOverlay(imageUrl: string) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<RouteTransitionOverlayDetail>(
      SHOW_ROUTE_TRANSITION_OVERLAY_EVENT,
      {
        detail: { imageUrl },
      },
    ),
  );
}

export function hideRouteTransitionOverlay() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new Event(HIDE_ROUTE_TRANSITION_OVERLAY_EVENT));
}

export {
  HIDE_ROUTE_TRANSITION_OVERLAY_EVENT,
  SHOW_ROUTE_TRANSITION_OVERLAY_EVENT,
};
export type { RouteTransitionOverlayDetail };
