"use client";

import { useEffect, useRef, useState } from "react";
import HeroSection from "@/components/sections/HeroSection";
import TrifectaPreloader from "@/components/ui/Preloader";
import {
  getMasterPlanFrameCdnUrl,
  getMasterPlanFramePreloadSequence,
  MASTER_PLAN_SCRUB_HQ_VIDEO_PATH,
} from "@/data/masterPlanFrameCdnUrls";

type IdleWindow = Window &
  typeof globalThis & {
    cancelIdleCallback?: (handle: number) => void;
    requestIdleCallback?: (
      callback: IdleRequestCallback,
      options?: IdleRequestOptions,
    ) => number;
  };

export default function HomePageClient() {
  const loaderStartedAtRef = useRef(0);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [heroReady, setHeroReady] = useState(false);

  useEffect(() => {
    loaderStartedAtRef.current =
      typeof window !== "undefined" ? window.performance.now() : Date.now();
  }, []);

  useEffect(() => {
    if (!heroReady) {
      return;
    }

    const now =
      typeof window !== "undefined" ? window.performance.now() : Date.now();
    const elapsed = now - loaderStartedAtRef.current;
    const remainingVisibleMs = Math.max(0, 1450 - elapsed);
    const timer = window.setTimeout(() => {
      setLoading(false);
    }, remainingVisibleMs + 260);

    return () => {
      window.clearTimeout(timer);
    };
  }, [heroReady]);

  useEffect(() => {
    if (typeof window === "undefined" || !loading) {
      return;
    }

    const idleWindow = window as IdleWindow;
    const createdLinks: HTMLLinkElement[] = [];
    const warmVideos: HTMLVideoElement[] = [];
    const abortController = new AbortController();

    const appendPreloadLink = (
      href: string,
      as: "fetch" | "image" | "video",
      crossOrigin?: "anonymous",
    ) => {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = as;
      link.href = href;

      if (crossOrigin) {
        link.crossOrigin = crossOrigin;
      }

      document.head.appendChild(link);
      createdLinks.push(link);
    };

    const warmVideoSource = (src: string) => {
      const video = document.createElement("video");
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";
      video.src = src;
      video.load();
      warmVideos.push(video);
    };

    appendPreloadLink(
      "https://cdn.sthyra.com/images/first_frame_again.png",
      "image",
    );
    appendPreloadLink(
      "https://res.cloudinary.com/dlhfbu3kh/video/upload/v1774905518/Tf_Fixed.mp4",
      "video",
      "anonymous",
    );
    appendPreloadLink(
      "https://res.cloudinary.com/dlhfbu3kh/video/upload/v1774906461/Tf_Fixed_Final_2.mp4",
      "video",
      "anonymous",
    );
    appendPreloadLink(MASTER_PLAN_SCRUB_HQ_VIDEO_PATH, "video", "anonymous");
    appendPreloadLink("/models/forglb.glb", "fetch");
    appendPreloadLink("/models/forglb%20-%20Copy.glb", "fetch");

    warmVideoSource(MASTER_PLAN_SCRUB_HQ_VIDEO_PATH);

    const warmMasterPlanAssets = () => {
      const frameUrls = getMasterPlanFramePreloadSequence(1, 10).map((frame) =>
        getMasterPlanFrameCdnUrl(frame),
      );

      frameUrls.forEach((url) => {
        const image = new Image();
        image.decoding = "async";
        image.src = url;
      });

      void fetch("/models/forglb.glb", {
        cache: "force-cache",
        signal: abortController.signal,
      }).catch(() => undefined);
      void fetch("/models/forglb%20-%20Copy.glb", {
        cache: "force-cache",
        signal: abortController.signal,
      }).catch(() => undefined);
    };

    let cleanupIdle: (() => void) | undefined;

    if (typeof idleWindow.requestIdleCallback === "function") {
      const idleId = idleWindow.requestIdleCallback(warmMasterPlanAssets, {
        timeout: 900,
      });
      cleanupIdle = () => {
        idleWindow.cancelIdleCallback?.(idleId);
      };
    } else {
      const timerId = window.setTimeout(warmMasterPlanAssets, 300);
      cleanupIdle = () => {
        window.clearTimeout(timerId);
      };
    }

    return () => {
      abortController.abort();
      cleanupIdle?.();
      createdLinks.forEach((link) => link.remove());
      warmVideos.forEach((video) => {
        video.pause();
        video.removeAttribute("src");
        video.load();
      });
    };
  }, [loading]);

  return (
    <>
      {loading ? <TrifectaPreloader progress={heroReady ? 100 : progress} /> : null}
      <main
        aria-hidden={loading}
        className={`app-screen overflow-hidden bg-neutral-950 text-white transition-opacity duration-300 ${
          loading ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <HeroSection
          onHeroReadyChange={setHeroReady}
          onHeroVideoProgressChange={(nextProgress) => {
            setProgress((currentProgress) => {
              if (heroReady) {
                return 100;
              }

              const targetValue = Math.round(
                Math.max(currentProgress, Math.min(nextProgress * 100, 96)),
              );
              const dampedStep = Math.max(
                1,
                Math.round((targetValue - currentProgress) * 0.45),
              );

              return Math.min(targetValue, currentProgress + dampedStep);
            });
          }}
        />
      </main>
    </>
  );
}
