"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import CloudinaryHlsVideo from "@/components/CloudinaryHlsVideo";

type IdleCapableWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (
      callback: IdleRequestCallback,
      options?: IdleRequestOptions,
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

type TimeoutHandle = ReturnType<typeof globalThis.setTimeout>;

export default function HeroSection() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const masterPlanWarmVideoRef = useRef<HTMLVideoElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const scrollLockRef = useRef(false);
  const navigationTimeoutRef = useRef<TimeoutHandle | null>(null);

  const [videoReady, setVideoReady] = useState(false);
  const [isTransitioningToMasterPlan, setIsTransitioningToMasterPlan] =
    useState(false);

  const line1 = "Open to Sky,";
  const line2 = "Rooted in Green";

  const container: Variants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.035,
        delayChildren: 0.2,
      },
    },
  };

  const letter: Variants = {
    hidden: {
      y: 40,
      opacity: 0,
    },
    show: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.7,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  };

  const contentWrap: Variants = {
    show: {
      transition: {
        staggerChildren: 0.08,
      },
    },
    exit: {
      transition: {
        staggerChildren: 0.09,
        staggerDirection: -1,
      },
    },
  };

  const contentItem: Variants = {
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        duration: 0.55,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
    exit: {
      opacity: 0,
      y: -56,
      filter: "blur(14px)",
      transition: {
        duration: 0.75,
        ease: [0.4, 0, 0.2, 1] as const,
      },
    },
  };

  const goToNextPage = useCallback(() => {
    if (scrollLockRef.current || isTransitioningToMasterPlan) return;

    scrollLockRef.current = true;
    setIsTransitioningToMasterPlan(true);
    router.prefetch("/master-plan");
    masterPlanWarmVideoRef.current?.load();

    navigationTimeoutRef.current = globalThis.setTimeout(() => {
      router.push("/master-plan");
    }, 1050);
  }, [isTransitioningToMasterPlan, router]);

  useEffect(() => {
    router.prefetch("/master-plan");
  }, [router]);

  useEffect(() => {
    if (!videoReady) return;

    let timeoutId: TimeoutHandle | null = null;
    let idleId: number | null = null;
    const idleWindow = window as IdleCapableWindow;

    const warmMasterPlan = () => {
      router.prefetch("/master-plan");
      masterPlanWarmVideoRef.current?.load();
    };

    if (typeof idleWindow.requestIdleCallback === "function") {
      idleId = idleWindow.requestIdleCallback(warmMasterPlan, {
        timeout: 1200,
      });
    } else {
      timeoutId = globalThis.setTimeout(warmMasterPlan, 400);
    }

    return () => {
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
  }, [router, videoReady]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY <= 20) return;
      if (scrollLockRef.current) return;

      e.preventDefault();
      goToNextPage();
    };

    el.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, [goToNextPage]);

  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current !== null) {
        globalThis.clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative h-dvh w-full overflow-hidden bg-black text-white"
    >
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 ${
          videoReady ? "opacity-0" : "opacity-100"
        }`}
        style={{ backgroundImage: "url('/FALLBACK.png')" }}
      />

      <CloudinaryHlsVideo
        ref={videoRef}
        src="https://res.cloudinary.com/dlhfbu3kh/video/upload/v1774328995/HERO_BG_2_jz6mka.mp4"
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
          videoReady ? "opacity-100" : "opacity-0"
        }`}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        onCanPlay={() => setVideoReady(true)}
      />

      <CloudinaryHlsVideo
        ref={masterPlanWarmVideoRef}
        src="https://res.cloudinary.com/dlhfbu3kh/video/upload/v1774328580/master_plan_video_aof5a5.webm"
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        className="pointer-events-none absolute h-0 w-0 opacity-0"
      />

      <motion.div
        animate={{ opacity: isTransitioningToMasterPlan ? 0.24 : 0.05 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 bg-black"
      />
      <motion.div
        animate={{
          opacity: isTransitioningToMasterPlan ? 1 : 0.7,
        }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(0,0,0,0.45)_100%)]"
      />

      <div className="hidden  absolute left-0 right-0 top-0 z-20 lg:flex items-center justify-between px-6 py-5 md:px-10">
        <button className="text-xs uppercase tracking-[0.25em] text-white/80">
          <Link href={"/"}>
            <Image
              src={"/Logo_Trifect_Veranza.png"}
              width={140}
              height={100}
              alt="Trifecta Logo"
            />
          </Link>
        </button>
        <button className="text-xs uppercase tracking-[0.25em] text-white/80">
          Inquire
        </button>
      </div>

      <div className="relative z-10 flex h-full items-center justify-center px-6">
        <motion.div
          variants={contentWrap}
          initial="show"
          animate={isTransitioningToMasterPlan ? "exit" : "show"}
          className="max-w-5xl text-center"
        >
          <motion.p
            variants={contentItem}
            className="mb-4 text-[11px] uppercase tracking-[0.4em] text-white/70 md:text-xs"
          >
            Trifecta Veranza
          </motion.p>

          <motion.div variants={contentItem}>
            <motion.h1
              variants={container}
              initial="hidden"
              animate={isTransitioningToMasterPlan ? "hidden" : "show"}
              className="text-4xl font-light uppercase tracking-[0.08em] md:text-7xl md:leading-[0.95]"
            >
              <div className="flex flex-wrap justify-center overflow-hidden">
              {line1.split("").map((char, i) => (
                <motion.span
                  key={`l1-${i}`}
                  variants={letter}
                  className="inline-block"
                >
                  {char === " " ? "\u00A0" : char}
                </motion.span>
              ))}
              </div>

              <div className="flex flex-wrap justify-center overflow-hidden">
              {line2.split("").map((char, i) => (
                <motion.span
                  key={`l2-${i}`}
                  variants={letter}
                  className="inline-block"
                >
                  {char === " " ? "\u00A0" : char}
                </motion.span>
              ))}
              </div>
            </motion.h1>
          </motion.div>

          <motion.p
            variants={contentItem}
            className="mx-auto mt-6 max-w-2xl text-sm text-white/80 md:text-base"
          >
            Expansive skyrise residences set across 6+ acres with 2 iconic
            towers, rising G+36 floors and offering 444 exclusive homes designed
            for elevated living.
          </motion.p>

          <motion.div
            variants={contentItem}
            className="mt-8 flex flex-col items-center gap-4 md:flex-row md:justify-center"
          >
            <button
              onClick={goToNextPage}
              disabled={isTransitioningToMasterPlan}
              className="cursor-pointer border border-white/40 bg-white/10 px-7 py-3 text-xs uppercase tracking-[0.25em] backdrop-blur-sm transition hover:bg-white hover:text-black disabled:cursor-default disabled:opacity-60"
            >
              Explore Masterplan
            </button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
