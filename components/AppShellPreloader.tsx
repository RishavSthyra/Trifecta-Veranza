"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

type IdleCapableWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (
      callback: IdleRequestCallback,
      options?: IdleRequestOptions,
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

type NetworkInfo = {
  effectiveType?: string;
  saveData?: boolean;
};

const preloadedAssets = new Set<string>();
const prefetchedRoutes = new Set<string>();

const routeTargets = ["/", "/project-overview", "/master-plan", "/area-map"];

const mediaAssets = [
  "/FALLBACK.png",
  "/plan%20image.webp",
  "/HERO_BG_2.mp4",
  "/master_plan_video.webm",
  "/master_plan_idle_loop.webm",
  "/master_plan_video_reverse.webm",
];

function getPrioritizedAssets(pathname: string) {
  if (pathname === "/") {
    return [
      "/FALLBACK.png",
      "/plan%20image.webp",
      "/master_plan_video.webm",
      "/master_plan_idle_loop.webm",
      "/master_plan_video_reverse.webm",
      "/HERO_BG_2.mp4",
    ];
  }

  if (pathname === "/master-plan") {
    return [
      "/plan%20image.webp",
      "/master_plan_idle_loop.webm",
      "/master_plan_video_reverse.webm",
      "/HERO_BG_2.mp4",
      "/FALLBACK.png",
    ];
  }

  return mediaAssets;
}

async function warmAsset(url: string, signal: AbortSignal) {
  const response = await fetch(url, {
    cache: "force-cache",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to preload ${url}`);
  }

  await response.blob();
  preloadedAssets.add(url);
}

export default function AppShellPreloader() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname.startsWith("/admin")) {
      return;
    }

    const connection = (navigator as Navigator & {
      connection?: NetworkInfo;
    }).connection;

    if (
      connection?.saveData ||
      connection?.effectiveType === "slow-2g" ||
      connection?.effectiveType === "2g"
    ) {
      return;
    }

    const controller = new AbortController();
    const idleWindow = window as IdleCapableWindow;
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;
    let idleId: number | null = null;

    const startPreloading = () => {
      void (async () => {
        for (const route of routeTargets) {
          if (route !== pathname && !prefetchedRoutes.has(route)) {
            router.prefetch(route);
            prefetchedRoutes.add(route);
          }
        }

        for (const asset of getPrioritizedAssets(pathname)) {
          if (controller.signal.aborted || preloadedAssets.has(asset)) {
            continue;
          }

          try {
            await warmAsset(asset, controller.signal);
            await new Promise<void>((resolve) => {
              timeoutId = globalThis.setTimeout(resolve, 150);
            });
          } catch (error) {
            if (controller.signal.aborted) {
              return;
            }

            console.warn(error);
          }
        }
      })();
    };

    if (typeof idleWindow.requestIdleCallback === "function") {
      idleId = idleWindow.requestIdleCallback(startPreloading, {
        timeout: 1200,
      });
    } else {
      timeoutId = globalThis.setTimeout(startPreloading, 500);
    }

    return () => {
      controller.abort();

      if (
        idleId !== null &&
        typeof idleWindow.cancelIdleCallback === "function"
      ) {
        idleWindow.cancelIdleCallback(idleId);
      }

      if (timeoutId !== null) {
        globalThis.clearTimeout(timeoutId);
      }
    };
  }, [pathname, router]);

  return null;
}
