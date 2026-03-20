"use client";

import React, { forwardRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import coverimg from "@/assets/vertical-shot-white-building-clear-sky.png";

type Props = {
  number?: number;
};

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.18,
    },
  },
};

const textReveal = {
  hidden: {
    opacity: 0,
    x: -42,
    filter: "blur(8px)",
  },
  show: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.85,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const footerReveal = {
  hidden: {
    opacity: 0,
    x: -28,
    filter: "blur(6px)",
  },
  show: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.8,
      delay: 0.15,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const imageReveal = {
  hidden: {
    opacity: 0,
    x: 36,
    y: 18,
    scale: 1.04,
    filter: "blur(10px)",
  },
  show: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 1.2,
      delay: 0.45,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const shadowReveal = {
  hidden: {
    opacity: 0,
    x: 24,
    y: 24,
    scale: 0.96,
  },
  show: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    transition: {
      duration: 1.2,
      delay: 0.55,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const CoverPage = forwardRef<HTMLDivElement, Props>(({ number }, ref) => {
  return (
    <div
      ref={ref}
      className="relative h-[100vh] w-[100%] overflow-hidden rounded-[30px] bg-[#f6f1e8] shadow-[0_25px_80px_rgba(0,0,0,0.18)]"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#f8f5ef] via-[#f2ebdf] to-[#e9dfcf]" />
      <div className="absolute inset-y-0 right-0 w-[42%] bg-gradient-to-l from-[#d9c7ab]/40 to-transparent" />
      <div className="absolute -left-16 top-[-120px] h-[280px] w-[280px] rounded-full bg-white/60 blur-3xl" />
      <div className="absolute bottom-[-60px] right-[-40px] h-[240px] w-[240px] rounded-full bg-[#c9b18c]/25 blur-3xl" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 flex h-full flex-col justify-between px-8 pb-8 pt-10 sm:px-10 sm:pb-10 sm:pt-12"
      >
        <div className="max-w-[72%]">
          <motion.p
            variants={textReveal}
            className="mb-4 text-[11px] uppercase tracking-[0.5em] text-neutral-700 sm:text-xs"
          >
            Luxury Living
          </motion.p>

          <motion.h1
            variants={textReveal}
            className="max-w-[420px] text-4xl font-semibold leading-[1.02] tracking-tight text-neutral-900 sm:text-5xl"
          >
            The New Standard of Refined Urban Living
          </motion.h1>

          <motion.p
            variants={textReveal}
            className="mt-5 max-w-[360px] text-sm leading-7 text-neutral-700 sm:mt-6 sm:text-base"
          >
            A premium residential experience crafted with timeless architecture,
            elegant interiors, and elevated lifestyle spaces.
          </motion.p>
        </div>

        <motion.div
          variants={footerReveal}
          className="relative z-20 flex items-end justify-between gap-4"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-neutral-600 sm:text-sm">
              Marketing Deck
            </p>
            <p className="mt-2 text-base font-medium text-neutral-900 sm:text-lg">
              Project Overview
            </p>
          </div>

        </motion.div>
      </motion.div>

      <motion.div
        variants={imageReveal}
        initial="hidden"
        animate="show"
        className="absolute bottom-0 right-0 z-[5] w-[68%]"
      >
        <div className="relative">
          <motion.div
            variants={shadowReveal}
            initial="hidden"
            animate="show"
            className="absolute inset-0 translate-x-6 translate-y-6 rounded-tl-[80px] bg-black/10 blur-2xl"
          />
          <div className="relative overflow-hidden rounded-tl-[90px]">
            <Image
              src={coverimg}
              alt="Project cover"
              priority
              className="h-auto w-full object-cover object-bottom"
            />
          </div>
        </div>
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 z-[6] h-32 bg-gradient-to-t from-[#f6f1e8]/20 to-transparent" />
    </div>
  );
});

CoverPage.displayName = "CoverPage";

export default CoverPage;