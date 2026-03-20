"use client";

import React, { forwardRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import OverviewHero from "@/assets/veranza.webp";

type Props = {
  number?: number;
};

const imageReveal = {
  hidden: { opacity: 0, scale: 1.08, x: 30 },
  show: {
    opacity: 1,
    scale: 1,
    x: 0,
    transition: {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const OverviewLeftPage = forwardRef<HTMLDivElement, Props>(({ number }, ref) => {
  return (
    <div
      ref={ref}
      className="h-[100vh] w-[100%] overflow-hidden rounded-2xl bg-white"
    >
      <motion.div
        variants={imageReveal}
        initial="hidden"
        animate="show"
        className="relative h-full w-full"
      >
        <Image
          src={OverviewHero}
          alt="Project overview tower"
          fill
          className="object-cover"
          priority
        />
      </motion.div>
    </div>
  );
});

OverviewLeftPage.displayName = "OverviewLeftPage";

export default OverviewLeftPage;