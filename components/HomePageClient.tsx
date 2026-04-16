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

const HERO_VIDEO_URL =
  "https://cdn.sthyra.com/videos/Tf%20Fixed.mp4";
const ENTRY_VIDEO_URL =
  "https://cdn.sthyra.com/videos/Tf%20Fixed%20Final_2.mp4";

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

    const warmVideoSource = (src: string) => {
      const video = document.createElement("video");
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";
      video.src = src;
      video.load();
      warmVideos.push(video);
      return video;
    };

    appendPreloadLink(
      "https://cdn.sthyra.com/images/first_frame_again.png",
      "image",
    );
    appendPreloadLink(
      HERO_VIDEO_URL,
      "video",
      "anonymous",
    );
    appendPreloadLink(
      ENTRY_VIDEO_URL,
      "video",
      "anonymous",
    );
    appendPreloadLink(MASTER_PLAN_SCRUB_HQ_VIDEO_PATH, "video", "anonymous");
    appendPreloadLink("/models/forglb.glb", "fetch");
    appendPreloadLink("/models/forglb%20-%20Copy.glb", "fetch");

    warmVideoSource(ENTRY_VIDEO_URL);
    warmVideoSource(MASTER_PLAN_SCRUB_HQ_VIDEO_PATH);

    const warmHeroVideoFromMediaElement = warmVideoSource(HERO_VIDEO_URL);

    const reportHeroProgressFromMediaElement = () => {
      updateLoaderProgress(getVideoLoadProgress(warmHeroVideoFromMediaElement) * 100);
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

    heroProgressInterval = window.setInterval(() => {
      reportHeroProgressFromMediaElement();
    }, 250);

    void warmHeroVideoFromMediaElement.play().catch(() => undefined);

    const warmHeroVideoBytes = async () => {
      try {
        const response = await fetch(HERO_VIDEO_URL, {
          cache: "force-cache",
          mode: "cors",
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`Hero video request failed with ${response.status}`);
        }

        if (!response.body) {
          setHeroVideoSrc(HERO_VIDEO_URL);
          return;
        }

        const reader = response.body.getReader();
        const totalBytes = Number(response.headers.get("content-length")) || 0;
        const chunks: ArrayBuffer[] = [];
        let receivedBytes = 0;

        while (!disposed) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          if (!value) {
            continue;
          }

          const chunkBuffer =
            value.buffer instanceof ArrayBuffer
              ? value.buffer.slice(
                  value.byteOffset,
                  value.byteOffset + value.byteLength,
                )
              : new Uint8Array(value).buffer;

          chunks.push(chunkBuffer);
          receivedBytes += value.byteLength;

          if (totalBytes > 0) {
            updateLoaderProgress((receivedBytes / totalBytes) * 98);
          } else {
            reportHeroProgressFromMediaElement();
          }
        }

        if (disposed) {
          return;
        }

        const heroBlob = new Blob(chunks, {
          type: response.headers.get("content-type") || "video/mp4",
        });
        const heroObjectUrl = URL.createObjectURL(heroBlob);

        if (heroObjectUrlRef.current) {
          URL.revokeObjectURL(heroObjectUrlRef.current);
        }

        heroObjectUrlRef.current = heroObjectUrl;
        setProgress((currentProgress) => Math.max(currentProgress, 98));
        setHeroVideoSrc(heroObjectUrl);
      } catch {
        if (!disposed) {
          setHeroVideoSrc(HERO_VIDEO_URL);
        }
      }
    };

    void warmHeroVideoBytes();

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
      if (heroProgressInterval !== null) {
        window.clearInterval(heroProgressInterval);
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
          onHeroReadyChange={setHeroReady}
          onHeroVideoProgressChange={(nextProgress) => {
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
          }}
        />
      </main>
    </>
  );
}
