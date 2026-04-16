"use client";

import { forwardRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

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

const OverviewLeftPage = forwardRef<HTMLDivElement, Props>(({ number: _number }, ref) => {
  void _number;
  return (
    <div
      ref={ref}
      className="h-full w-full overflow-hidden relative rounded-[24px] bg-white sm:rounded-2xl"
    >
      <motion.div
        variants={imageReveal}
        initial="hidden"
        animate="show"
        className="relative h-full w-full"
      >
        <Image
          src={"https://cdn.sthyra.com/images/bros_1.webp"}
          alt="Project overview tower"
          fill
          className="absolute h-full w-full object-cover object-[45%_40%]"
          priority
        />
      </motion.div>
    </div>
  );
});

OverviewLeftPage.displayName = "OverviewLeftPage";

export default OverviewLeftPage;
