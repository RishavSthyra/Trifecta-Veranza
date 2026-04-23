"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

const HERO_VIDEO_URL =
  "https://cdn.sthyra.com/videos/Hero%20Section%20Video%20A.mp4";
const HERO_FALLBACK_VIDEO_URL =
  "https://cdn.sthyra.com/videos/Hero%20Section%20Video%20A_MORE_2.mp4";
const HERO_LOOP_VIDEO_URL =
  "https://cdn.sthyra.com/videos/Hero%20Section%20Video%20B.mp4";
const HERO_VIDEO_FALLBACK_DELAY_MS = 2600;
const ENTRY_VIDEO_URL =
  "https://cdn.sthyra.com/videos/Tf%20Fixed%20Final_2.mp4";

type NavigatorConnectionLike = {
  effectiveType?: string;
  saveData?: boolean;
};

function getVideoLoadProgress(video: HTMLVideoElement) {
  const duration = video.duration;

  if (Number.isFinite(duration) && duration > 0 && video.buffered.length > 0) {
    const bufferedEnd = video.buffered.end(video.buffered.length - 1);
    return Math.max(0, Math.min(1, bufferedEnd / duration));
  }

  if (video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
    return 1;
  }

  if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    return 0.84;
  }

  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return 0.58;
  }

  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
    return 0.26;
  }

  return 0.08;
}

function shouldPreferFallbackHeroVideo() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const connection = (
    navigator as Navigator & { connection?: NavigatorConnectionLike }
  ).connection;

  return (
    connection?.saveData === true ||
    connection?.effectiveType === "slow-2g" ||
    connection?.effectiveType === "2g"
  );
}

function shouldPreferLightweightHeroVideo() {
  if (typeof window === "undefined") {
    return shouldPreferFallbackHeroVideo();
  }

  return (
    window.matchMedia("(max-width: 1024px)").matches ||
    shouldPreferFallbackHeroVideo()
  );
}

export default function HomePageClient() {
  const loaderStartedAtRef = useRef(0);
  const heroReadyRef = useRef(false);
  const heroObjectUrlRef = useRef<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [heroReady, setHeroReady] = useState(false);
  const [heroVideoSrc, setHeroVideoSrc] = useState<string | null>(null);

  useEffect(() => {
    loaderStartedAtRef.current =
      typeof window !== "undefined" ? window.performance.now() : Date.now();
  }, []);

  useEffect(() => {
    heroReadyRef.current = heroReady;
  }, [heroReady]);

  useEffect(() => {
    return () => {
      if (heroObjectUrlRef.current) {
        URL.revokeObjectURL(heroObjectUrlRef.current);
        heroObjectUrlRef.current = null;
      }
    };
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

  const handleHeroVideoProgressChange = useCallback((nextProgress: number) => {
    setProgress((currentProgress) => {
      if (heroReadyRef.current) {
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
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !loading) {
      return;
    }

    const idleWindow = window as IdleWindow;
    const createdLinks: HTMLLinkElement[] = [];
    const warmVideos: HTMLVideoElement[] = [];
    const abortController = new AbortController();
    let heroProgressAnimationFrame: number | null = null;
    let heroProgressInterval: number | null = null;
    let preloadAnimationFrame: number | null = null;
    let heroFallbackTimer: number | null = null;
    let currentHeroWarmVideo: HTMLVideoElement | null = null;
    let disposed = false;

    const updateLoaderProgress = (nextProgress: number) => {
      setProgress((currentProgress) => {
        if (heroReadyRef.current) {
          return 100;
        }

        const targetValue = Math.round(
          Math.max(currentProgress, Math.min(nextProgress, 96)),
        );
        const dampedStep = Math.max(
          1,
          Math.round((targetValue - currentProgress) * 0.45),
        );

        return Math.min(targetValue, currentProgress + dampedStep);
      });
    };

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

    const appendPreloadLinksPaced = (
      links: Array<{
        href: string;
        as: "fetch" | "image" | "video";
        crossOrigin?: "anonymous";
      }>,
    ) => {
      let index = 0;

      const appendNext = () => {
        if (disposed || index >= links.length) {
          preloadAnimationFrame = null;
          return;
        }

        const link = links[index];
        index += 1;
        appendPreloadLink(link.href, link.as, link.crossOrigin);
        preloadAnimationFrame = window.requestAnimationFrame(appendNext);
      };

      preloadAnimationFrame = window.requestAnimationFrame(appendNext);
    };

    const warmVideoSource = (src: string) => {
      const video = document.createElement("video");
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      video.src = src;
      video.load();
      warmVideos.push(video);
      return video;
    };

    appendPreloadLinksPaced([
      {
        href: "https://cdn.sthyra.com/images/first_frame_again.png",
        as: "image",
      },
      {
        href: shouldPreferLightweightHeroVideo()
          ? HERO_FALLBACK_VIDEO_URL
          : HERO_VIDEO_URL,
        as: "video",
      },
      { href: HERO_LOOP_VIDEO_URL, as: "video" },
      { href: ENTRY_VIDEO_URL, as: "video" },
      {
        href: MASTER_PLAN_SCRUB_HQ_VIDEO_PATH,
        as: "video",
      },
      { href: "/models/forglb.glb", as: "fetch" },
      { href: "/models/forglb%20-%20Copy.glb", as: "fetch" },
    ]);

    warmVideoSource(ENTRY_VIDEO_URL);
    warmVideoSource(HERO_LOOP_VIDEO_URL);
    warmVideoSource(MASTER_PLAN_SCRUB_HQ_VIDEO_PATH);

    const shouldStartWithFallbackHero = shouldPreferLightweightHeroVideo();
    const warmHeroVideoFromMediaElement = warmVideoSource(
      shouldStartWithFallbackHero ? HERO_FALLBACK_VIDEO_URL : HERO_VIDEO_URL,
    );
    currentHeroWarmVideo = warmHeroVideoFromMediaElement;

    const reportHeroProgressFromMediaElement = () => {
      const warmVideo = currentHeroWarmVideo;

      if (!warmVideo) {
        return;
      }

      updateLoaderProgress(getVideoLoadProgress(warmVideo) * 100);
    };

    const publishHeroVideoSource = (src?: string) => {
      if (!disposed) {
        setHeroVideoSrc(src ?? currentHeroWarmVideo?.src ?? HERO_VIDEO_URL);
      }
    };

    const switchToFallbackHeroVideo = () => {
      if (
        disposed ||
        currentHeroWarmVideo?.src === HERO_FALLBACK_VIDEO_URL ||
        heroReadyRef.current
      ) {
        return;
      }

      const fallbackWarmVideo = warmVideoSource(HERO_FALLBACK_VIDEO_URL);
      currentHeroWarmVideo = fallbackWarmVideo;
      publishHeroVideoSource(HERO_FALLBACK_VIDEO_URL);
      void fallbackWarmVideo.play().catch(() => undefined);
    };

    const publishCurrentHeroVideoSource = () => {
      publishHeroVideoSource();
    };

    const handleHeroWarmMediaError = () => {
      switchToFallbackHeroVideo();
    };

    const handleHeroWarmMediaProgress = () => {
      if (heroProgressAnimationFrame !== null) {
        return;
      }

      heroProgressAnimationFrame = window.requestAnimationFrame(() => {
        heroProgressAnimationFrame = null;
        reportHeroProgressFromMediaElement();
      });
    };

    warmHeroVideoFromMediaElement.addEventListener(
      "loadedmetadata",
      handleHeroWarmMediaProgress,
    );
    warmHeroVideoFromMediaElement.addEventListener(
      "loadeddata",
      handleHeroWarmMediaProgress,
    );
    warmHeroVideoFromMediaElement.addEventListener(
      "canplay",
      publishCurrentHeroVideoSource,
      { once: true },
    );
    warmHeroVideoFromMediaElement.addEventListener(
      "progress",
      handleHeroWarmMediaProgress,
    );
    warmHeroVideoFromMediaElement.addEventListener(
      "stalled",
      handleHeroWarmMediaProgress,
    );
    warmHeroVideoFromMediaElement.addEventListener(
      "suspend",
      handleHeroWarmMediaProgress,
    );
    warmHeroVideoFromMediaElement.addEventListener(
      "error",
      handleHeroWarmMediaError,
      { once: true },
    );

    heroProgressInterval = window.setInterval(() => {
      reportHeroProgressFromMediaElement();
    }, 250);

    void warmHeroVideoFromMediaElement.play().catch(() => undefined);
    publishHeroVideoSource();

    if (!shouldStartWithFallbackHero) {
      heroFallbackTimer = window.setTimeout(
        switchToFallbackHeroVideo,
        HERO_VIDEO_FALLBACK_DELAY_MS,
      );
    }

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
      disposed = true;
      abortController.abort();
      cleanupIdle?.();
      if (heroProgressAnimationFrame !== null) {
        window.cancelAnimationFrame(heroProgressAnimationFrame);
      }
      if (preloadAnimationFrame !== null) {
        window.cancelAnimationFrame(preloadAnimationFrame);
      }
      if (heroProgressInterval !== null) {
        window.clearInterval(heroProgressInterval);
      }
      if (heroFallbackTimer !== null) {
        window.clearTimeout(heroFallbackTimer);
      }
      warmHeroVideoFromMediaElement.removeEventListener(
        "loadedmetadata",
        handleHeroWarmMediaProgress,
      );
      warmHeroVideoFromMediaElement.removeEventListener(
        "loadeddata",
        handleHeroWarmMediaProgress,
      );
      warmHeroVideoFromMediaElement.removeEventListener(
        "canplay",
        publishCurrentHeroVideoSource,
      );
      warmHeroVideoFromMediaElement.removeEventListener(
        "progress",
        handleHeroWarmMediaProgress,
      );
      warmHeroVideoFromMediaElement.removeEventListener(
        "stalled",
        handleHeroWarmMediaProgress,
      );
      warmHeroVideoFromMediaElement.removeEventListener(
        "suspend",
        handleHeroWarmMediaProgress,
      );
      warmHeroVideoFromMediaElement.removeEventListener(
        "error",
        handleHeroWarmMediaError,
      );
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
          heroVideoSrc={heroVideoSrc}
          heroLoopVideoSrc={HERO_LOOP_VIDEO_URL}
          playIntroAnimation={!loading}
          onHeroReadyChange={setHeroReady}
          onHeroVideoProgressChange={handleHeroVideoProgressChange}
        />
      </main>
    </>
  );
}
