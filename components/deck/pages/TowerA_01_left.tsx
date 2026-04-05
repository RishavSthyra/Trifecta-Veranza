"use client";

import React, { forwardRef } from "react";
import Image, { type StaticImageData } from "next/image";
import { motion } from "framer-motion";
import { Compass, Building2, Ruler, Home } from "lucide-react";

type Props = {
  number?: number;
  series: string;
  towerA: string;
  towerB?: string;
  bhk: string;
  facing: string;
  areaLabel: string;
  areaValue: string;
  description: string;
  image2D: StaticImageData;
};

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.08,
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const fadeRight = {
  hidden: { opacity: 0, x: -26 },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const imageReveal = {
  hidden: {
    opacity: 0,
    scale: 0.92,
    x: 40,
    y: 16,
    rotate: -2,
  },
  show: {
    opacity: 1,
    scale: 1,
    x: 0,
    y: 0,
    rotate: 0,
    transition: {
      duration: 1.15,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const infoCard = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.65,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const UnitPlanLeftPage = forwardRef<HTMLDivElement, Props>(
  (
    {
      number: _number,
      series,
      towerA,
      towerB,
      bhk,
      facing,
      areaLabel,
      areaValue,
      description,
      image2D,
    },
    ref
  ) => {
    void _number;

    return (
      <div
        ref={ref}
        className="h-full w-full overflow-hidden rounded-2xl lg:rounded-l-2xl lg:rounded-r-none bg-[#f6f1e8]"
      >
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative grid h-full min-h-0 grid-rows-[auto_1fr] lg:grid-cols-[36%_64%] lg:grid-rows-1 xl:grid-cols-[32%_68%] min-[1700px]:xl:grid-cols-[36%_64%]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.55),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(171,95,104,0.08),transparent_24%)]" />

          <motion.div
            variants={fadeRight}
            className="relative flex min-h-0 flex-col overflow-hidden bg-[#ab5f68] px-3 py-4 text-white sm:px-4 sm:py-5 md:px-5 md:py-6 lg:h-full lg:justify-between lg:px-7 lg:py-8 xl:px-6 xl:py-7 min-[1700px]:xl:px-8 min-[1700px]:xl:py-10"
          >
            <div className="absolute inset-0 opacity-20">
              <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl sm:h-52 sm:w-52 lg:h-72 lg:w-72" />
              <div className="absolute right-0 top-10 h-28 w-28 rounded-full bg-white/10 blur-2xl sm:top-12 sm:h-36 sm:w-36 lg:top-16 lg:h-48 lg:w-48" />
            </div>

            <div className="absolute inset-x-0 bottom-0 h-px bg-white/15 lg:inset-y-0 lg:right-0 lg:left-auto lg:h-auto lg:w-px" />

            <div className="relative z-10 min-h-0">
              <motion.div
                variants={fadeUp}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[8px] uppercase tracking-[0.18em] text-white/80 backdrop-blur-sm sm:gap-2 sm:px-2.5 sm:py-1.5 sm:text-[9px] md:text-[10px] md:tracking-[0.22em] lg:px-3 lg:tracking-[0.28em]"
              >
                <Home className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                Unit Plan
              </motion.div>

              <motion.div variants={fadeUp} className="mt-3 sm:mt-4 md:mt-5 lg:mt-6">
                <p className="text-[1.55rem] font-semibold leading-none tracking-[-0.05em] sm:text-[1.8rem] md:text-[2.05rem] lg:text-[2.5rem] xl:text-[2rem] min-[1700px]:xl:text-4xl">
                  {series}
                </p>
                <p className="mt-2 max-w-full text-[11px] leading-4 text-white/75 sm:max-w-[340px] sm:text-[12px] sm:leading-5 md:max-w-[420px] md:text-[13px] lg:max-w-[220px] lg:text-sm lg:leading-6">
                  {description}
                </p>
              </motion.div>

              <motion.div
                variants={infoCard}
                className="mt-4 flex flex-col gap-4 sm:mt-5 sm:gap-5 md:mt-6 md:gap-5 lg:mt-8 lg:gap-8"
              >
                <div className="rounded-2xl p-0 backdrop-blur-sm">
                  <div className="flex items-start gap-2 sm:gap-2.5 md:gap-3">
                    <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/80 sm:h-4 sm:w-4" />
                    <div className="min-w-0">
                      <p className="text-[8px] uppercase tracking-[0.16em] text-white/60 sm:text-[9px] sm:tracking-[0.2em] md:text-[10px] md:tracking-[0.24em]">
                        Tower Series
                      </p>

                      <div className="mt-1.5 grid grid-cols-1 gap-0.5 sm:mt-2 md:grid-cols-2 md:gap-3 lg:grid-cols-1 lg:gap-0">
                        <p className="text-[1rem] font-medium leading-tight sm:text-[1.2rem] md:text-[1.25rem] lg:text-[1.6rem] xl:text-[1.45rem] min-[1700px]:xl:text-2xl">
                          {towerA}
                        </p>
                        {towerB ? (
                          <p className="text-[1rem] font-medium leading-tight sm:text-[1.2rem] md:text-[1.25rem] lg:text-[1.6rem] xl:text-[1.45rem] min-[1700px]:xl:text-2xl">
                            {towerB}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-1 lg:gap-8">
                  <div className="rounded-2xl p-0 backdrop-blur-sm">
                    <div className="flex items-start gap-2 sm:gap-2.5 md:gap-3">
                      <Compass className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/80 sm:h-4 sm:w-4" />
                      <div className="min-w-0">
                        <p className="text-[8px] uppercase tracking-[0.16em] text-white/60 sm:text-[9px] sm:tracking-[0.2em] md:text-[10px] md:tracking-[0.24em]">
                          Configuration
                        </p>
                        <p className="mt-1.5 text-[1.15rem] font-semibold leading-tight sm:mt-2 sm:text-[1.4rem] md:text-[1.55rem] lg:text-[2rem] xl:text-[2rem] min-[1700px]:xl:text-3xl">
                          {bhk}
                        </p>
                        <p className="mt-0.5 text-[12px] text-white/85 sm:mt-1 sm:text-[13px] md:text-[14px] lg:text-base xl:text-[15px] min-[1700px]:xl:text-lg">
                          {facing}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl p-0">
                    <div className="flex items-start gap-2 sm:gap-2.5 md:gap-3">
                      <Ruler className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/80 sm:h-4 sm:w-4" />
                      <div className="min-w-0">
                        <p className="text-[8px] uppercase tracking-[0.16em] text-white/60 sm:text-[9px] sm:tracking-[0.2em] md:text-[10px] md:tracking-[0.24em]">
                          {areaLabel}
                        </p>
                        <p className="mt-1.5 text-[1.15rem] font-semibold leading-tight sm:mt-2 sm:text-[1.4rem] md:text-[1.55rem] lg:text-[2rem] xl:text-[2rem] min-[1700px]:xl:text-3xl">
                          {areaValue}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            <motion.div
              variants={fadeUp}
              className="relative z-10 mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-[8px] uppercase tracking-[0.16em] text-white/70 sm:mt-5 sm:pt-4 sm:text-[9px] sm:tracking-[0.2em] md:text-[10px] md:tracking-[0.24em] lg:mt-3 lg:border-t-0 lg:pt-0 lg:tracking-[0.28em]"
            >
              <span>Veranza</span>
              <span className="text-right">Floor Series</span>
            </motion.div>
          </motion.div>

          <div className="relative flex min-h-0 items-center justify-center px-2 py-3 sm:px-3 sm:py-4 md:px-4 md:py-5 lg:h-full lg:px-6 lg:py-6 xl:px-8 xl:py-8">
            <div className="absolute inset-0">
              <motion.div
                variants={fadeUp}
                className="absolute left-[8%] top-[10%] h-16 w-16 rounded-full bg-[#d9c9bd]/35 blur-3xl sm:h-20 sm:w-20 md:h-24 md:w-24 lg:h-28 lg:w-28"
              />
              <motion.div
                variants={fadeUp}
                className="absolute bottom-[10%] right-[10%] h-20 w-20 rounded-full bg-[#ab5f68]/10 blur-3xl sm:h-24 sm:w-24 md:h-28 md:w-28 lg:h-36 lg:w-36"
              />
            </div>

            <motion.div
              variants={imageReveal}
              className="relative z-10 flex h-full w-full min-h-0 items-center justify-center"
            >
              <motion.div
                whileHover={{ scale: 1.015, y: -4 }}
                transition={{ duration: 0.3 }}
                className="relative h-[240px] w-[92%] sm:h-[300px] sm:w-[90%] md:h-[380px] md:w-[88%] lg:h-[80%] lg:w-[84%] xl:h-[74%] xl:w-[88%] min-[1700px]:xl:h-[82%] min-[1700px]:xl:w-[82%]"
              >
                <Image
                  src={image2D}
                  alt={`${series} 2D unit floor plan`}
                  fill
                  priority
                  className="object-contain drop-shadow-[0_18px_35px_rgba(0,0,0,0.10)]"
                />
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }
);

UnitPlanLeftPage.displayName = "UnitPlanLeftPage";

export default UnitPlanLeftPage;
