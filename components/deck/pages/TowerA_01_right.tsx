"use client";

import React, { forwardRef } from "react";
import Image, { type StaticImageData } from "next/image";
import { motion } from "framer-motion";

type SpecRow = {
  name: string;
  size: string;
};

type Props = {
  number?: number;
  image3D: StaticImageData;
  specs: SpecRow[];
};

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.08,
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const imageReveal = {
  hidden: { opacity: 0, y: 30, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.95,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const UnitPlanRightPage = forwardRef<HTMLDivElement, Props>(
  ({ number, image3D, specs }, ref) => {
    return (
      <div
        ref={ref}
        className="h-full w-full overflow-hidden rounded-r-2xl bg-[#f6f1e8]"
      >
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex h-full flex-col"
        >
          <motion.div
            variants={imageReveal}
            className="relative flex h-[58%] w-full items-center justify-center overflow-hidden px-6 pt-6 pb-3 md:px-8 md:pt-8 md:pb-4"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.75),transparent_62%)]" />
            <div className="relative h-full w-full">
              <Image
                src={image3D}
                alt="3D furnished unit plan"
                fill
                priority
                className="object-contain"
              />
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="flex h-[42%] flex-col px-5 pb-5 pt-2 sm:px-6 sm:pb-6 md:px-8 md:pb-8 md:pt-3"
          >
            <div className="mb-4 flex items-end justify-between gap-4 border-t border-neutral-300/70 pt-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-neutral-500">
                  Unit Specifications
                </p>
                <h3 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-neutral-900 sm:text-2xl md:text-[28px]">
                  Layout Dimensions
                </h3>
              </div>

              {number ? (
                <div className="shrink-0 text-[11px] uppercase tracking-[0.24em] text-neutral-500">
                  Page {number}
                </div>
              ) : null}
            </div>

            <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-2.5 sm:gap-x-4 sm:gap-y-3 overflow-y-scroll">
              {specs.map((item) => (
                <motion.div
                  key={`${item.name}-${item.size}`}
                  variants={fadeUp}
                  className="flex min-h-[52px] items-center hover:border-emerald-950 justify-between rounded-xl border border-neutral-300/70 bg-white/55 px-3 py-2.5 sm:px-4 sm:py-3"
                >
                  <span className="pr-3 text-[12px] font-medium text-neutral-800 sm:text-[13px]">
                    {item.name}
                  </span>
                  <span className="whitespace-nowrap text-[11px] text-neutral-600 sm:text-[12px]">
                    {item.size}
                  </span>
                </motion.div>
              ))}
            </div>

            <motion.div
              variants={fadeUp}
              className="mt-4 flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-neutral-500"
            >
              <span>Furnished 3D View</span>
              <span>Not to Scale</span>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    );
  }
);

UnitPlanRightPage.displayName = "UnitPlanRightPage";

export default UnitPlanRightPage;