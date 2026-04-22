"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

const MASTERPLAN_SPREAD_IMAGE =
  "https://cdn.sthyra.com/images/first_frame_overview.jpg";
const MASTERPLAN_STAGE_IMAGE =
  "https://cdn.sthyra.com/images/first_frame_again.png";

export default function MasterPlanEntryOverlay({
  initialVisible,
}: {
  initialVisible: boolean;
}) {
  const [isVisible, setIsVisible] = useState(initialVisible);

  useEffect(() => {
    if (!initialVisible) {
      return;
    }

    const cleanUrlTimer = window.setTimeout(() => {
      window.history.replaceState(null, "", "/master-plan");
    }, 2600);

    return () => {
      window.clearTimeout(cleanUrlTimer);
    };
  }, [initialVisible]);

  if (!isVisible) {
    return null;
  }
  

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[140] overflow-hidden bg-[#1f1a12]"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ delay: 3.4, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={() => setIsVisible(false)}
    >
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 1, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1.08 }}
        transition={{ duration: 4.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <Image
          src={MASTERPLAN_STAGE_IMAGE}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(9,9,7,0.18))]" />
      </motion.div>

      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 1, scale: 1.075 }}
        animate={{ opacity: 0, scale: 1.13 }}
        transition={{ delay: 1.05, duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
      >
        <Image
          src={MASTERPLAN_SPREAD_IMAGE}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(9,9,7,0.18))]" />
      </motion.div>
    </motion.div>
  );
}
