"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  BedDouble,
  Building2,
  IndianRupee,
  MapPin,
  Search,
  SlidersHorizontal,
} from "lucide-react";

type Apartment = {
  id: number;
  title: string;
  tower: string;
  bhk: number;
  priceLakhs: number;
  areaSqft: number;
  floor: number;
  facing: "North" | "South" | "East" | "West";
  status: "Available" | "Booked" | "Reserved";
};

const apartments: Apartment[] = [
  {
    id: 1,
    title: "A-1203",
    tower: "Tower A",
    bhk: 2,
    priceLakhs: 78,
    areaSqft: 1180,
    floor: 12,
    facing: "East",
    status: "Available",
  },
  {
    id: 2,
    title: "A-1501",
    tower: "Tower A",
    bhk: 3,
    priceLakhs: 110,
    areaSqft: 1560,
    floor: 15,
    facing: "North",
    status: "Reserved",
  },
  {
    id: 3,
    title: "B-702",
    tower: "Tower B",
    bhk: 1,
    priceLakhs: 52,
    areaSqft: 760,
    floor: 7,
    facing: "West",
    status: "Available",
  },
  {
    id: 4,
    title: "B-1404",
    tower: "Tower B",
    bhk: 2,
    priceLakhs: 82,
    areaSqft: 1210,
    floor: 14,
    facing: "South",
    status: "Booked",
  },
  {
    id: 5,
    title: "C-903",
    tower: "Tower C",
    bhk: 3,
    priceLakhs: 125,
    areaSqft: 1685,
    floor: 9,
    facing: "East",
    status: "Available",
  },
  {
    id: 6,
    title: "C-1802",
    tower: "Tower C",
    bhk: 4,
    priceLakhs: 185,
    areaSqft: 2240,
    floor: 18,
    facing: "North",
    status: "Available",
  },
  {
    id: 7,
    title: "A-904",
    tower: "Tower A",
    bhk: 2,
    priceLakhs: 74,
    areaSqft: 1115,
    floor: 9,
    facing: "South",
    status: "Available",
  },
  {
    id: 8,
    title: "B-1602",
    tower: "Tower B",
    bhk: 3,
    priceLakhs: 132,
    areaSqft: 1710,
    floor: 16,
    facing: "East",
    status: "Reserved",
  },
  {
    id: 9,
    title: "C-504",
    tower: "Tower C",
    bhk: 2,
    priceLakhs: 86,
    areaSqft: 1245,
    floor: 5,
    facing: "West",
    status: "Booked",
  },
];

const towers = ["All", "Tower A", "Tower B", "Tower C"] as const;
const facingOptions = ["All", "North", "South", "East", "West"] as const;
const statusOptions = ["All", "Available", "Booked", "Reserved"] as const;
const bhkOptions = ["All", "1", "2", "3", "4"] as const;

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

export default function MasterPlanLayout() {
  const router = useRouter();

  const rootRef = useRef<HTMLDivElement | null>(null);
  const forwardVideoRef = useRef<HTMLVideoElement | null>(null);
  const idleVideoRef = useRef<HTMLVideoElement | null>(null);
  const reverseVideoRef = useRef<HTMLVideoElement | null>(null);
  const leavingRef = useRef(false);
  const touchStartYRef = useRef<number | null>(null);

  const [search, setSearch] = useState("");
  const [tower, setTower] = useState<(typeof towers)[number]>("All");
  const [bhk, setBhk] = useState<(typeof bhkOptions)[number]>("All");
  const [facing, setFacing] = useState<(typeof facingOptions)[number]>("All");
  const [status, setStatus] = useState<(typeof statusOptions)[number]>("All");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(200);
  const [minArea, setMinArea] = useState(0);

  const [isLeaving, setIsLeaving] = useState(false);
  const [showIdleVideo, setShowIdleVideo] = useState(false);
  const [showReverseVideo, setShowReverseVideo] = useState(false);
  const [isIntroPlaying, setIsIntroPlaying] = useState(true);

  const filteredApartments = useMemo(() => {
    return apartments.filter((apartment) => {
      const matchesSearch =
        apartment.title.toLowerCase().includes(search.toLowerCase()) ||
        apartment.tower.toLowerCase().includes(search.toLowerCase());

      const matchesTower = tower === "All" || apartment.tower === tower;
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
  }, [search, tower, bhk, facing, status, minPrice, maxPrice, minArea]);

  const resetFilters = () => {
    setSearch("");
    setTower("All");
    setBhk("All");
    setFacing("All");
    setStatus("All");
    setMinPrice(0);
    setMaxPrice(200);
    setMinArea(0);
  };

  const handleForwardEnded = async () => {
    setIsIntroPlaying(false);
    setShowIdleVideo(true);

    const idleVideo = idleVideoRef.current;
    if (!idleVideo) return;

    idleVideo.currentTime = 0;

    try {
      await idleVideo.play();
    } catch {
      // autoplay usually works because it's muted, but fail silently if needed
    }
  };

  const leaveToHome = async () => {
    if (leavingRef.current || isIntroPlaying) return;
    leavingRef.current = true;

    setIsLeaving(true);
    setShowReverseVideo(true);
    setShowIdleVideo(false);

    if (forwardVideoRef.current) {
      forwardVideoRef.current.pause();
    }

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
  };

  useEffect(() => {
    const blockAllScrollLikeActions = (e: Event) => {
      if (isIntroPlaying || leavingRef.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (isIntroPlaying) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (leavingRef.current) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const scrollableParent = target.closest("[data-scroll-area='results']");
      if (scrollableParent instanceof HTMLElement) {
        if (scrollableParent.scrollTop > 0) return;
      }

      if (e.deltaY < -20) {
        e.preventDefault();
        e.stopPropagation();
        leaveToHome();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isIntroPlaying || leavingRef.current) {
        const blockedKeys = [
          "ArrowUp",
          "ArrowDown",
          "PageUp",
          "PageDown",
          "Home",
          "End",
          " ",
        ];

        if (blockedKeys.includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }

      const upKeys = ["ArrowUp", "PageUp", "Home"];
      if (upKeys.includes(e.key)) {
        e.preventDefault();
        leaveToHome();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        touchStartYRef.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isIntroPlaying || leavingRef.current) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

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
  }, [isIntroPlaying]);

  return (
    <div
      ref={rootRef}
      className="relative min-h-screen w-full overflow-hidden bg-[#f5f7fb] text-zinc-900 dark:bg-black dark:text-white"
    >
      <video
        ref={forwardVideoRef}
        autoPlay
        muted
        playsInline
        preload="auto"
        src="/master_plan_video.webm"
        onEnded={handleForwardEnded}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
          showIdleVideo || showReverseVideo ? "opacity-0" : "opacity-100"
        }`}
      />

      <video
        ref={idleVideoRef}
        muted
        loop
        playsInline
        preload="auto"
        src="/master_plan_idle_loop.webm"
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
        preload="auto"
        src="/master_plan_video_reverse.webm"
        onEnded={() => router.push("/")}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
          showReverseVideo ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {!isIntroPlaying && !isLeaving ? (
        <MasterPlanArrowMarkers points={masterPlanArrowPoints} />
      ) : null}

      <div className="pointer-events-none absolute inset-0 z-[1]">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-500/10" />
        <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-violet-300/20 blur-3xl dark:bg-violet-500/10" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-blue-300/20 blur-3xl dark:bg-blue-500/10" />
      </div>

      <div
        className={`relative z-10 min-h-screen w-full px-4 py-6 md:px-6 lg:px-8 transition-opacity duration-500 ${
          isIntroPlaying
            ? "pointer-events-none opacity-0"
            : "pointer-events-auto opacity-100"
        }`}
      >
        <div className="grid min-h-[calc(100vh-3rem)] gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="hidden xl:block" />

          <AnimatePresence mode="wait">
            {!isLeaving && !isIntroPlaying && (
              <motion.aside
                key="sidebar"
                variants={panelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="min-w-0 xl:col-start-2 xl:h-full"
              >
                <div className="sticky top-6 ml-auto w-full max-w-[420px] space-y-6 overflow-hidden">
                  <motion.div className="rounded-[30px] border border-white/30 bg-white/60 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-black/25 dark:shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
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

                      <button
                        onClick={resetFilters}
                        className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
                      >
                        Reset
                      </button>
                    </div>

                    <div className="space-y-5">
                      <FilterBlock label="Search Unit / Tower">
                        <div className="group flex items-center gap-2 rounded-2xl border border-zinc-200/80 bg-zinc-50/80 px-3 py-3 shadow-sm transition focus-within:border-zinc-400 focus-within:bg-white dark:border-white/10 dark:bg-white/5 dark:focus-within:border-white/20 dark:focus-within:bg-white/10">
                          <Search className="h-4 w-4 text-zinc-500 transition group-focus-within:text-zinc-800 dark:group-focus-within:text-white" />
                          <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="A-1203 or Tower A"
                            className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
                          />
                        </div>
                      </FilterBlock>

                      <FilterBlock label="Tower">
                        <GlassSelect
                          value={tower}
                          onValueChange={(value) =>
                            setTower(value as (typeof towers)[number])
                          }
                          placeholder="Select tower"
                        >
                          {towers.map((item) => (
                            <GlassSelectItem key={item} value={item}>
                              {item}
                            </GlassSelectItem>
                          ))}
                        </GlassSelect>
                      </FilterBlock>

                      <FilterBlock label="BHK">
                        <GlassSelect
                          value={bhk}
                          onValueChange={(value) =>
                            setBhk(value as (typeof bhkOptions)[number])
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
                            setFacing(value as (typeof facingOptions)[number])
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
                            setStatus(value as (typeof statusOptions)[number])
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

                      <FilterBlock label={`Min Price: ₹${minPrice}L`}>
                        <input
                          type="range"
                          min={0}
                          max={200}
                          step={5}
                          value={minPrice}
                          onChange={(e) => setMinPrice(Number(e.target.value))}
                          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 dark:bg-white/10"
                        />
                      </FilterBlock>

                      <FilterBlock label={`Max Price: ₹${maxPrice}L`}>
                        <input
                          type="range"
                          min={0}
                          max={200}
                          step={5}
                          value={maxPrice}
                          onChange={(e) => setMaxPrice(Number(e.target.value))}
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
                          onChange={(e) => setMinArea(Number(e.target.value))}
                          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 dark:bg-white/10"
                        />
                      </FilterBlock>
                    </div>
                  </motion.div>

                  <motion.div className="rounded-[30px] border border-white/30 bg-white/75 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-black/25 dark:shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-semibold">
                          Matching Flats
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          Scroll through live results
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
                      className="h-[420px] overflow-y-auto pr-1 [scrollbar-gutter:stable]"
                      data-scroll-area="results"
                    >
                      <div className="space-y-3">
                        <AnimatePresence initial={false}>
                          {filteredApartments.length > 0 ? (
                            filteredApartments.map((apartment) => (
                              <motion.button
                                key={apartment.id}
                                layout="position"
                                variants={itemAnim}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                whileHover={{ x: 4, scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                className="group flex w-full items-center justify-between rounded-[22px] border border-zinc-200/80 bg-gradient-to-br from-white to-zinc-50 px-4 py-3 text-left shadow-sm transition dark:border-white/10 dark:from-white/10 dark:to-white/5"
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
                                          : apartment.status === "Booked"
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
                                    Floor {apartment.floor}
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
                                <p className="text-sm font-semibold">
                                  No flats found
                                </p>
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
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
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
