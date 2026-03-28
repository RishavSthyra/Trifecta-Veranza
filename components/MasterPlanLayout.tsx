"use client";

import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import MasterPlanFrameHoverStage from "./MasterPlanFrameHoverStage";
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Building2,
  ChevronDown,
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
const INVENTORY_REFRESH_INTERVAL = 15000;
const TOTAL_MASTER_PLAN_FRAMES = 360;
const MASTER_PLAN_SNAP_FRAMES = [1, 61, 121, 181, 241, 301] as const;

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

function getApartmentSignature(apartments: InventoryApartment[]) {
  return apartments
    .map(
      ({
        id,
        title,
        tower,
        bhk,
        priceLakhs,
        areaSqft,
        facing,
        status,
        floorLabel,
      }) =>
        [
          id,
          title,
          tower,
          bhk,
          priceLakhs,
          areaSqft,
          facing,
          status,
          floorLabel,
        ].join(":"),
    )
    .join("|");
}

export default function MasterPlanLayout({
  initialApartments = [],
}: MasterPlanLayoutProps) {
  const router = useRouter();

  const rootRef = useRef<HTMLDivElement | null>(null);
  const reverseVideoRef = useRef<HTMLVideoElement | null>(null);
  const leavingRef = useRef(false);
  const touchStartYRef = useRef<number | null>(null);
  const inventorySignatureRef = useRef(getApartmentSignature(initialApartments));
  const currentFrameRef = useRef(1);

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
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(true);
  const [currentFrame, setCurrentFrame] = useState(1);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    currentFrameRef.current = currentFrame;
  }, [currentFrame]);

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

        const nextApartments = result.apartments;
        const nextSignature = getApartmentSignature(nextApartments);

        if (nextSignature !== inventorySignatureRef.current) {
          inventorySignatureRef.current = nextSignature;

          if (showLoadingState) {
            setApartments(nextApartments);
          } else {
            startTransition(() => {
              setApartments(nextApartments);
            });
          }
        }

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

    const refreshInventory = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      void loadInventory(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshInventory();
      }
    };

    const refreshInterval = window.setInterval(
      refreshInventory,
      INVENTORY_REFRESH_INTERVAL,
    );

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", refreshInventory);

    return () => {
      isMounted = false;
      activeController?.abort();
      window.clearInterval(refreshInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", refreshInventory);
    };
  }, [initialApartments.length]);

  const filteredApartments = useMemo(() => {
    if (!selectedTower) {
      return [];
    }

    return apartments.filter((apartment) => {
      const matchesSearch = apartment.title
        .toLowerCase()
        .includes(deferredSearch.toLowerCase());

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
    deferredSearch,
    selectedTower,
    bhk,
    facing,
    status,
    minPrice,
    maxPrice,
    minArea,
  ]);
  const hasActiveInventoryFilters = useMemo(
    () =>
      deferredSearch.trim().length > 0 ||
      bhk !== "All" ||
      facing !== "All" ||
      status !== "All" ||
      minPrice > 0 ||
      maxPrice < 200 ||
      minArea > 0,
    [deferredSearch, bhk, facing, status, minPrice, maxPrice, minArea],
  );

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

  const wrapFrame = useCallback(
    (frame: number) =>
      ((frame - 1 + TOTAL_MASTER_PLAN_FRAMES) % TOTAL_MASTER_PLAN_FRAMES) + 1,
    [],
  );

  const setWrappedFrame = useCallback(
    (frame: number) => {
      const nextFrame = wrapFrame(frame);
      currentFrameRef.current = nextFrame;
      setCurrentFrame(nextFrame);
    },
    [wrapFrame],
  );

  const getNextHotspotFrame = useCallback(
    (frame: number, direction: 1 | -1) => {
      const normalizedFrame = wrapFrame(frame);

      if (direction === 1) {
        return (
          MASTER_PLAN_SNAP_FRAMES.find((snapFrame) => snapFrame > normalizedFrame) ??
          MASTER_PLAN_SNAP_FRAMES[0]
        );
      }

      const previousSnapFrames = MASTER_PLAN_SNAP_FRAMES.filter(
        (snapFrame) => snapFrame < normalizedFrame,
      );

      return previousSnapFrames.at(-1) ?? MASTER_PLAN_SNAP_FRAMES.at(-1) ?? 1;
    },
    [wrapFrame],
  );

  const goToHotspot = useCallback(
    (direction: 1 | -1) => {
      if (leavingRef.current) return;

      const targetFrame = getNextHotspotFrame(currentFrameRef.current, direction);
      if (targetFrame === currentFrameRef.current) {
        return;
      }
      currentFrameRef.current = targetFrame;
      setCurrentFrame(targetFrame);
    },
    [getNextHotspotFrame],
  );

  const leaveToHome = useCallback(async () => {
    if (leavingRef.current) return;
    leavingRef.current = true;

    setIsLeaving(true);

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

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToHotspot(-1);
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        goToHotspot(1);
        return;
      }

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
  }, [goToHotspot, leaveToHome]);

  return (
    <div
      ref={rootRef}
      className="relative h-dvh w-full overflow-hidden bg-black text-zinc-900 [overflow-anchor:none] dark:text-white"
    >
      <MasterPlanFrameHoverStage
        apartments={apartments}
        currentFrame={currentFrame}
        filteredApartments={hasActiveInventoryFilters ? filteredApartments : []}
        inventoryError={inventoryError}
        inventoryState={isInventoryLoading ? "loading" : inventoryError ? "error" : "ready"}
        onSetFrame={setWrappedFrame}
        selectedTower={selectedTower}
      />

      <video
        ref={reverseVideoRef}
        muted
        playsInline
        preload="none"
        onEnded={() => router.push("/")}
        className={`gpu-layer absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
          isLeaving ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <source
          src="https://res.cloudinary.com/dlhfbu3kh/video/upload/v1774329012/master_plan_video_reverse_ydmfy3.webm"
          type="video/webm"
        />
      </video>

      {!isLeaving && selectedTower === "Tower B" ? (
        <MasterPlanArrowMarkers points={masterPlanArrowPoints} />
      ) : null}

      {!isLeaving ? (
        <div className="pointer-events-none absolute inset-x-0 top-16 z-40 flex justify-center md:top-18">
          <div className="pointer-events-auto inline-flex items-center gap-3 rounded-full border border-white/60 bg-white/82 px-3 py-2.5 shadow-[0_18px_40px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-black/42">
            <button
              type="button"
              onClick={() => goToHotspot(-1)}
              onContextMenu={(event) => event.preventDefault()}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200/80 bg-white text-zinc-900 transition hover:scale-[1.03] hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/8 dark:text-white dark:hover:bg-white/12"
              aria-label="Previous master plan hotspot"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="hidden text-center sm:block">
              <div className="text-[10px] uppercase tracking-[0.28em] text-zinc-500 dark:text-white/45">
                Master Plan Hotspots
              </div>
              <div className="mt-1 text-[11px] font-medium text-zinc-700 dark:text-white/78">
                Drag anywhere to scrub, or use the arrows to jump between the main views
              </div>
            </div>

            <button
              type="button"
              onClick={() => goToHotspot(1)}
              onContextMenu={(event) => event.preventDefault()}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200/80 bg-white text-zinc-900 transition hover:scale-[1.03] hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/8 dark:text-white dark:hover:bg-white/12"
              aria-label="Next master plan hotspot"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-0 z-[1]">
        <div className="surface-contain absolute -left-24 top-0 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-500/10" />
        <div className="surface-contain absolute right-0 top-20 h-80 w-80 rounded-full bg-violet-300/20 blur-3xl dark:bg-violet-500/10" />
        <div className="surface-contain absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-blue-300/20 blur-3xl dark:bg-blue-500/10" />
      </div>

      <div
        className="pointer-events-none relative z-10 h-full w-full px-4 py-6 transition-opacity duration-500 md:px-6 lg:px-8"
      >
        <div
          className={`grid h-full gap-6 ${
            selectedTower
              ? "xl:grid-cols-[minmax(0,1fr)_420px]"
              : "xl:grid-cols-[minmax(0,1fr)_540px]"
          }`}
        >
          <div className="pointer-events-none hidden xl:block" />

          <AnimatePresence mode="wait">
            {!isLeaving && (
              <motion.aside
                key="sidebar"
                variants={panelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="pointer-events-auto gpu-layer hidden min-w-0 xl:col-start-2 xl:block xl:h-full"
              >
                <div
                  className={`custom-scrollbar sticky top-6 ml-auto flex h-[calc(100dvh-3rem)] min-h-0 w-full flex-col gap-6 overflow-y-auto overscroll-contain pr-1 [overflow-anchor:none] ${
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
                  className="pointer-events-auto absolute inset-0 z-20 bg-black/10 backdrop-blur-[1px] xl:hidden"
                  aria-label="Close master plan panel"
                />
              ) : null}
            </AnimatePresence>

            {!isMobileSheetOpen && selectedTower ? (
              <button
                type="button"
                onClick={() => setIsMobileSheetOpen(true)}
                className="pointer-events-auto absolute bottom-6 right-4 z-30 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-4 py-3 text-sm font-medium text-zinc-900 shadow-[0_14px_36px_rgba(15,23,42,0.18)] backdrop-blur-xl xl:hidden"
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
              className={`gpu-layer absolute inset-x-3 bottom-3 z-30 xl:hidden ${
                isMobileSheetOpen ? "pointer-events-auto" : "pointer-events-none"
              }`}
            >
              <div
                className={`surface-contain flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/60 bg-white/92 shadow-[0_-20px_50px_rgba(15,23,42,0.20)] backdrop-blur-2xl dark:border-white/10 dark:bg-black/70 sm:rounded-[32px] ${
                  selectedTower ? "h-[min(82dvh,46rem)]" : "h-auto"
                }`}
                data-scroll-area={selectedTower ? "mobile-sheet" : undefined}
              >
                {selectedTower ? (
                  <>
                    <div className="flex items-center justify-between border-b border-zinc-200/80 px-4 py-3 dark:border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-white/20" />
                        <div>
                          <p className="text-sm font-semibold">Master Plan</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {filteredApartments.length} matching units
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsMobileSheetOpen(false)}
                        className="rounded-xl border border-zinc-200 bg-white/80 p-2 text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white"
                        aria-label="Close master plan panel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
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
                    </div>
                  </>
                ) : (
                  <div className="p-4">
                    <TowerSelect
                      embedded
                      mobile
                      selectedTower={selectedTower}
                      onSelectTower={handleTowerSelect}
                    />
                  </div>
                )}
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
  const activeFilterCount =
    Number(search.trim().length > 0) +
    Number(bhk !== "All") +
    Number(facing !== "All") +
    Number(status !== "All") +
    Number(minPrice > 0) +
    Number(maxPrice < 200) +
    Number(minArea > 0);
  const [isCompactOpen, setIsCompactOpen] = useState(false);

  if (compact) {
    return (
      <motion.div className="surface-contain shrink-0 rounded-[24px] border border-white/45 bg-white/88 p-3 shadow-[0_18px_46px_rgba(15,23,42,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-black/35 dark:shadow-[0_18px_46px_rgba(0,0,0,0.30)]">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10"
            aria-label="Back to tower selection"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-zinc-950 dark:text-white">
                Filters
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-700 dark:bg-white/8 dark:text-zinc-200">
                <Building2 className="h-3.5 w-3.5" />
                {selectedTower}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              {activeFilterCount > 0
                ? `${activeFilterCount} active refinements`
                : "Minimal phone filters"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCompactOpen((value) => !value)}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {isCompactOpen ? "Hide" : "Open"}
            <ChevronDown
              className={`h-3.5 w-3.5 transition ${isCompactOpen ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-[18px] border border-zinc-200/80 bg-zinc-50/85 px-3 py-2.5 shadow-sm transition focus-within:border-zinc-400 focus-within:bg-white dark:border-white/10 dark:bg-white/5 dark:focus-within:border-white/20 dark:focus-within:bg-white/10">
          <Search className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search unit number"
            className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
          />
          <button
            type="button"
            onClick={onReset}
            className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-zinc-600 shadow-sm transition hover:bg-zinc-100 dark:bg-white/8 dark:text-zinc-200 dark:hover:bg-white/12"
          >
            Reset
          </button>
        </div>

        {activeFilterCount > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {bhk !== "All" ? <FilterChip label={`${bhk} BHK`} /> : null}
            {facing !== "All" ? <FilterChip label={facing} /> : null}
            {status !== "All" ? <FilterChip label={status} /> : null}
            {minPrice > 0 ? <FilterChip label={`Min ${minPrice}L`} /> : null}
            {maxPrice < 200 ? <FilterChip label={`Max ${maxPrice}L`} /> : null}
            {minArea > 0 ? <FilterChip label={`${minArea}+ sqft`} /> : null}
          </div>
        ) : null}

        {isCompactOpen ? (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <FilterBlock compact label="BHK">
              <CompactFilterSelect
                value={bhk}
                onChange={(value) =>
                  onBhkChange(value as (typeof bhkOptions)[number])
                }
              >
                {bhkOptions.map((item) => (
                  <option key={item} value={item}>
                    {item === "All" ? "All" : `${item} BHK`}
                  </option>
                ))}
              </CompactFilterSelect>
            </FilterBlock>

            <FilterBlock compact label="Facing">
              <CompactFilterSelect
                value={facing}
                onChange={(value) =>
                  onFacingChange(value as (typeof facingOptions)[number])
                }
              >
                {facingOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </CompactFilterSelect>
            </FilterBlock>

            <FilterBlock compact label="Status">
              <CompactFilterSelect
                value={status}
                onChange={(value) =>
                  onStatusChange(value as (typeof statusOptions)[number])
                }
              >
                {statusOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </CompactFilterSelect>
            </FilterBlock>

            <div className="rounded-[18px] border border-zinc-200/80 bg-zinc-50/85 px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
              <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                Tower
              </p>
              <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-white">
                {selectedTower}
              </p>
            </div>

            <FilterBlock compact className="col-span-2" label={`Min Price: Rs. ${minPrice}L`}>
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

            <FilterBlock compact className="col-span-2" label={`Max Price: Rs. ${maxPrice}L`}>
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

            <FilterBlock compact className="col-span-2" label={`Min Area: ${minArea} sqft`}>
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
        ) : null}
      </motion.div>
    );
  }

  return (
    <motion.div
      className="surface-contain shrink-0 rounded-[24px] border border-white/30 bg-white/60 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-black/25 dark:shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:rounded-[30px] sm:p-5"
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
      className={`surface-contain flex min-h-0 flex-col rounded-[24px] border border-white/30 bg-white/75 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-black/25 dark:shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:rounded-[30px] ${
        compact ? "min-h-0 flex-1 p-3" : "flex-1 p-4"
      }`}
    >
      <div className={`flex items-center justify-between ${compact ? "mb-3" : "mb-4"}`}>
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
        className={`custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain [overflow-anchor:none] [-webkit-overflow-scrolling:touch] ${
          compact ? "pr-1" : "pr-2"
        }`}
        data-scroll-area="results"
      >
        <div className={compact ? "space-y-2.5 pb-1" : "space-y-3"}>
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
                  className={`group flex w-full text-left shadow-sm transition dark:border-white/10 dark:from-white/10 dark:to-white/5 ${
                    compact
                      ? "flex-col gap-3 rounded-[20px] border border-zinc-200/60 bg-linear-to-br from-white to-zinc-50 px-3.5 py-3"
                      : "items-center justify-between rounded-[22px] border border-zinc-200/50 bg-linear-to-br from-white to-zinc-50 px-4 py-3"
                  }`}
                >
                  <div className="min-w-0 w-full">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">
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

                  <div
                    className={`text-xs text-zinc-500 dark:text-zinc-400 ${
                      compact
                        ? "flex w-full items-center justify-between gap-3"
                        : "ml-4 shrink-0 text-right"
                    }`}
                  >
                    <div className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1 dark:bg-white/5">
                      <MapPin className="h-3.5 w-3.5" />
                      {apartment.facing}
                    </div>
                    <div className={compact ? "text-right" : ""}>
                      <p className="font-medium text-zinc-700 dark:text-zinc-300">
                        {apartment.areaSqft} sqft
                      </p>
                      <p className="mt-1 text-[11px]">
                        Floor {apartment.floorLabel}
                      </p>
                    </div>
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
  compact = false,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={`${compact ? "space-y-2" : "space-y-2.5"} ${className}`}>
      <label
        className={`block font-medium text-zinc-700 dark:text-zinc-300 ${
          compact ? "text-[11px]" : "text-sm"
        }`}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function CompactFilterSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[16px] border border-zinc-200/80 bg-zinc-50/85 px-3 shadow-sm dark:border-white/10 dark:bg-white/5">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full appearance-none bg-transparent text-sm text-zinc-900 outline-none dark:text-white"
      >
        {children}
      </select>
    </div>
  );
}

function FilterChip({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:bg-white/8 dark:text-zinc-200">
      {label}
    </span>
  );
}
