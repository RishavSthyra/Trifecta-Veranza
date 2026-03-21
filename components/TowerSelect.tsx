"use client";

import React, { useState } from "react";
import { motion, type Variants, type Easing } from "framer-motion";
import Image from "next/image";
import { Building2, CheckCircle2 } from "lucide-react";

type TowerType = "Tower1" | "Tower2";

export default function TowerSelect() {
  
  const [selectedTower, setSelectedTower] = useState<TowerType | null>(null);

  const smoothEase: Easing = [0.22, 1, 0.36, 1];

  const slideFromRight: Variants = {
    hidden: { opacity: 0, x: 64 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.65, ease: smoothEase },
    },
  };

  const itemAnim: Variants = {
    hidden: { opacity: 0, y: 30, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.42, ease: smoothEase },
    },
  };

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-[#f5f7fb] text-zinc-900 dark:bg-black dark:text-white">
      <Image
        src="/plan image.webp"
        alt="Master plan"
        fill
        priority
        className="object-cover"
      />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-500/10" />
        <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-violet-300/20 blur-3xl dark:bg-violet-500/10" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-blue-300/20 blur-3xl dark:bg-blue-500/10" />
      </div>

      <div className="relative z-10 w-full px-4 py-6 md:px-6 lg:px-8">
        <motion.aside
          variants={slideFromRight}
          initial="hidden"
          animate="visible"
          className="ml-auto w-full max-w-[420px]"
        >
          <div className="space-y-4">
            <motion.div
              variants={itemAnim}
              initial="hidden"
              animate="visible"
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.995 }}
            >
              <button
                type="button"
                onClick={() => setSelectedTower("Tower1")}
                className={`w-full rounded-[28px] border p-5 text-left shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-2xl transition ${
                  selectedTower === "Tower1"
                    ? "border-cyan-400/70 bg-cyan-100/70 ring-2 ring-cyan-300/50 dark:border-cyan-400/40 dark:bg-cyan-500/10 dark:ring-cyan-400/20"
                    : "border-white/70 bg-white/70 hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`rounded-2xl p-3 ${
                        selectedTower === "Tower1"
                          ? "bg-cyan-500 text-white"
                          : "bg-zinc-900 text-white dark:bg-white dark:text-black"
                      }`}
                    >
                      <Building2 className="h-5 w-5" />
                    </div>

                    <div>
                      <h2 className="text-lg font-semibold">Tower 1</h2>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Premium residences with open park-facing views.
                      </p>
                    </div>
                  </div>

                  {selectedTower === "Tower1" && (
                    <CheckCircle2 className="mt-1 h-5 w-5 text-cyan-600 dark:text-cyan-300" />
                  )}
                </div>
              </button>
            </motion.div>

            <motion.div
              variants={itemAnim}
              initial="hidden"
              animate="visible"
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.995 }}
            >
              <button
                type="button"
                onClick={() => setSelectedTower("Tower2")}
                className={`w-full rounded-[28px] border p-5 text-left shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-2xl transition ${
                  selectedTower === "Tower2"
                    ? "border-violet-400/70 bg-violet-100/70 ring-2 ring-violet-300/50 dark:border-violet-400/40 dark:bg-violet-500/10 dark:ring-violet-400/20"
                    : "border-white/70 bg-white/70 hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`rounded-2xl p-3 ${
                        selectedTower === "Tower2"
                          ? "bg-violet-500 text-white"
                          : "bg-zinc-900 text-white dark:bg-white dark:text-black"
                      }`}
                    >
                      <Building2 className="h-5 w-5" />
                    </div>

                    <div>
                      <h2 className="text-lg font-semibold">Tower 2</h2>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Larger layouts with clubhouse and skyline access.
                      </p>
                    </div>
                  </div>

                  {selectedTower === "Tower2" && (
                    <CheckCircle2 className="mt-1 h-5 w-5 text-violet-600 dark:text-violet-300" />
                  )}
                </div>
              </button>
            </motion.div>
          </div>
        </motion.aside>
      </div>
    </div>
  );
}
