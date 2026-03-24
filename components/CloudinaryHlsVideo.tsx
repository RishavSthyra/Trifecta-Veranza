"use client";

import {
  forwardRef,
  useEffect,
  useRef,
  type Ref,
  type VideoHTMLAttributes,
} from "react";
import Hls from "hls.js";

type CloudinaryHlsVideoProps = Omit<
  VideoHTMLAttributes<HTMLVideoElement>,
  "src"
> & {
  src: string;
  fallbackSrc?: string;
  preferHighQualityStart?: boolean;
};

function setRef(ref: Ref<HTMLVideoElement> | undefined, node: HTMLVideoElement | null) {
  if (!ref) return;

  if (typeof ref === "function") {
    ref(node);
    return;
  }

  ref.current = node;
}

function toCloudinaryHlsUrl(src: string) {
  const [base, query = ""] = src.split("?");

  if (!base.includes("/video/upload/")) {
    return null;
  }

  const withStreamingProfile = base.includes("/video/upload/sp_")
    ? base
    : base.replace("/video/upload/", "/video/upload/sp_auto/");

  const withoutExtension = withStreamingProfile.replace(/\.[a-z0-9]+$/i, "");
  return `${withoutExtension}.m3u8${query ? `?${query}` : ""}`;
}

function getPreferredStartLevel(hls: Hls, video: HTMLVideoElement) {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const targetWidth =
    Math.max(video.clientWidth, window.innerWidth || 0) * pixelRatio;
  const targetHeight =
    Math.max(video.clientHeight, window.innerHeight || 0) * pixelRatio;

  let fallbackLevel = -1;

  for (let index = 0; index < hls.levels.length; index += 1) {
    const level = hls.levels[index];
    if (!level) continue;

    fallbackLevel = index;

    const matchesWidth = level.width >= targetWidth * 0.9;
    const matchesHeight = level.height >= targetHeight * 0.9;

    if (matchesWidth || matchesHeight) {
      return index;
    }
  }

  return fallbackLevel;
}

const CloudinaryHlsVideo = forwardRef<HTMLVideoElement, CloudinaryHlsVideoProps>(
  function CloudinaryHlsVideo(
    { src, fallbackSrc, preferHighQualityStart = false, ...videoProps },
    forwardedRef,
  ) {
    const videoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const hlsSrc = toCloudinaryHlsUrl(src);
      const directSrc = fallbackSrc ?? src;

      const loadDirectSource = () => {
        if (video.src === directSrc) return;

        video.src = directSrc;
        video.load();
      };

      if (!hlsSrc) {
        loadDirectSource();
        return;
      }

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = hlsSrc;
        video.load();
        return;
      }

      if (!Hls.isSupported()) {
        loadDirectSource();
        return;
      }

      const hls = new Hls({
        enableWorker: true,
        capLevelToPlayerSize: true,
        maxDevicePixelRatio: 2,
        abrEwmaDefaultEstimate: preferHighQualityStart ? 12_000_000 : 2_000_000,
        abrEwmaDefaultEstimateMax: preferHighQualityStart
          ? 20_000_000
          : 8_000_000,
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!preferHighQualityStart) {
          return;
        }

        const preferredStartLevel = getPreferredStartLevel(hls, video);
        if (preferredStartLevel < 0) {
          return;
        }

        hls.startLevel = preferredStartLevel;
        hls.nextLoadLevel = preferredStartLevel;
        hls.nextAutoLevel = preferredStartLevel;
        hls.bandwidthEstimate = Math.max(
          hls.levels[preferredStartLevel]?.bitrate ?? 0,
          hls.abrEwmaDefaultEstimate,
        );
      });

      hls.loadSource(hlsSrc);
      hls.attachMedia(video);

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;

        hls.destroy();
        loadDirectSource();
      });

      return () => {
        hls.destroy();
      };
    }, [fallbackSrc, preferHighQualityStart, src]);

    return (
      <video
        {...videoProps}
        ref={(node) => {
          videoRef.current = node;
          setRef(forwardedRef, node);
        }}
      />
    );
  },
);

export default CloudinaryHlsVideo;
