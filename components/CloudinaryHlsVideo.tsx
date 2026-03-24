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

const CloudinaryHlsVideo = forwardRef<HTMLVideoElement, CloudinaryHlsVideoProps>(
  function CloudinaryHlsVideo(
    { src, fallbackSrc, ...videoProps },
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
    }, [fallbackSrc, src]);

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
