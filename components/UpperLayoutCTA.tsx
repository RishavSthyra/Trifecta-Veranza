"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { FiPhone, FiDownload, FiDollarSign, FiGrid } from "react-icons/fi";

interface CtaButtonType {
  name: string;
  link: string;
  isHighlight: boolean;
  icon: React.ReactNode;
}

const spring = {
  type: "spring",
  stiffness: 280,
  damping: 24,
};

export default function UpperLayoutCTA() {
  const [hovered, setHovered] = useState<string | null>(null);

  const buttons: CtaButtonType[] = [
    {
      name: "Contact Us",
      link: "/contact",
      isHighlight: true,
      icon: <FiPhone className="h-4 w-4" />,
    },
    {
      name: "Brochure",
      link: "/brochure",
      isHighlight: false,
      icon: <FiDownload className="h-4 w-4" />,
    },
    {
      name: "Get A Quote",
      link: "/quote",
      isHighlight: false,
      icon: <FiDollarSign className="h-4 w-4" />,
    },
    {
      name: "Floor Plan",
      link: "/floor-plan",
      isHighlight: false,
      icon: <FiGrid className="h-4 w-4" />,
    },
  ];

  return (
    <div className="pointer-events-none absolute top-0 left-1/2 z-50 -translate-x-1/2">
      <motion.div
        layout
        transition={spring}
        className="pointer-events-auto relative inline-block w-fit"
      >
        <motion.div
          layout
          transition={spring}
          className="relative overflow-visible rounded-b-[75px] border border-white/20 bg-black px-16 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-xl"
        >
          {/* Right Wave */}
          <svg
            width="130"
            height="58"
            viewBox="0 0 130 58"
            className="absolute -right-[113px] -top-1"
          >
            <path
              d="M0,58 L0,0 L130,0 A130,58 0 0,0 0,58 Z"
              className="fill-black shadow-[0_20px_50px_rgba(0,0,0,0.7)]"
            />
          </svg>

  
          <svg
            width="130"
            height="58"
            viewBox="0 0 130 58"
            className="absolute -left-[113px]  -top-1"
          >
            <path
              d="M130,58 L130,0 L0,0 A130,58 0 0,1 130,58 Z"
              className="fill-black shadow-[0_20px_50px_rgba(0,0,0,0.7)]"
            />
          </svg>

          <motion.div layout transition={spring} className="flex gap-2">
            {buttons.map((button) => {
              const isHovered = hovered === button.name;

              return (
                <motion.div
                  key={button.name}
                  layout
                  onHoverStart={() => setHovered(button.name)}
                  onHoverEnd={() => setHovered(null)}
                  transition={spring}
                >
                  <Link href={button.link}>
                    <motion.div
                      layout
                      transition={spring}
                      className={`inline-flex items-center justify-center overflow-hidden rounded-xl border text-xs font-medium ${
                        button.isHighlight
                          ? "bg-white text-zinc-900 shadow-md"
                          : "border-white/10 bg-white/10 text-white"
                      }`}
                      animate={{
                        paddingLeft: isHovered ? 16 : 12,
                        paddingRight: isHovered ? 16 : 12,
                      }}
                    >
                      <motion.span
                        className="flex h-10 w-4 items-center justify-center"
                        animate={{ scale: isHovered ? 1.08 : 1 }}
                        transition={spring}
                      >
                        {button.icon}
                      </motion.span>

                      <AnimatePresence initial={false}>
                        {isHovered && (
                          <motion.span
                            initial={{ width: 0, opacity: 0, x: -8 }}
                            animate={{ width: "auto", opacity: 1, x: 0 }}
                            exit={{ width: 0, opacity: 0, x: -8 }}
                            transition={{ duration: 0.22, ease: "easeOut" }}
                            className="overflow-hidden whitespace-nowrap pl-2"
                          >
                            {button.name}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}