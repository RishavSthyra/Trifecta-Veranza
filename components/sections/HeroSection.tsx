"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function HeroSection() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const scrollLockRef = useRef(false);

  const [videoReady, setVideoReady] = useState(false);
  const [shouldWarmMasterPlan, setShouldWarmMasterPlan] = useState(false);

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

  const goToNextPage = useCallback(() => {
    router.push("/master-plan");
  }, [router]);

  useEffect(() => {
    router.prefetch("/master-plan");
  }, [router]);

  useEffect(() => {
    if (!videoReady) return;

    let timeoutId: number | null = null;
    let idleId: number | null = null;

    const warmMasterPlan = () => {
      router.prefetch("/master-plan");
      setShouldWarmMasterPlan(true);
    };

    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(warmMasterPlan, { timeout: 1200 });
    } else {
      timeoutId = window.setTimeout(warmMasterPlan, 400);
    }

    return () => {
      if (idleId !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [router, videoReady]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY <= 20) return;
      if (scrollLockRef.current) return;

      scrollLockRef.current = true;
      e.preventDefault();
      goToNextPage();

      window.setTimeout(() => {
        scrollLockRef.current = false;
      }, 1200);
    };

    el.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, [goToNextPage]);

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

      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
          videoReady ? "opacity-100" : "opacity-0"
        }`}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        onCanPlay={() => setVideoReady(true)}
      >
        <source src="HERO_BG_2.mp4" type="video/mp4" />
      </video>

      {shouldWarmMasterPlan ? (
        <video
          className="hidden"
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
        >
          <source src="/master_plan_video.webm" type="video/webm" />
        </video>
      ) : null}

      <div className="absolute inset-0 bg-black/5" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(0,0,0,0.45)_100%)]" />

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
        <div className="max-w-5xl text-center">
          <p className="mb-4 text-[11px] uppercase tracking-[0.4em] text-white/70 md:text-xs">
            Trifecta Veranza
          </p>

          <motion.h1
            variants={container}
            initial="hidden"
            animate="show"
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

          <p className="mx-auto mt-6 max-w-2xl text-sm text-white/80 md:text-base">
            Expansive skyrise residences set across 6+ acres with 2 iconic
            towers, rising G+36 floors and offering 444 exclusive homes designed
            for elevated living.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4 md:flex-row md:justify-center">
            <button
              onClick={goToNextPage}
              className="cursor-pointer border border-white/40 bg-white/10 px-7 py-3 text-xs uppercase tracking-[0.25em] backdrop-blur-sm transition hover:bg-white hover:text-black"
            >
              Explore Masterplan
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
