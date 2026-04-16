"use client";

import { useEffect, useState } from "react";
import Image, { type StaticImageData } from "next/image";
import { CheckCircle2, ChevronRight, X } from "lucide-react";
import towerimg from "@/assets/Tower.avif";
import towerAimg from "@/assets/New-a.jpg"
import towerBimg from "@/assets/New-B.jpg"
import type { TowerType } from "@/types/inventory";

export type { TowerType } from "@/types/inventory";

type TowerSelectProps = {
  selectedTower?: TowerType | null;
  onSelectTower?: (tower: TowerType) => void;
  onTopViewClick?: () => void;
  onClose?: () => void;
  embedded?: boolean;
  isTopViewActive?: boolean;
  mobile?: boolean;
  compactDesktop?: boolean;
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
  mobileImageClass: string;
}> = [
  {
    value: "Tower A",
    accent: "border-cyan-300 bg-white ring-1 ring-cyan-200",
    accentMuted: "border-zinc-200 bg-white hover:border-zinc-300",
    accentCheck: "text-cyan-600",
    description: "Premium residences with open park-facing views.",
    image: towerAimg,
    imageAlt: "Tower A exterior",
    imageClass:
      "absolute -bottom-[8%] -left-[10%] h-[122%] w-auto max-w-none object-contain object-bottom-left",
    mobileImageClass: "scale-[1.28] object-cover object-[34%_100%]",
  },
  {
    value: "Tower B",
    accent: "border-violet-300 bg-white ring-1 ring-violet-200",
    accentMuted: "border-zinc-200 bg-white hover:border-zinc-300",
    accentCheck: "text-violet-600",
    description: "Larger layouts with clubhouse and skyline access.",
    image: towerBimg,
    imageAlt: "Tower B exterior",
    imageClass:
      "absolute -bottom-[10%] -left-[8%] h-[126%] w-auto max-w-none object-contain object-bottom-left",
    mobileImageClass: "scale-[1.28] object-cover object-[34%_100%]",
  },
];

function TowerSelectPanel({
  isTopViewActive: _isTopViewActive = false,
  onTopViewClick: _onTopViewClick,
  onClose,
  selectedTower,
  onSelectTower,
  mobile = false,
  compactDesktop = false,
}: {
  isTopViewActive?: boolean;
  onTopViewClick?: () => void;
  onClose?: () => void;
  selectedTower: TowerType | null;
  onSelectTower: (tower: TowerType) => void;
  mobile?: boolean;
  compactDesktop?: boolean;
}) {
  void _isTopViewActive;
  void _onTopViewClick;

  if (mobile) {
    return (
      <aside className="w-full">
        <div className="px-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500/85">
                Master Plan
              </p>
              <h2 className="mt-1.5 text-[1.35rem] font-semibold tracking-[-0.03em] text-zinc-950">
                Choose Your Tower
              </h2>
              <p className="mt-1 text-sm leading-5 text-zinc-600">
                Pick a tower to open the matching flats.
              </p>
            </div>

            {/* {onTopViewClick ? (
              <button
                type="button"
                onClick={onTopViewClick}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
                  isTopViewActive
                    ? "border-zinc-900 bg-zinc-900 text-white shadow-[0_12px_24px_rgba(15,23,42,0.18)]"
                    : "border-zinc-200 bg-white/92 text-zinc-700 hover:border-zinc-300 hover:bg-white"
                }`}
              >
                <Layers3 className="h-3.5 w-3.5" />
                Top View
              </button>
            ) : null} */}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {towerCards.map((towerCard) => {
            const isActive = selectedTower === towerCard.value;

            return (
              <button
                key={towerCard.value}
                type="button"
                onClick={() => onSelectTower(towerCard.value)}
                className={`group flex w-full items-center gap-3 rounded-full border px-3 py-3 text-left shadow-[0_14px_36px_rgba(15,23,42,0.10)] transition ${
                  isActive
                    ? "border-zinc-900/15 bg-white"
                    : "border-white/70 bg-white/84"
                }`}
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-zinc-100 ring-1 ring-black/5">
                  <Image
                    src={towerCard.image}
                    alt={towerCard.imageAlt}
                    
                    className={towerCard.mobileImageClass}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold tracking-[-0.03em] text-zinc-950">
                    {towerCard.value}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
                    Tap to explore
                  </p>
                </div>

                {isActive ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-zinc-900" />
                ) : (
                  <ChevronRight className="h-5 w-5 shrink-0 text-zinc-400 transition group-hover:text-zinc-700" />
                )}
              </button>
            );
          })}
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-full">
      <div
        className={`relative overflow-hidden border border-white/35 bg-white/18 shadow-[0_24px_80px_rgba(15,23,42,0.16)] backdrop-blur-[22px] ${
          compactDesktop
            ? "rounded-[26px] p-2.5"
            : "rounded-[30px] p-3 xl:p-3.5 2xl:rounded-[34px] 2xl:p-4"
        }`}
      >
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/35 via-white/10 to-transparent" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-white/80" />
        <div className="pointer-events-none absolute -right-20 top-8 h-36 w-36 rounded-full bg-cyan-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-4 h-32 w-32 rounded-full bg-violet-200/25 blur-3xl" />

        <div
          className={`relative px-2 pt-1 ${
            compactDesktop ? "mb-3" : "mb-4 xl:mb-4 2xl:mb-5"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-zinc-500/90">
                Master Plan
              </p>
              <h2
                className={`mt-2 font-semibold tracking-[-0.03em] text-zinc-950 ${
                  compactDesktop
                    ? "text-[1.2rem]"
                    : "text-[1.42rem] xl:text-[1.5rem] 2xl:text-[1.8rem]"
                }`}
              >
                Choose Your Tower
              </h2>
              <p
                className={`mt-1.5 text-zinc-600 ${
                  compactDesktop
                    ? "max-w-[18rem] text-[12px] leading-[1.35rem]"
                    : "max-w-[24rem] text-[13px] leading-5 2xl:max-w-[28rem] 2xl:text-sm 2xl:leading-6"
                }`}
              >
                Start with the tower, then we will open the matching inventory
                filters.
              </p>
            </div>

            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/45 bg-[linear-gradient(145deg,rgba(255,255,255,0.82),rgba(255,255,255,0.52))] text-zinc-700 shadow-[0_18px_38px_rgba(15,23,42,0.12)] backdrop-blur-xl transition hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(255,255,255,0.66))] hover:text-zinc-900"
                aria-label="Close tower selection panel"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            ) : null}

            {/* {onTopViewClick ? (
              <button
                type="button"
                onClick={onTopViewClick}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
                  isTopViewActive
                    ? "border-zinc-900 bg-zinc-900 text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)]"
                    : "border-zinc-200 bg-white/92 text-zinc-700 hover:border-zinc-300 hover:bg-white"
                }`}
              >
                <Layers3 className="h-3.5 w-3.5" />
                Top View
              </button>
            ) : null} */}
          </div>
        </div>

        <div className={compactDesktop ? "space-y-3" : "space-y-4 xl:space-y-4 2xl:space-y-6"}>
          {towerCards.map((towerCard) => {
            const isActive = selectedTower === towerCard.value;

            return (
              <div
                key={towerCard.value}
              >
                <button
                  type="button"
                  onClick={() => onSelectTower(towerCard.value)}
                  className={`group relative w-full cursor-pointer overflow-hidden border text-left shadow-[0_18px_55px_rgba(15,23,42,0.10)] backdrop-blur-xl transition duration-300 ${
                    isActive
                      ? `${towerCard.accent} bg-white shadow-[0_24px_70px_rgba(15,23,42,0.14)]`
                      : `${towerCard.accentMuted} bg-white`
                  } ${compactDesktop ? "rounded-[24px]" : "rounded-[30px]"}`}
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

                  <div
                    className={`grid grid-cols-[48%_52%] ${
                      compactDesktop
                        ? "min-h-[124px]"
                        : "min-h-[142px] xl:min-h-[150px] 2xl:min-h-[178px] 2xl:grid-cols-[48%_52%]"
                    }`}
                  >
                    <div
                      className={`relative overflow-hidden bg-white to-transparent ${
                        compactDesktop
                          ? "min-h-[120px] rounded-l-[24px]"
                          : "min-h-[138px] rounded-l-[30px] xl:min-h-[146px] 2xl:min-h-[172px]"
                      }`}
                    >
                      <Image
                        src={towerCard.image}
                        alt={towerCard.imageAlt}
                        className={`${towerCard.imageClass} origin-bottom-left w-full object-cover object-bottom-right transition  duration-300 ${
                          isActive
                            ? "grayscale-0 scale-[1.02]"
                            : " scale-[1.02] group-hover:grayscale-0 group-hover:scale-[1.06]"
                        }`}
                      />
                    </div>

                    <div
                      className={`relative flex min-w-0 flex-col justify-center ${
                        compactDesktop
                          ? "px-3 py-3"
                          : "px-4 py-4 xl:px-4.5 2xl:px-6 2xl:py-5"
                      }`}
                    >
                      <div className={compactDesktop ? "max-w-[186px]" : "max-w-[240px] 2xl:max-w-[280px]"}>
                        <h3
                          className={`font-medium tracking-[-0.03em] text-zinc-950 ${
                            compactDesktop
                              ? "text-[1.22rem]"
                              : "text-[1.52rem] xl:text-[1.6rem] 2xl:text-[2rem] 2xl:leading-[1.02]"
                          }`}
                        >
                          {towerCard.value}
                        </h3>

                        {/* <p className="mt-3 text-[14px] leading-6 text-zinc-600 sm:mt-4 sm:text-[15px] sm:leading-7">
                          {towerCard.description}
                        </p> */}

                        <p
                          className={`font-semibold uppercase tracking-[0.24em] text-zinc-400 transition group-hover:text-zinc-500 ${
                            compactDesktop
                              ? "mt-3 text-[9px]"
                              : "mt-5 text-[10px] 2xl:mt-7 2xl:text-[11px]"
                          }`}
                        >
                          Tap to explore tower
                        </p>
                      </div>
                    </div>
                  </div>

                  {isActive ? (
                    <CheckCircle2
                      className={`absolute ${compactDesktop ? "right-3 top-3 h-4.5 w-4.5" : "right-4 top-4 h-5 w-5"} ${towerCard.accentCheck}`}
                    />
                  ) : null}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

export default function TowerSelect({
  selectedTower,
  onSelectTower,
  onTopViewClick,
  onClose,
  embedded = false,
  isTopViewActive = false,
  mobile = false,
  compactDesktop = false,
}: TowerSelectProps) {
  const [internalSelectedTower, setInternalSelectedTower] =
    useState<TowerType | null>(null);
  const [autoCompactDesktop, setAutoCompactDesktop] = useState(false);

  const isControlled = selectedTower !== undefined;
  const activeTower = isControlled ? selectedTower : internalSelectedTower;
  const shouldUseCompactDesktop = compactDesktop || autoCompactDesktop;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const compactDesktopMedia = window.matchMedia(
      "(min-width: 1280px) and (max-width: 1699px)",
    );
    const syncCompactDesktop = () => {
      setAutoCompactDesktop(compactDesktopMedia.matches);
    };

    syncCompactDesktop();
    compactDesktopMedia.addEventListener("change", syncCompactDesktop);

    return () => {
      compactDesktopMedia.removeEventListener("change", syncCompactDesktop);
    };
  }, []);

  const handleSelectTower = (tower: TowerType) => {
    if (!isControlled) {
      setInternalSelectedTower(tower);
    }
    onSelectTower?.(tower);
  };

  if (embedded) {
    return (
      <TowerSelectPanel
        isTopViewActive={isTopViewActive}
        onTopViewClick={onTopViewClick}
        onClose={onClose}
        compactDesktop={shouldUseCompactDesktop}
        mobile={mobile}
        selectedTower={activeTower}
        onSelectTower={handleSelectTower}
      />
    );
  }

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-[#f5f7fb] text-zinc-900">
      <div
        className="relative z-10 w-full px-4 py-6 md:px-6 lg:px-8"
        style={{ paddingTop: "max(env(safe-area-inset-top), 1.5rem)" }}
      >
        <div className="ml-auto w-full max-w-[420px]">
          <TowerSelectPanel
            isTopViewActive={isTopViewActive}
            onTopViewClick={onTopViewClick}
            onClose={onClose}
            compactDesktop={shouldUseCompactDesktop}
            mobile={mobile}
            selectedTower={activeTower}
            onSelectTower={handleSelectTower}
          />
        </div>
      </div> 
    </div>
  );
}
