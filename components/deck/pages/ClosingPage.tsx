"use client";

import React, { forwardRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

type Props = {
  number?: number;
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
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const logoReveal = {
  hidden: { opacity: 0, y: 18, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const ClosingPage = forwardRef<HTMLDivElement, Props>(({ number }, ref) => {
  return (
    <div
      ref={ref}
      className="h-full w-full overflow-hidden rounded-[24px] bg-[#f8f3eb] sm:rounded-2xl"
    >
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative flex h-full w-full items-center justify-center overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.88),transparent_28%),radial-gradient(circle_at_78%_24%,rgba(171,95,104,0.10),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(191,155,96,0.14),transparent_30%),linear-gradient(180deg,#fbf8f2_0%,#f4ede1_48%,#f8f3eb_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.36),transparent_34%,rgba(168,132,84,0.06)_70%,transparent_100%)]" />
{/* 
        <div className="pointer-events-none absolute inset-x-[10%] top-[14%] h-px bg-gradient-to-r from-transparent via-[#c8b18f]/65 to-transparent" />
        <div className="pointer-events-none absolute inset-x-[16%] bottom-[14%] h-px bg-gradient-to-r from-transparent via-[#c8b18f]/55 to-transparent" />
        <div className="pointer-events-none absolute left-[11%] top-[18%] h-28 w-28 rounded-full border border-[#c9b28f]/28" />
        <div className="pointer-events-none absolute bottom-[16%] right-[12%] h-36 w-36 rounded-full border border-[#b9848d]/18" />
        <div className="pointer-events-none absolute inset-[7%] rounded-[34px] border border-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.68)]" /> */}

        {typeof number === "number" ? (
          <motion.div
            variants={fadeUp}
            className="absolute left-7 top-6 rounded-full border border-[#c8b18f]/35 bg-white/45 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.32em] text-[#8c6a57] backdrop-blur-md"
          >
            Page {number}
          </motion.div>
        ) : null}

        <div className="relative z-10 flex h-full w-full flex-col items-center justify-center px-8 py-16 text-center sm:px-12 xl:justify-start xl:px-9 xl:pb-36 xl:pt-16 min-[1700px]:xl:justify-center min-[1700px]:xl:px-12 min-[1700px]:xl:pb-16">
          <motion.p
            variants={fadeUp}
            className="text-[11px] uppercase tracking-[0.48em] text-[#a17376] sm:text-xs"
          >
            Trifecta Projects
          </motion.p>

          <motion.div variants={logoReveal} className="mt-8 w-full max-w-[820px] xl:max-w-[620px] min-[1700px]:xl:max-w-[820px]">
            <div className="relative mx-auto aspect-[5.4/2.1] w-full max-w-[780px]">
              <Image
                src="/Logo_Trifect_Veranza.png"
                alt="Trifecta Veranza"
                fill
                priority
                sizes="780px"
                className="object-contain"
              />
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-6 xl:mt-5 min-[1700px]:xl:mt-8">
            <div className="flex items-center justify-center gap-4 text-[#7b6a61]">
              <span className="h-px w-14 bg-gradient-to-r from-transparent to-[#b18c76] sm:w-20" />
              <span className="text-[11px] font-medium uppercase tracking-[0.32em] sm:text-xs">
                Off Sarjapur Road
              </span>
              <span className="h-px w-14 bg-gradient-to-l from-transparent to-[#b18c76] sm:w-20" />
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-6 max-w-3xl xl:mt-5 min-[1700px]:xl:mt-8">
            <h2 className="text-[2rem] font-light tracking-[-0.04em] text-[#5b4e49] sm:text-[2.6rem] lg:text-[3.2rem] xl:text-[2.45rem] min-[1700px]:xl:text-[3.2rem]">
              Open to sky, rooted in green.
            </h2>
            <p className="mx-auto mt-3 max-w-[560px] text-sm leading-6 text-[#7a6b63] sm:text-[15px] sm:leading-7 xl:max-w-[500px] xl:text-[13px] xl:leading-6 min-[1700px]:xl:max-w-2xl min-[1700px]:xl:text-[15px] min-[1700px]:xl:leading-7">
              A final note in a quieter tone, shaped around calm luxury,
              elevated living, and the signature presence of Trifecta Veranza.
            </p>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="mt-8 flex w-full max-w-4xl flex-wrap items-center justify-center gap-6 sm:gap-12 xl:mt-7 xl:gap-5 min-[1700px]:xl:mt-10 min-[1700px]:xl:gap-8"
          >
            <div className="flex items-center justify-center">
              <Image
                src="/logos/credai.gif"
                alt="CREDAI logo"
                width={180}
                height={64}
                unoptimized
                className="h-12 w-auto object-contain sm:h-16 xl:h-11 min-[1700px]:xl:h-16"
              />
            </div>

            <div className="flex items-center justify-center">
              <Image
                src="/logos/IGBC LOGO 2.png"
                alt="IGBC Member logo"
                width={190}
                height={86}
                className="h-14 w-auto object-contain sm:h-20 xl:h-12 min-[1700px]:xl:h-20"
              />
            </div>

            <div className="flex items-center justify-center">
              <Image
                src="/logos/cropped-Registered-Trifecta-Logo.png"
                alt="Registered Trifecta logo"
                width={180}
                height={86}
                className="h-14 w-auto object-contain sm:h-20 xl:h-12 min-[1700px]:xl:h-20"
              />
            </div>
          </motion.div>
        </div>

        <motion.div
          variants={fadeUp}
          className="absolute inset-x-0 bottom-0 z-10 px-6 pb-5 sm:px-10 sm:pb-7 xl:px-8 xl:pb-4 min-[1700px]:xl:px-10 min-[1700px]:xl:pb-7"
        >
          <div className="mx-auto max-w-6xl border-t border-[#c8b18f]/28 pt-3 text-center">
            <p className="text-[9px] font-medium uppercase tracking-[0.24em] text-[#7c6458] sm:text-[10px] xl:text-[8px] min-[1700px]:xl:text-[10px]">
              RERA No: PRM/KA/RERA/1251/308/PR/210126/008418
            </p>
            <p className="mx-auto mt-2 max-w-5xl text-[8px] leading-[1.55] text-[#8b7a70] sm:text-[9px] sm:leading-[1.65] xl:text-[7px] xl:leading-[1.4] min-[1700px]:xl:text-[9px] min-[1700px]:xl:leading-[1.65]">
              Disclaimer : Trifecta Projects Private Limited is developing this
              project in a phased manner. The details provided herein are
              indicative of the proposed development and are intended for
              informational purposes only. Open & green areas comprise
              amenities, landscapes and clubhouse zones. All visuals are
              artistic conceptualisations intended for illustrative purposes and
              should not be considered exact representations of the final
              product. For detailed information, please get in touch with our
              sales representative. Terms & conditions apply, E&amp;OE. V1
              Feb&apos;26
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
});

ClosingPage.displayName = "ClosingPage";

export default ClosingPage;
