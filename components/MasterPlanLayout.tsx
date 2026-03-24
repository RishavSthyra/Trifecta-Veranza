"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  motion,
  AnimatePresence,
  type Variants,
  type Easing,
} from "framer-motion";
import MasterPlanArrowMarkers from "./MasterPlanArrowMarkers";
import { masterPlanArrowPoints } from "@/data/masterPlanArrowPoints";
import GlassSelect, { GlassSelectItem } from "./ui/GlassSelect";
import {
  ArrowLeft,
  BedDouble,
  Building2,
  IndianRupee,
  MapPin,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import TowerSelect from "./TowerSelect";
import type { InventoryApartment, TowerType } from "@/types/inventory";

const facingOptions = ["All", "North", "South", "East", "West"] as const;
const statusOptions = ["All", "Available", "Reserved", "Sold"] as const;
const bhkOptions = ["All", "2", "3"] as const;

const smoothEase: Easing = [0.22, 1, 0.36, 1];

const panelVariants: Variants = {
  hidden: {
    opacity: 0,
    x: "100%",
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.9,
      ease: smoothEase,
      delay: 0.2,
    },
  },
  exit: {
    opacity: 0,
    x: "100%",
    transition: {
      duration: 0.75,
      ease: smoothEase,
    },
  },
};

const staggerWrap: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.12,
    },
  },
};

const itemAnim: Variants = {
  hidden: { opacity: 0, x: 30, scale: 0.98 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.42, ease: smoothEase },
  },
  exit: {
    opacity: 0,
    x: 20,
    scale: 0.98,
    transition: { duration: 0.2 },
  },
};

type MasterPlanLayoutProps = {
  initialApartments?: InventoryApartment[];
};

export default function MasterPlanLayout({
  initialApartments = [],
}: MasterPlanLayoutProps) {
  const router = useRouter();

  const rootRef = useRef<HTMLDivElement | null>(null);
  const idleVideoRef = useRef<HTMLVideoElement | null>(null);
  const reverseVideoRef = useRef<HTMLVideoElement | null>(null);
  const leavingRef = useRef(false);
  const touchStartYRef = useRef<number | null>(null);

  const [search, setSearch] = useState("");
  const [selectedTower, setSelectedTower] = useState<TowerType | null>(null);
  const [apartments, setApartments] = useState<InventoryApartment[]>(
    initialApartments,
  );
  const [isInventoryLoading, setIsInventoryLoading] = useState(
    initialApartments.length === 0,
  );
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [bhk, setBhk] = useState<(typeof bhkOptions)[number]>("All");
  const [facing, setFacing] = useState<(typeof facingOptions)[number]>("All");
  const [status, setStatus] = useState<(typeof statusOptions)[number]>("All");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(200);
  const [minArea, setMinArea] = useState(0);

  const [isLeaving, setIsLeaving] = useState(false);
  const [showIdleVideo, setShowIdleVideo] = useState(true);
  const [showReverseVideo, setShowReverseVideo] = useState(false);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let activeController: AbortController | null = null;

    const loadInventory = async (showLoadingState: boolean) => {
      if (showLoadingState && isMounted) {
        setIsInventoryLoading(true);
      }

      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;

      try {
        const response = await fetch("/api/inventory", {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = (await response.json()) as {
          apartments?: InventoryApartment[];
          message?: string;
        };

        if (!response.ok || !result.apartments) {
          throw new Error(result.message || "Failed to fetch inventory.");
        }

        if (!isMounted) {
          return;
        }

        setApartments(result.apartments);
        setInventoryError(null);
      } catch (error) {
        if (controller.signal.aborted || !isMounted) {
          return;
        }

        setInventoryError(
          error instanceof Error
            ? error.message
            : "Failed to load inventory from the database.",
        );
      } finally {
        if (showLoadingState && isMounted) {
          setIsInventoryLoading(false);
        }
      }
    };

    if (initialApartments.length === 0) {
      void loadInventory(true);
    }

    const refreshInterval = window.setInterval(() => {
      void loadInventory(false);
    }, 3000);

    return () => {
      isMounted = false;
      activeController?.abort();
      window.clearInterval(refreshInterval);
    };
  }, [initialApartments.length]);

  const filteredApartments = useMemo(() => {
    if (!selectedTower) {
      return [];
    }

    return apartments.filter((apartment) => {
      const matchesSearch = apartment.title
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesTower = apartment.tower === selectedTower;
      const matchesBhk = bhk === "All" || apartment.bhk === Number(bhk);
      const matchesFacing = facing === "All" || apartment.facing === facing;
      const matchesStatus = status === "All" || apartment.status === status;
      const matchesPrice =
        apartment.priceLakhs >= minPrice && apartment.priceLakhs <= maxPrice;
      const matchesArea = apartment.areaSqft >= minArea;

      return (
        matchesSearch &&
        matchesTower &&
        matchesBhk &&
        matchesFacing &&
        matchesStatus &&
        matchesPrice &&
        matchesArea
      );
    });
  }, [
    apartments,
    search,
    selectedTower,
    bhk,
    facing,
    status,
    minPrice,
    maxPrice,
    minArea,
  ]);

  const resetFilters = () => {
    setSearch("");
    setBhk("All");
    setFacing("All");
    setStatus("All");
    setMinPrice(0);
    setMaxPrice(200);
    setMinArea(0);
  };

  const handleTowerSelect = (tower: TowerType) => {
    setSelectedTower(tower);
    setIsMobileSheetOpen(true);
  };

  const handleBackToTowerSelect = () => {
    resetFilters();
    setSelectedTower(null);
    setIsMobileSheetOpen(true);
  };

  const handleIdleVideoReady = async () => {
    const idleVideo = idleVideoRef.current;
    if (!idleVideo) return;

    try {
      await idleVideo.play();
    } catch {
      // muted autoplay should usually work, but keep the fallback visible if it doesn't
    }
  };

  const leaveToHome = useCallback(async () => {
    if (leavingRef.current) return;
    leavingRef.current = true;

    setIsLeaving(true);
    setShowReverseVideo(true);
    setShowIdleVideo(false);

    if (idleVideoRef.current) {
      idleVideoRef.current.pause();
    }

    const reverseVideo = reverseVideoRef.current;
    if (!reverseVideo) {
      router.push("/");
      return;
    }

    reverseVideo.pause();
    reverseVideo.currentTime = 0;

    try {
      await reverseVideo.play();
    } catch {
      router.push("/");
    }
  }, [router]);

  useEffect(() => {
    const isInsideScrollArea = (target: EventTarget | null) => {
      return target instanceof HTMLElement
        ? Boolean(target.closest("[data-scroll-area]"))
        : false;
    };

    const blockAllScrollLikeActions = (e: Event) => {
      if (leavingRef.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (leavingRef.current) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (isInsideScrollArea(target)) return;

      if (e.deltaY < -20) {
        e.preventDefault();
        e.stopPropagation();
        leaveToHome();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (leavingRef.current) {
        const blockedKeys = ["ArrowUp", "PageUp", "Home", " "];

        if (blockedKeys.includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }

      if (isInsideScrollArea(e.target)) return;

      const upKeys = ["ArrowUp", "PageUp", "Home"];
      if (upKeys.includes(e.key)) {
        e.preventDefault();
        leaveToHome();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (isInsideScrollArea(e.target)) {
        touchStartYRef.current = null;
        return;
      }

      if (e.touches.length > 0) {
        touchStartYRef.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (leavingRef.current) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (isInsideScrollArea(e.target)) return;

      const startY = touchStartYRef.current;
      const currentY = e.touches[0]?.clientY;

      if (startY == null || currentY == null) return;

      const delta = currentY - startY;

      if (delta > 30) {
        e.preventDefault();
        e.stopPropagation();
        leaveToHome();
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });

    window.addEventListener("scroll", blockAllScrollLikeActions, {
      passive: false,
    });
    document.addEventListener(
      "gesturestart",
      blockAllScrollLikeActions as EventListener,
      { passive: false },
    );

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("scroll", blockAllScrollLikeActions);
      document.removeEventListener(
        "gesturestart",
        blockAllScrollLikeActions as EventListener,
      );
    };
  }, [leaveToHome]);

  return (
    <div
      ref={rootRef}
      className="relative h-dvh w-full overflow-hidden bg-black text-zinc-900 [overflow-anchor:none] dark:text-white"
    >
      <video
        ref={idleVideoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        src="/master_plan_idle_loop.webm"
        onCanPlay={() => {
          void handleIdleVideoReady();
        }}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
          showIdleVideo && !showReverseVideo
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      <video
        ref={reverseVideoRef}
        muted
        playsInline
        preload="none"
        onEnded={() => router.push("/")}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
          showReverseVideo ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <source
          src="https://res.cloudinary.com/dlhfbu3kh/video/upload/v1774329012/master_plan_video_reverse_ydmfy3.webm"
          type="video/webm"
        />
      </video>

      {!isLeaving ? (
        <MasterPlanArrowMarkers points={masterPlanArrowPoints} />
      ) : null}

      <div className="pointer-events-none absolute inset-0 z-[1]">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-500/10" />
        <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-violet-300/20 blur-3xl dark:bg-violet-500/10" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-blue-300/20 blur-3xl dark:bg-blue-500/10" />
      </div>

      <div
        className="relative z-10 h-full w-full px-4 py-6 transition-opacity duration-500 md:px-6 lg:px-8"
      >
        <div
          className={`grid h-full gap-6 ${
            selectedTower
              ? "xl:grid-cols-[minmax(0,1fr)_420px]"
              : "xl:grid-cols-[minmax(0,1fr)_540px]"
          }`}
        >
          <div className="hidden xl:block" />

          <AnimatePresence mode="wait">
            {!isLeaving && (
              <motion.aside
                key="sidebar"
                variants={panelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="hidden min-w-0 xl:col-start-2 xl:block xl:h-full"
              >
                <div
                  className={`sticky top-6 ml-auto flex h-[calc(100dvh-3rem)] w-full flex-col gap-6 overflow-y-auto overscroll-contain pr-1 [overflow-anchor:none] ${
                    selectedTower ? "max-w-[420px]" : "max-w-[540px]"
                  }`}
                  data-scroll-area="sidebar"
                >
                  {selectedTower ? (
                    <>
                      <MasterPlanFiltersCard
                        search={search}
                        onSearchChange={setSearch}
                        selectedTower={selectedTower}
                        bhk={bhk}
                        onBhkChange={setBhk}
                        facing={facing}
                        onFacingChange={setFacing}
                        status={status}
                        onStatusChange={setStatus}
                        minPrice={minPrice}
                        onMinPriceChange={setMinPrice}
                        maxPrice={maxPrice}
                        onMaxPriceChange={setMaxPrice}
                        minArea={minArea}
                        onMinAreaChange={setMinArea}
                        onReset={resetFilters}
                        onBack={handleBackToTowerSelect}
                      />

                      <MasterPlanResultsCard
                        filteredApartments={filteredApartments}
                        isInventoryLoading={isInventoryLoading}
                        inventoryError={inventoryError}
                      />
                    </>
                  ) : (
                    <TowerSelect
                      embedded
                      selectedTower={selectedTower}
                      onSelectTower={handleTowerSelect}
                    />
                  )}
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>

        {!isLeaving ? (
          <>
            <AnimatePresence>
              {selectedTower && isMobileSheetOpen ? (
                <motion.button
                  type="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMobileSheetOpen(false)}
                  className="absolute inset-0 z-20 bg-black/10 backdrop-blur-[1px] xl:hidden"
                  aria-label="Close master plan panel"
                />
              ) : null}
            </AnimatePresence>

            {!isMobileSheetOpen && selectedTower ? (
              <button
                type="button"
                onClick={() => setIsMobileSheetOpen(true)}
                className="absolute bottom-6 right-4 z-30 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-4 py-3 text-sm font-medium text-zinc-900 shadow-[0_14px_36px_rgba(15,23,42,0.18)] backdrop-blur-xl xl:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {filteredApartments.length} units
              </button>
            ) : null}

            <motion.div
              initial={false}
              animate={
                isMobileSheetOpen
                  ? { y: 0, opacity: 1 }
                  : { y: "110%", opacity: 0 }
              }
              transition={{ duration: 0.45, ease: smoothEase }}
              className={`absolute inset-x-3 bottom-3 z-30 xl:hidden ${
                isMobileSheetOpen ? "pointer-events-auto" : "pointer-events-none"
              }`}
            >
              <div
                className="flex max-h-[calc(100dvh-5.5rem)] min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/60 bg-white/92 shadow-[0_-20px_50px_rgba(15,23,42,0.20)] backdrop-blur-2xl dark:border-white/10 dark:bg-black/70 sm:rounded-[32px]"
                data-scroll-area="mobile-sheet"
              >
                <div className="flex items-center justify-between border-b border-zinc-200/80 px-4 py-3 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-white/20" />
                    <div>
                      <p className="text-sm font-semibold">
                        {selectedTower ? "Master Plan" : "Choose Tower"}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {selectedTower
                          ? `${filteredApartments.length} matching units`
                          : "Select a tower to open filters"}
                      </p>
                    </div>
                  </div>

                  {selectedTower ? (
                    <button
                      type="button"
                      onClick={() => setIsMobileSheetOpen(false)}
                      className="rounded-xl border border-zinc-200 bg-white/80 p-2 text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white"
                      aria-label="Close master plan panel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
                  <div className="flex min-h-full flex-col gap-3 sm:gap-4">
                    {selectedTower ? (
                      <>
                        <MasterPlanFiltersCard
                          search={search}
                          onSearchChange={setSearch}
                          selectedTower={selectedTower}
                          bhk={bhk}
                          onBhkChange={setBhk}
                          facing={facing}
                          onFacingChange={setFacing}
                          status={status}
                          onStatusChange={setStatus}
                          minPrice={minPrice}
                          onMinPriceChange={setMinPrice}
                          maxPrice={maxPrice}
                          onMaxPriceChange={setMaxPrice}
                          minArea={minArea}
                          onMinAreaChange={setMinArea}
                          onReset={resetFilters}
                          onBack={handleBackToTowerSelect}
                          compact
                        />

                        <MasterPlanResultsCard
                          filteredApartments={filteredApartments}
                          isInventoryLoading={isInventoryLoading}
                          inventoryError={inventoryError}
                          compact
                        />
                      </>
                    ) : (
                      <TowerSelect
                        embedded
                        selectedTower={selectedTower}
                        onSelectTower={handleTowerSelect}
                      />
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function MasterPlanFiltersCard({
  search,
  onSearchChange,
  selectedTower,
  bhk,
  onBhkChange,
  facing,
  onFacingChange,
  status,
  onStatusChange,
  minPrice,
  onMinPriceChange,
  maxPrice,
  onMaxPriceChange,
  minArea,
  onMinAreaChange,
  onReset,
  onBack,
  compact = false,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  selectedTower: TowerType;
  bhk: (typeof bhkOptions)[number];
  onBhkChange: (value: (typeof bhkOptions)[number]) => void;
  facing: (typeof facingOptions)[number];
  onFacingChange: (value: (typeof facingOptions)[number]) => void;
  status: (typeof statusOptions)[number];
  onStatusChange: (value: (typeof statusOptions)[number]) => void;
  minPrice: number;
  onMinPriceChange: (value: number) => void;
  maxPrice: number;
  onMaxPriceChange: (value: number) => void;
  minArea: number;
  onMinAreaChange: (value: number) => void;
  onReset: () => void;
  onBack: () => void;
  compact?: boolean;
}) {
  return (
    <motion.div
      className={`shrink-0 rounded-[24px] border border-white/30 bg-white/60 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-black/25 dark:shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:rounded-[30px] sm:p-5 ${
        compact ? "" : ""
      }`}
    >
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-zinc-900 p-2 text-white dark:bg-white dark:text-black">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Filters</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Refine inventory in real time
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 rounded-full border bg-transparent px-3 py-1.5 text-xs font-medium text-black cursor-pointer transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>

          <button
            type="button"
            onClick={onReset}
            className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 cursor-pointer text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
          >
            Reset
          </button>
        </div>
      </div>

      <div className={compact ? "space-y-4" : "space-y-5"}>
        <FilterBlock label="Selected Tower">
          <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-700 dark:bg-white/5 dark:text-zinc-200">
            <Building2 className="h-4 w-4" />
            {selectedTower}
          </div>
        </FilterBlock>

        <FilterBlock label="Search Unit">
          <div className="group flex items-center gap-2 rounded-2xl border border-zinc-200/80 bg-zinc-50/80 px-3 py-3 shadow-sm transition focus-within:border-zinc-400 focus-within:bg-white dark:border-white/10 dark:bg-white/5 dark:focus-within:border-white/20 dark:focus-within:bg-white/10">
            <Search className="h-4 w-4 text-zinc-500 transition group-focus-within:text-zinc-800 dark:group-focus-within:text-white" />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search unit number"
              className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
            />
          </div>
        </FilterBlock>

        <FilterBlock label="BHK">
          <GlassSelect
            value={bhk}
            onValueChange={(value) =>
              onBhkChange(value as (typeof bhkOptions)[number])
            }
            placeholder="Select BHK"
          >
            {bhkOptions.map((item) => (
              <GlassSelectItem key={item} value={item}>
                {item === "All" ? "All" : `${item} BHK`}
              </GlassSelectItem>
            ))}
          </GlassSelect>
        </FilterBlock>

        <FilterBlock label="Facing">
          <GlassSelect
            value={facing}
            onValueChange={(value) =>
              onFacingChange(value as (typeof facingOptions)[number])
            }
            placeholder="Select facing"
          >
            {facingOptions.map((item) => (
              <GlassSelectItem key={item} value={item}>
                {item}
              </GlassSelectItem>
            ))}
          </GlassSelect>
        </FilterBlock>

        <FilterBlock label="Status">
          <GlassSelect
            value={status}
            onValueChange={(value) =>
              onStatusChange(value as (typeof statusOptions)[number])
            }
            placeholder="Select status"
          >
            {statusOptions.map((item) => (
              <GlassSelectItem key={item} value={item}>
                {item}
              </GlassSelectItem>
            ))}
          </GlassSelect>
        </FilterBlock>

        <FilterBlock label={`Min Price: Rs. ${minPrice}L`}>
          <input
            type="range"
            min={0}
            max={200}
            step={5}
            value={minPrice}
            onChange={(e) => onMinPriceChange(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 dark:bg-white/10"
          />
        </FilterBlock>

        <FilterBlock label={`Max Price: Rs. ${maxPrice}L`}>
          <input
            type="range"
            min={0}
            max={200}
            step={5}
            value={maxPrice}
            onChange={(e) => onMaxPriceChange(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 dark:bg-white/10"
          />
        </FilterBlock>

        <FilterBlock label={`Min Area: ${minArea} sqft`}>
          <input
            type="range"
            min={0}
            max={2500}
            step={50}
            value={minArea}
            onChange={(e) => onMinAreaChange(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 dark:bg-white/10"
          />
        </FilterBlock>
      </div>
    </motion.div>
  );
}

function MasterPlanResultsCard({
  filteredApartments,
  isInventoryLoading,
  inventoryError,
  compact = false,
}: {
  filteredApartments: InventoryApartment[];
  isInventoryLoading: boolean;
  inventoryError: string | null;
  compact?: boolean;
}) {
  return (
    <motion.div
      className={`flex min-h-0 flex-col rounded-[24px] border border-white/30 bg-white/75 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-black/25 dark:shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:rounded-[30px] ${
        compact ? "max-h-[36dvh] flex-none" : "flex-1"
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Matching Flats</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Live inventory from MongoDB
          </p>
        </div>
        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium dark:border-white/10 dark:bg-white/5">
          {filteredApartments.length} units
        </span>
      </div>

      <motion.div
        variants={staggerWrap}
        initial="hidden"
        animate="visible"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2 [overflow-anchor:none]"
        data-scroll-area="results"
      >
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {isInventoryLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex h-[220px] items-center justify-center rounded-[22px] border border-dashed border-zinc-300 bg-zinc-50/70 px-4 text-center dark:border-white/10 dark:bg-white/5"
              >
                <div>
                  <p className="text-sm font-semibold">Loading flats</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Pulling the latest tower inventory.
                  </p>
                </div>
              </motion.div>
            ) : inventoryError ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex h-[220px] items-center justify-center rounded-[22px] border border-dashed border-rose-200 bg-rose-50/80 px-4 text-center"
              >
                <div>
                  <p className="text-sm font-semibold text-rose-700">
                    Inventory could not be loaded
                  </p>
                  <p className="mt-1 text-xs text-rose-600">{inventoryError}</p>
                </div>
              </motion.div>
            ) : filteredApartments.length > 0 ? (
              filteredApartments.map((apartment) => (
                <motion.button
                  key={apartment.id}
                  layout="position"
                  variants={itemAnim}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="group flex w-full items-center justify-between rounded-[22px] border border-zinc-200/50 bg-linear-to-br from-white to-zinc-50 px-4 py-3 text-left shadow-sm transition dark:border-white/10 dark:from-white/10 dark:to-white/5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                        {apartment.title}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          apartment.status === "Available"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                            : apartment.status === "Sold"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                        }`}
                      >
                        {apartment.status}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1 dark:bg-white/5">
                        <Building2 className="h-3.5 w-3.5" />
                        {apartment.tower}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1 dark:bg-white/5">
                        <BedDouble className="h-3.5 w-3.5" />
                        {apartment.bhk} BHK
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1 dark:bg-white/5">
                        <IndianRupee className="h-3.5 w-3.5" />
                        {apartment.priceLakhs}L
                      </span>
                    </div>
                  </div>

                  <div className="ml-4 shrink-0 text-right text-xs text-zinc-500 dark:text-zinc-400">
                    <div className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1 dark:bg-white/5">
                      <MapPin className="h-3.5 w-3.5" />
                      {apartment.facing}
                    </div>
                    <p className="mt-2 font-medium text-zinc-700 dark:text-zinc-300">
                      {apartment.areaSqft} sqft
                    </p>
                    <p className="mt-1 text-[11px]">
                      Floor {apartment.floorLabel}
                    </p>
                  </div>
                </motion.button>
              ))
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex h-[220px] items-center justify-center rounded-[22px] border border-dashed border-zinc-300 bg-zinc-50/70 px-4 text-center dark:border-white/10 dark:bg-white/5"
              >
                <div>
                  <p className="text-sm font-semibold">No flats found</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Try changing the filters.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

function FilterBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      {children}
    </div>
  );
}
