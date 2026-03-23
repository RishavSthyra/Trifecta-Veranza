"use client";

import { useState } from "react";
import { motion, type Variants, type Easing } from "framer-motion";
import Image, { type StaticImageData } from "next/image";
import { CheckCircle2 } from "lucide-react";
import towerimg from "@/assets/Tower.avif";
import type { TowerType } from "@/types/inventory";

export type { TowerType } from "@/types/inventory";

type TowerSelectProps = {
  selectedTower?: TowerType | null;
  onSelectTower?: (tower: TowerType) => void;
  embedded?: boolean;
};

const towerCards: Array<{
  value: TowerType;
  accent: string;
  accentMuted: string;
  accentCheck: string;
  description: string;
  image: StaticImageData;
  imageAlt: string;
  imageClass: string;
}> = [
  {
    value: "Tower A",
    accent:
      "border-cyan-300 bg-white ring-1 ring-cyan-200",
    accentMuted:
      "border-zinc-200 bg-white hover:border-zinc-300",
    accentCheck: "text-cyan-600",
    description: "Premium residences with open park-facing views.",
    image: towerimg,
    imageAlt: "Tower A exterior",
    imageClass:
      "absolute -bottom-[8%] -left-[10%] h-[122%] w-auto max-w-none object-contain object-bottom-left",
  },
  {
    value: "Tower B",
    accent:
      "border-violet-300 bg-white ring-1 ring-violet-200",
    accentMuted:
      "border-zinc-200 bg-white hover:border-zinc-300",
    accentCheck: "text-violet-600",
    description: "Larger layouts with clubhouse and skyline access.",
    image:   towerimg,
    imageAlt: "Tower B exterior",
    imageClass:
      "absolute -bottom-[10%] -left-[8%] h-[126%] w-auto max-w-none object-contain object-bottom-left",
  },
];

function TowerSelectPanel({
  selectedTower,
  onSelectTower,
}: {
  selectedTower: TowerType | null;
  onSelectTower: (tower: TowerType) => void;
}) {
  const smoothEase: Easing = [0.22, 1, 0.36, 1];

  const slideFromRight: Variants = {
    hidden: { opacity: 0, x: 48 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.55, ease: smoothEase },
    },
  };

  const itemAnim: Variants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.38, ease: smoothEase },
    },
  };

  return (
    <motion.aside
      variants={slideFromRight}
      initial="hidden"
      animate="visible"
      className="w-full"
    >
      <div className="relative overflow-hidden rounded-[34px] border border-white/35 bg-white/18 p-3 shadow-[0_24px_80px_rgba(15,23,42,0.16)] backdrop-blur-[22px] sm:p-4">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/35 via-white/10 to-transparent" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-white/80" />
        <div className="pointer-events-none absolute -right-20 top-8 h-36 w-36 rounded-full bg-cyan-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-4 h-32 w-32 rounded-full bg-violet-200/25 blur-3xl" />

        <div className="relative mb-4 px-2 pt-1 sm:mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-zinc-500/90">
            Master Plan
          </p>
          <h2 className="mt-2 text-[1.55rem] font-semibold tracking-[-0.03em] text-zinc-950 sm:text-[1.8rem]">
            Choose Your Tower
          </h2>
          <p className="mt-1.5 max-w-[28rem] text-sm leading-6 text-zinc-600">
            Start with the tower, then we will open the matching inventory filters.
          </p>
        </div>

        <div className="space-y-5 sm:space-y-6">
          {towerCards.map((towerCard) => {
            const isActive = selectedTower === towerCard.value;

            return (
              <motion.div
                key={towerCard.value}
                variants={itemAnim}
                initial="hidden"
                animate="visible"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.995 }}
              >
                <button
                  type="button"
                  onClick={() => onSelectTower(towerCard.value)}
                  className={`group relative w-full cursor-pointer overflow-hidden rounded-[30px] border text-left shadow-[0_18px_55px_rgba(15,23,42,0.10)] backdrop-blur-xl transition duration-300 ${
                    isActive
                      ? `${towerCard.accent} bg-white shadow-[0_24px_70px_rgba(15,23,42,0.14)]`
                      : `${towerCard.accentMuted} bg-white`
                  }`}
                >
                  <div className="pointer-events-none absolute inset-0 bg-white to-transparent opacity-90" />
                  <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-white/90" />
                  <div
                    className={`pointer-events-none absolute -right-10 top-4 h-24 w-24 rounded-full blur-3xl transition duration-300 ${
                      isActive
                        ? "bg-cyan-200/35 opacity-100"
                        : "bg-white/35 opacity-0 group-hover:opacity-100"
                    }`}
                  />

                  <div className="grid min-h-[160px] grid-cols-[50%_50%] sm:min-h-[178px] sm:grid-cols-[48%_52%]">
                    <div className="relative min-h-[156px] overflow-hidden rounded-l-[30px] bg-white to-transparent sm:min-h-[172px]">
                      <Image
                        src={towerCard.image}
                        alt={towerCard.imageAlt}
                        className={`${towerCard.imageClass} origin-bottom-left w-full object-cover transition  duration-300 ${
                          isActive
                            ? "grayscale-0 scale-[1.02]"
                            : "grayscale scale-[1.02] group-hover:grayscale-0 group-hover:scale-[1.06]"
                        }`}
                      />
                    </div>

                    <div className="relative flex min-w-0 flex-col justify-center px-5 py-4 sm:px-6 sm:py-5">
                      <div className="max-w-[280px]">
                        <h3 className="text-2xl font-medium tracking-[-0.03em] text-zinc-950 sm:text-[2rem] sm:leading-[1.02]">
                          {towerCard.value}
                        </h3>

                        {/* <p className="mt-3 text-[14px] leading-6 text-zinc-600 sm:mt-4 sm:text-[15px] sm:leading-7">
                          {towerCard.description}
                        </p> */}

                        <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-400 transition group-hover:text-zinc-500 sm:mt-7 sm:text-[11px]">
                          Tap to explore tower
                        </p>
                      </div>
                    </div>
                  </div>

                  {isActive ? (
                    <CheckCircle2
                      className={`absolute right-4 top-4 h-5 w-5 ${towerCard.accentCheck}`}
                    />
                  ) : null}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.aside>
  );
}

export default function TowerSelect({
  selectedTower,
  onSelectTower,
  embedded = false,
}: TowerSelectProps) {
  const [internalSelectedTower, setInternalSelectedTower] =
    useState<TowerType | null>(null);

  const isControlled = selectedTower !== undefined;
  const activeTower = isControlled ? selectedTower : internalSelectedTower;

  const handleSelectTower = (tower: TowerType) => {
    if (!isControlled) {
      setInternalSelectedTower(tower);
    }
    onSelectTower?.(tower);
  };

  if (embedded) {
    return (
      <TowerSelectPanel
        selectedTower={activeTower}
        onSelectTower={handleSelectTower}
      />
    );
  }

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-[#f5f7fb] text-zinc-900">
      <div className="relative z-10 w-full px-4 py-6 md:px-6 lg:px-8">
        <div className="ml-auto w-full max-w-[420px]">
          <TowerSelectPanel
            selectedTower={activeTower}
            onSelectTower={handleSelectTower}
          />
        </div>
      </div>
    </div>
  );
}
