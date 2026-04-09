"use client";

import NextImage from "next/image";
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
import MasterPlanTopViewStage from "./MasterPlanTopViewStage";
import GlassSelect, { GlassSelectItem } from "./ui/GlassSelect";
import MasterPlanFrameHoverStage from "./MasterPlanFrameHoverStage";
import SelectedFlatDetailsPanel from "./SelectedFlatDetailsPanel";
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Building2,
  ChevronDown,
  MapPin,
  Play,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import TowerSelect from "./TowerSelect";
import {
  getNearestMasterPlanHotspot,
  isInventoryApartmentAllowedAtHotspot,
} from "@/lib/master-plan-hotspots";
import type { MasterPlanHotspotKey } from "@/lib/master-plan-hotspots";
import type { InventoryApartment, TowerType } from "@/types/inventory";

const facingOptions = ["All", "North", "South", "East", "West"] as const;
const statusOptions = ["All", "Available", "Reserved", "Sold"] as const;
const bhkOptions = ["All", "2", "3"] as const;
const INVENTORY_REFRESH_INTERVAL = 15000;
const TOTAL_MASTER_PLAN_FRAMES = 360;
const MASTER_PLAN_SNAP_FRAMES = [1, 61, 121, 181, 241, 301] as const;
const SPECIAL_UNIT_VIDEO_FLAT = "3601";
const SPECIAL_UNIT_VIDEO_HOTSPOT = "A1";
const SPECIAL_UNIT_VIDEO_FRAME = 1;
const SPECIAL_UNIT_VIDEO_URL =
  "https://cdn.sthyra.com/videos/Unit%20%20View.mp4";
const SPECIAL_UNIT_VIDEO_REVERSE_URL =
  "https://cdn.sthyra.com/videos/Unit%20View%203S%20Reversed%20New_Compressed.mp4";
const MASTER_PLAN_EXIT_REVERSE_VIDEO_URL =
  "https://res.cloudinary.com/dlhfbu3kh/video/upload/v1774916774/Tf_Reversed.mp4";
const SPECIAL_UNIT_VIDEO_NAVIGATION_DELAY_MS = 760;
const HOTSPOT_NAVIGATION_MIN_DURATION_MS = 380;
const HOTSPOT_NAVIGATION_MAX_DURATION_MS = 720;
const HOTSPOT_NAVIGATION_MS_PER_FRAME = 6.8;
const BARE_SHELL_PANEL_PREVIEW_IMAGE =
  "https://cdn.sthyra.com/interior-panos-trifecta/bare-shell-pano/LS_BP_panoPath_F0000/preview.jpg";

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

function isSafariLikeUserAgent(userAgent: string) {
  return (
    /Safari/i.test(userAgent) &&
    !/Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS|Android/i.test(userAgent)
  );
}

function getApartmentMeshId(apartment: InventoryApartment) {
  const towerCode = apartment.tower === "Tower B" ? "B" : "A";
  const floorCode = String(apartment.floor)
    .replace(/[^0-9]/g, "")
    .padStart(2, "0");
  const flatCode = apartment.flatNumber.replace(/[^0-9A-Za-z]/g, "").toUpperCase();

  if (!floorCode || !flatCode) {
    return null;
  }

  return `Tower_${towerCode}_${floorCode}_${flatCode}`;
}

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

function getApartmentFlatToken(apartment: InventoryApartment) {
  return (apartment.flatNumber || apartment.title || "")
    .replace(/[^0-9]/g, "")
    .trim();
}

function wrapMasterPlanFrame(frame: number, totalFrames = TOTAL_MASTER_PLAN_FRAMES) {
  return ((frame - 1 + totalFrames) % totalFrames) + 1;
}

function getShortestMasterPlanFrameDistance(
  fromFrame: number,
  toFrame: number,
  totalFrames = TOTAL_MASTER_PLAN_FRAMES,
) {
  const normalizedFromFrame = wrapMasterPlanFrame(fromFrame, totalFrames);
  const normalizedToFrame = wrapMasterPlanFrame(toFrame, totalFrames);
  const directDistance = Math.abs(normalizedToFrame - normalizedFromFrame);

  return Math.min(directDistance, totalFrames - directDistance);
}

function getMasterPlanFrameTransitionDuration(
  fromFrame: number,
  toFrame: number,
) {
  const frameDistance = getShortestMasterPlanFrameDistance(fromFrame, toFrame);

  return Math.min(
    HOTSPOT_NAVIGATION_MAX_DURATION_MS,
    Math.max(
      HOTSPOT_NAVIGATION_MIN_DURATION_MS,
      frameDistance * HOTSPOT_NAVIGATION_MS_PER_FRAME,
    ),
  );
}

function isSpecialVideoApartment(apartment: InventoryApartment | null) {
  if (!apartment) {
    return false;
  }

  return getApartmentFlatToken(apartment) === SPECIAL_UNIT_VIDEO_FLAT;
}

function MasterPlanHotspotControls({
  onPrevious,
  onNext,
  compact = false,
}: {
  onPrevious: () => void;
  onNext: () => void;
  compact?: boolean;
}) {
  return (
    <div
      data-master-plan-stage-controls
      className={`pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/35 bg-[linear-gradient(135deg,rgba(255,255,255,0.42),rgba(255,255,255,0.14))] shadow-[0_18px_46px_rgba(15,23,42,0.16)] backdrop-blur-2xl dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(20,20,24,0.46),rgba(20,20,24,0.2))] ${
        compact ? "" : ""
      } ${compact ? "p-1.5" : "p-2"}`}
    >
      <button
        type="button"
        onClick={onPrevious}
        onContextMenu={(event) => event.preventDefault()}
        className={`group inline-flex touch-manipulation items-center justify-center rounded-full border border-white/45 bg-white/72 text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_8px_24px_rgba(15,23,42,0.12)] transition duration-300 hover:bg-white/88 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.22)] dark:hover:bg-white/14 ${
          compact
            ? "h-9 w-9"
            : "h-10 w-10 hover:-translate-x-0.5 sm:h-11 sm:w-11"
        }`}
        aria-label="Previous master plan hotspot"
      >
        <ArrowLeft
          className={`h-4 w-4 transition duration-300 ${
            compact ? "" : "group-hover:-translate-x-0.5"
          }`}
        />
      </button>

      <div className="h-7 w-px bg-gradient-to-b from-white/0 via-white/35 to-white/0 dark:via-white/12 sm:h-8" />

      <button
        type="button"
        onClick={onNext}
        onContextMenu={(event) => event.preventDefault()}
        className={`group inline-flex touch-manipulation items-center justify-center rounded-full border border-white/45 bg-white/72 text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_8px_24px_rgba(15,23,42,0.12)] transition duration-300 hover:bg-white/88 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.22)] dark:hover:bg-white/14 ${
          compact
            ? "h-9 w-9"
            : "h-10 w-10 hover:translate-x-0.5 sm:h-11 sm:w-11"
        }`}
        aria-label="Next master plan hotspot"
      >
        <ArrowRight
          className={`h-4 w-4 transition duration-300 ${
            compact ? "" : "group-hover:translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function MasterPlanModeToggle({
  isTopViewMode,
  onNormalView,
  onTopView,
}: {
  isTopViewMode: boolean;
  onNormalView: () => void;
  onTopView: () => void;
}) {
  return (
    <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-black/68 p-1.5 text-white shadow-[0_18px_46px_rgba(0,0,0,0.3)] backdrop-blur-xl">
      <button
        type="button"
        onClick={() => {
          if (isTopViewMode) {
            onNormalView();
          }
        }}
        className={`rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
          !isTopViewMode
            ? "bg-white text-black shadow-[0_10px_20px_rgba(255,255,255,0.18)]"
            : "text-white/72 hover:text-white"
        }`}
      >
        Normal View
      </button>
      <button
        type="button"
        onClick={() => {
          if (!isTopViewMode) {
            onTopView();
          }
        }}
        className={`rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
          isTopViewMode
            ? "bg-white text-black shadow-[0_10px_20px_rgba(255,255,255,0.18)]"
            : "text-white/72 hover:text-white"
        }`}
      >
        Top View
      </button>
    </div>
  );
}

export default function MasterPlanLayout({
  initialApartments = [],
}: MasterPlanLayoutProps) {
  const router = useRouter();

  const rootRef = useRef<HTMLDivElement | null>(null);
  const reverseVideoRef = useRef<HTMLVideoElement | null>(null);
  const selectedFlatPanelRef = useRef<HTMLDivElement | null>(null);
  const specialUnitVideoRef = useRef<HTMLVideoElement | null>(null);
  const specialVideoLoadedUrlRef = useRef<string | null>(null);
  const specialUnitVideoTimeoutRef = useRef<number | null>(null);
  const leavingRef = useRef(false);
  const lastApartmentSelectionAtRef = useRef(0);
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
  const [minArea, setMinArea] = useState(0);

  const [isLeaving, setIsLeaving] = useState(false);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(true);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [isDesktopCompactViewport, setIsDesktopCompactViewport] =
    useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [isSafariLike, setIsSafariLike] = useState(false);
  const [isTouchTabletViewport, setIsTouchTabletViewport] = useState(false);
  const [isTopViewMode, setIsTopViewMode] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(1);
  const [isStageInteracting, setIsStageInteracting] = useState(false);
  const [selectedApartment, setSelectedApartment] =
    useState<InventoryApartment | null>(null);
  const [selectedApartmentMeshId, setSelectedApartmentMeshId] = useState<
    string | null
  >(null);
  const [isSpecialVideoOpen, setIsSpecialVideoOpen] = useState(false);
  const [isSpecialVideoLaunching, setIsSpecialVideoLaunching] = useState(false);
  const [isSpecialVideoReady, setIsSpecialVideoReady] = useState(false);
  const [isSpecialVideoQueuedToOpen, setIsSpecialVideoQueuedToOpen] =
    useState(false);
  const [shouldAutoplaySpecialVideo, setShouldAutoplaySpecialVideo] =
    useState(false);
  const [isSpecialVideoCompleted, setIsSpecialVideoCompleted] = useState(false);
  const [isSpecialVideoReversing, setIsSpecialVideoReversing] = useState(false);
  const [specialVideoApartment, setSpecialVideoApartment] =
    useState<InventoryApartment | null>(null);
  const deferredSearch = useDeferredValue(search);
  const selectedApartmentInventoryId = selectedApartment?.id ?? null;
  const activeHotspot = useMemo(
    () => getNearestMasterPlanHotspot(currentFrame),
    [currentFrame],
  );
  const isSpecialVideoExperienceActive =
    isSpecialVideoLaunching || isSpecialVideoOpen;
  const isSpecialVideoOverlayMounted =
    Boolean(specialVideoApartment) || isSpecialVideoLaunching || isSpecialVideoOpen;
  const isFlatPanelOpen = Boolean(
    selectedApartment || (isSpecialVideoCompleted && specialVideoApartment),
  );
  const shouldUseCompactLayout =
    isCompactViewport || isTouchTabletViewport;
  const compactStageHeightClassName = shouldUseCompactLayout
    ? "h-[clamp(18.75rem,45svh,27rem)] sm:h-[clamp(20.5rem,48svh,31rem)]"
    : "h-[clamp(20rem,50svh,32rem)]";
  const compactLowerContentClassName = shouldUseCompactLayout
    ? selectedApartment
      ? "-mt-1 min-h-0 flex-1 px-0 pb-0"
      : "-mt-1 min-h-0 flex-1 px-0 pb-0"
    : "mt-2 min-h-0 flex-1 px-3 pb-3";
  const shouldUseTouchBackNavigation =
    shouldUseCompactLayout;
  const shouldShowDesktopSidebar =
    !shouldUseCompactLayout && !isLeaving && !selectedApartment;
  const shouldShowTopViewFullscreen =
    isTopViewMode &&
    !selectedTower &&
    !selectedApartment &&
    !isSpecialVideoExperienceActive;
  const activeSpecialVideoUrl = isSpecialVideoReversing
    ? SPECIAL_UNIT_VIDEO_REVERSE_URL
    : SPECIAL_UNIT_VIDEO_URL;

  useEffect(() => {
    currentFrameRef.current = currentFrame;
  }, [currentFrame]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.body.dataset.masterPlanFlatOpen = isFlatPanelOpen ? "true" : "false";

    return () => {
      delete document.body.dataset.masterPlanFlatOpen;
    };
  }, [isFlatPanelOpen]);

  useEffect(() => {
    if (typeof navigator === "undefined") {
      return;
    }

    setIsSafariLike(isSafariLikeUserAgent(navigator.userAgent ?? ""));
  }, []);

  useEffect(() => {
    const preloadLink = document.createElement("link");
    preloadLink.rel = "preload";
    preloadLink.as = "video";
    preloadLink.href = SPECIAL_UNIT_VIDEO_URL;
    preloadLink.crossOrigin = "anonymous";
    document.head.appendChild(preloadLink);

    const warmVideo = document.createElement("video");
    warmVideo.preload = "auto";
    warmVideo.muted = true;
    warmVideo.playsInline = true;
    warmVideo.crossOrigin = "anonymous";
    warmVideo.src = SPECIAL_UNIT_VIDEO_URL;
    warmVideo.load();

    return () => {
      if (specialUnitVideoTimeoutRef.current !== null) {
        window.clearTimeout(specialUnitVideoTimeoutRef.current);
        specialUnitVideoTimeoutRef.current = null;
      }

      preloadLink.remove();
      warmVideo.pause();
      warmVideo.removeAttribute("src");
      warmVideo.load();
    };
  }, []);

  useEffect(() => {
    if (!isSpecialVideoOpen || isSpecialVideoReversing) {
      return;
    }

    const reversePreloadLink = document.createElement("link");
    reversePreloadLink.rel = "preload";
    reversePreloadLink.as = "video";
    reversePreloadLink.href = SPECIAL_UNIT_VIDEO_REVERSE_URL;
    reversePreloadLink.crossOrigin = "anonymous";
    document.head.appendChild(reversePreloadLink);

    const reverseWarmVideo = document.createElement("video");
    reverseWarmVideo.preload = "auto";
    reverseWarmVideo.muted = true;
    reverseWarmVideo.playsInline = true;
    reverseWarmVideo.crossOrigin = "anonymous";
    reverseWarmVideo.src = SPECIAL_UNIT_VIDEO_REVERSE_URL;
    reverseWarmVideo.load();

    return () => {
      reversePreloadLink.remove();
      reverseWarmVideo.pause();
      reverseWarmVideo.removeAttribute("src");
      reverseWarmVideo.load();
    };
  }, [isSpecialVideoOpen, isSpecialVideoReversing]);

  useEffect(() => {
    if (!isSpecialVideoOverlayMounted) {
      return;
    }

    const video = specialUnitVideoRef.current;

    if (!video) {
      return;
    }

    const markReady = () => {
      specialVideoLoadedUrlRef.current = activeSpecialVideoUrl;
      setIsSpecialVideoReady(true);
    };

    if (video.getAttribute("src") !== activeSpecialVideoUrl) {
      specialVideoLoadedUrlRef.current = null;
      setIsSpecialVideoReady(false);
      video.pause();
      video.currentTime = 0;
      video.src = activeSpecialVideoUrl;
      video.load();
    } else if (
      specialVideoLoadedUrlRef.current === activeSpecialVideoUrl ||
      video.readyState >= 3
    ) {
      markReady();
    }

    video.addEventListener("loadeddata", markReady);
    video.addEventListener("canplay", markReady);

    return () => {
      video.removeEventListener("loadeddata", markReady);
      video.removeEventListener("canplay", markReady);
    };
  }, [activeSpecialVideoUrl, isSpecialVideoOverlayMounted]);

  useEffect(() => {
    if (!isSafariLike) {
      return;
    }

    const preloadLink = document.createElement("link");
    preloadLink.rel = "preload";
    preloadLink.as = "video";
    preloadLink.href = MASTER_PLAN_EXIT_REVERSE_VIDEO_URL;
    preloadLink.crossOrigin = "anonymous";
    document.head.appendChild(preloadLink);

    const warmVideo = document.createElement("video");
    warmVideo.preload = "auto";
    warmVideo.muted = true;
    warmVideo.playsInline = true;
    warmVideo.crossOrigin = "anonymous";
    warmVideo.src = MASTER_PLAN_EXIT_REVERSE_VIDEO_URL;
    warmVideo.load();

    const reverseVideo = reverseVideoRef.current;

    if (reverseVideo) {
      reverseVideo.preload = "auto";
      reverseVideo.load();
    }

    return () => {
      preloadLink.remove();
      warmVideo.pause();
      warmVideo.removeAttribute("src");
      warmVideo.load();
    };
  }, [isSafariLike]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const compactViewportMedia = window.matchMedia("(max-width: 1279px)");
    const desktopCompactViewportMedia = window.matchMedia(
      "(min-width: 1280px) and (max-width: 1699px)",
    );
    const touchViewportMedia = window.matchMedia("(max-width: 1366px)");
    const syncCompactViewport = () => {
      setIsCompactViewport(compactViewportMedia.matches);
      setIsDesktopCompactViewport(desktopCompactViewportMedia.matches);
      setIsTouchTabletViewport(
        touchViewportMedia.matches && window.navigator.maxTouchPoints > 0,
      );
    };

    syncCompactViewport();
    compactViewportMedia.addEventListener("change", syncCompactViewport);
    desktopCompactViewportMedia.addEventListener("change", syncCompactViewport);
    touchViewportMedia.addEventListener("change", syncCompactViewport);

    return () => {
      compactViewportMedia.removeEventListener("change", syncCompactViewport);
      desktopCompactViewportMedia.removeEventListener(
        "change",
        syncCompactViewport,
      );
      touchViewportMedia.removeEventListener("change", syncCompactViewport);
    };
  }, []);

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
      if (
        document.visibilityState !== "visible" ||
        isStageInteracting
      ) {
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
  }, [initialApartments.length, isStageInteracting]);

  const filteredApartments = useMemo(() => {
    if (!selectedTower) {
      return [];
    }

    return apartments.filter((apartment) => {
      const matchesSearch = apartment.title
        .toLowerCase()
        .includes(deferredSearch.toLowerCase());

      const matchesFloor = apartment.floor > 0;
      const matchesTower = apartment.tower === selectedTower;
      const matchesBhk = bhk === "All" || apartment.bhk === Number(bhk);
      const matchesFacing = facing === "All" || apartment.facing === facing;
      const matchesStatus = status === "All" || apartment.status === status;
      const matchesArea = apartment.areaSqft >= minArea;

      return (
        matchesFloor &&
        matchesSearch &&
        matchesTower &&
        matchesBhk &&
        matchesFacing &&
        matchesStatus &&
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
    minArea,
  ]);
  const hasActiveInventoryFilters = useMemo(
    () =>
      deferredSearch.trim().length > 0 ||
      bhk !== "All" ||
      facing !== "All" ||
      status !== "All" ||
      minArea > 0,
    [deferredSearch, bhk, facing, status, minArea],
  );

  const resetFilters = () => {
    setSearch("");
    setBhk("All");
    setFacing("All");
    setStatus("All");
    setMinArea(0);
  };

  const handleTowerSelect = (tower: TowerType) => {
    setIsTopViewMode(false);
    setSelectedTower(tower);
    setIsDesktopSidebarOpen(true);
    setIsMobileSheetOpen(true);
  };

  const handleTopViewToggle = useCallback(() => {
    setSelectedApartment(null);
    setSelectedApartmentMeshId(null);
    setSelectedTower(null);
    setIsMobileSheetOpen(true);
    setIsTopViewMode((currentValue) => !currentValue);
  }, []);

  const handleBackToTowerSelect = () => {
    resetFilters();
    setSelectedApartment(null);
    setSelectedApartmentMeshId(null);
    setSelectedTower(null);
    setIsDesktopSidebarOpen(true);
    setIsTopViewMode(false);
    setIsMobileSheetOpen(true);
  };

  const clearSelectedApartment = useCallback(() => {
    setSelectedApartment(null);
    setSelectedApartmentMeshId(null);

    if (selectedTower) {
      setIsMobileSheetOpen(true);
    }
  }, [selectedTower]);

  const handleOpenBareShellWalkthrough = useCallback(() => {
    router.push("/walkthrough?mode=bare-shell");
  }, [router]);

  const closeSpecialUnitVideo = useCallback(() => {
    if (specialUnitVideoTimeoutRef.current !== null) {
      window.clearTimeout(specialUnitVideoTimeoutRef.current);
      specialUnitVideoTimeoutRef.current = null;
    }

    const video = specialUnitVideoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }

    setIsSpecialVideoLaunching(false);
    setIsSpecialVideoQueuedToOpen(false);
    setIsSpecialVideoReady(false);
    setShouldAutoplaySpecialVideo(false);
    setIsSpecialVideoOpen(false);
    setIsSpecialVideoCompleted(false);
    setIsSpecialVideoReversing(false);
    setSpecialVideoApartment(null);
    specialVideoLoadedUrlRef.current = null;
  }, []);

  const handleNormalViewToggle = useCallback(() => {
    closeSpecialUnitVideo();
    setSelectedApartment(null);
    setSelectedApartmentMeshId(null);
    setSelectedTower(null);
    currentFrameRef.current = SPECIAL_UNIT_VIDEO_FRAME;
    setCurrentFrame(SPECIAL_UNIT_VIDEO_FRAME);
    setIsMobileSheetOpen(true);
    setIsTopViewMode(false);
  }, [closeSpecialUnitVideo]);

  const handleSpecialVideoBack = useCallback(() => {
    if (isSpecialVideoReversing) {
      return;
    }

    setSelectedApartment(null);
    setSelectedApartmentMeshId(null);
    setIsSpecialVideoCompleted(false);
    setIsSpecialVideoReversing(true);
    setShouldAutoplaySpecialVideo(true);
  }, [isSpecialVideoReversing]);

  const handleApartmentSelect = useCallback(
    (apartment: InventoryApartment | null, apartmentMeshId: string | null) => {
      if (!apartment || !apartmentMeshId) {
        return;
      }

      lastApartmentSelectionAtRef.current =
        typeof performance !== "undefined" ? performance.now() : Date.now();

      if (isSpecialVideoApartment(apartment)) {
        setSelectedApartment(null);
        setSelectedApartmentMeshId(null);
        setIsMobileSheetOpen(false);
        setIsSpecialVideoCompleted(false);
        setIsSpecialVideoReversing(false);
        setIsSpecialVideoReady(false);
        setIsSpecialVideoQueuedToOpen(false);
        setShouldAutoplaySpecialVideo(true);
        setSpecialVideoApartment(apartment);
        specialVideoLoadedUrlRef.current = null;

        if (specialUnitVideoTimeoutRef.current !== null) {
          window.clearTimeout(specialUnitVideoTimeoutRef.current);
          specialUnitVideoTimeoutRef.current = null;
        }

        if (activeHotspot === SPECIAL_UNIT_VIDEO_HOTSPOT) {
          setIsSpecialVideoLaunching(true);
          setIsSpecialVideoOpen(false);
          setIsSpecialVideoQueuedToOpen(true);
          return;
        }

        setIsSpecialVideoLaunching(true);
        setIsSpecialVideoOpen(false);
        const navigationDelayMs =
          getMasterPlanFrameTransitionDuration(
            currentFrameRef.current,
            SPECIAL_UNIT_VIDEO_FRAME,
          ) + 80;
        currentFrameRef.current = SPECIAL_UNIT_VIDEO_FRAME;
        setCurrentFrame(SPECIAL_UNIT_VIDEO_FRAME);
        specialUnitVideoTimeoutRef.current = window.setTimeout(() => {
          specialUnitVideoTimeoutRef.current = null;
          setIsSpecialVideoQueuedToOpen(true);
        }, Math.max(navigationDelayMs, SPECIAL_UNIT_VIDEO_NAVIGATION_DELAY_MS));
        return;
      }

      closeSpecialUnitVideo();
      setSelectedApartment(apartment);
      setSelectedApartmentMeshId(apartmentMeshId);
      setIsMobileSheetOpen(false);
    },
    [activeHotspot, closeSpecialUnitVideo],
  );

  const handleApartmentListSelect = useCallback((apartment: InventoryApartment) => {
    if (!isInventoryApartmentAllowedAtHotspot(apartment, activeHotspot)) {
      return;
    }

    const apartmentMeshId = getApartmentMeshId(apartment);

    if (!apartmentMeshId) {
      return;
    }

    handleApartmentSelect(apartment, apartmentMeshId);
  }, [activeHotspot, handleApartmentSelect]);

  useEffect(() => {
    if (!selectedApartment) {
      return;
    }

    if (selectedApartment.floor <= 0) {
      clearSelectedApartment();
      return;
    }

    if (selectedTower && selectedApartment.tower !== selectedTower) {
      clearSelectedApartment();
    }
  }, [clearSelectedApartment, selectedApartment, selectedTower]);

  useEffect(() => {
    if (
      !isSpecialVideoLaunching ||
      !isSpecialVideoQueuedToOpen ||
      !isSpecialVideoReady
    ) {
      return;
    }

    setIsSpecialVideoLaunching(false);
    setIsSpecialVideoOpen(true);
    setIsSpecialVideoQueuedToOpen(false);
  }, [
    isSpecialVideoLaunching,
    isSpecialVideoQueuedToOpen,
    isSpecialVideoReady,
  ]);

  useEffect(() => {
    if (!selectedApartment) {
      return;
    }

    const syncedApartment =
      apartments.find((apartment) => apartment.id === selectedApartment.id) ?? null;

    if (!syncedApartment) {
      setSelectedApartment(null);
      setSelectedApartmentMeshId(null);
      return;
    }

    if (syncedApartment !== selectedApartment) {
      setSelectedApartment(syncedApartment);
    }
  }, [apartments, selectedApartment]);

  useEffect(() => {
    if (!selectedApartment || shouldUseCompactLayout) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const selectionAgeMs =
        (typeof performance !== "undefined" ? performance.now() : Date.now()) -
        lastApartmentSelectionAtRef.current;

      if (selectionAgeMs < 450) {
        return;
      }

      const target = event.target;

      if (
        selectedFlatPanelRef.current &&
        target instanceof Node &&
        selectedFlatPanelRef.current.contains(target)
      ) {
        return;
      }

      clearSelectedApartment();
    };

    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [clearSelectedApartment, selectedApartment, shouldUseCompactLayout]);

  useEffect(() => {
    if (!isSpecialVideoOpen || !shouldAutoplaySpecialVideo) {
      return;
    }

    const video = specialUnitVideoRef.current;

    if (!video) {
      return;
    }

    if (video.getAttribute("src") !== activeSpecialVideoUrl) {
      video.src = activeSpecialVideoUrl;
      video.load();
    }

    const playVideo = () => {
      video.currentTime = 0;
      setShouldAutoplaySpecialVideo(false);
      void video.play().catch(() => {
        // playback may still require a second user gesture on some devices
      });
    };

    if (video.readyState >= 3) {
      playVideo();
      return;
    }

    const handleCanPlay = () => {
      video.removeEventListener("canplay", handleCanPlay);
      playVideo();
    };

    video.addEventListener("canplay", handleCanPlay);

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
    };
  }, [activeSpecialVideoUrl, isSpecialVideoOpen, shouldAutoplaySpecialVideo]);

  useEffect(() => {
    if (!isSpecialVideoOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleSpecialVideoBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleSpecialVideoBack, isSpecialVideoOpen]);

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
      if (reverseVideo.readyState < 2) {
        await new Promise<void>((resolve, reject) => {
          let settled = false;
          const cleanup = () => {
            reverseVideo.removeEventListener("canplay", handleCanPlay);
            reverseVideo.removeEventListener("error", handleError);
          };
          const handleCanPlay = () => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve();
          };
          const handleError = () => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(new Error("Failed to load reverse video."));
          };

          reverseVideo.addEventListener("canplay", handleCanPlay, {
            once: true,
          });
          reverseVideo.addEventListener("error", handleError, {
            once: true,
          });
          reverseVideo.load();
        });
      }

      await reverseVideo.play();
    } catch {
      router.push("/");
    }
  }, [router]);

  useEffect(() => {
    const getScrollAreaElement = (target: EventTarget | null) => {
      if (target instanceof HTMLElement) {
        return target.closest("[data-scroll-area]");
      }

      if (target instanceof Node) {
        return target.parentElement?.closest("[data-scroll-area]") ?? null;
      }

      return null;
    };

    const isInsideScrollArea = (target: EventTarget | null) => {
      return Boolean(getScrollAreaElement(target));
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

      if (shouldUseTouchBackNavigation) {
        return;
      }

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

      if (shouldUseTouchBackNavigation) {
        return;
      }

      const upKeys = ["ArrowUp", "PageUp", "Home"];
      if (upKeys.includes(e.key)) {
        e.preventDefault();
        leaveToHome();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (shouldUseTouchBackNavigation) {
        touchStartYRef.current = null;
        return;
      }

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

      if (shouldUseTouchBackNavigation) {
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
  }, [goToHotspot, leaveToHome, shouldUseTouchBackNavigation]);

  return (
    <div
      ref={rootRef}
      className="relative app-screen w-full overflow-hidden bg-black text-zinc-900 [overflow-anchor:none] dark:text-white"
    >
      {shouldShowTopViewFullscreen ? <MasterPlanTopViewStage /> : null}

      {!shouldUseCompactLayout && !shouldShowTopViewFullscreen ? (
        isTopViewMode && !selectedTower ? (
          <MasterPlanTopViewStage />
        ) : (
          <MasterPlanFrameHoverStage
            apartments={apartments}
            currentFrame={currentFrame}
            dragEnabled
            filteredApartments={hasActiveInventoryFilters ? filteredApartments : []}
            inventoryError={inventoryError}
            inventoryState={isInventoryLoading ? "loading" : inventoryError ? "error" : "ready"}
            onApartmentSelect={handleApartmentSelect}
            onInteractionChange={setIsStageInteracting}
            onSetFrame={setWrappedFrame}
            selectedApartmentId={selectedApartmentMeshId}
            selectedTower={selectedTower}
          />
        )
      ) : null}

      <video
        ref={reverseVideoRef}
        muted
        playsInline
        preload={isSafariLike ? "auto" : "metadata"}
        crossOrigin="anonymous"
        disablePictureInPicture
        src={MASTER_PLAN_EXIT_REVERSE_VIDEO_URL}
        onEnded={() => router.push("/")}
        className={`gpu-layer absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
          isLeaving ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={
          isSafariLike
            ? {
                transform: "translate3d(-0.35%, 0, 0) scale(1.018)",
                transformOrigin: "center center",
              }
            : undefined
        }
      />


      {!shouldUseCompactLayout &&
      !isTopViewMode &&
      !isLeaving &&
      !isSpecialVideoOpen ? (
        <div
          className={`pointer-events-none absolute inset-x-0 z-40 flex justify-center px-4 ${
            isDesktopCompactViewport
              ? "top-8"
              : "top-24 sm:top-28 md:top-30"
          }`}
        >
          <MasterPlanHotspotControls
            onPrevious={() => goToHotspot(-1)}
            onNext={() => goToHotspot(1)}
          />
        </div>
      ) : null}

      {shouldShowTopViewFullscreen ? (
        <div
          className={`pointer-events-none absolute inset-x-0 z-40 flex justify-center px-4 ${
            isDesktopCompactViewport
              ? "top-8"
              : "top-24 sm:top-28 md:top-30"
          }`}
        >
          <MasterPlanModeToggle
            isTopViewMode
            onNormalView={handleNormalViewToggle}
            onTopView={handleTopViewToggle}
          />
        </div>
      ) : null}

      {!shouldShowTopViewFullscreen ? (
        <div
        className={`relative z-10 h-full flex-col transition-opacity duration-300 ${
          shouldUseCompactLayout ? "flex" : "flex xl:hidden"
        } ${
          isSpecialVideoOpen ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <div className="relative w-full shrink-0">
          <div className={`relative overflow-hidden ${compactStageHeightClassName}`}>
            <div className="absolute inset-0">
              {isTopViewMode && !selectedTower ? (
                <MasterPlanTopViewStage />
              ) : (
                <MasterPlanFrameHoverStage
                  apartments={apartments}
                  currentFrame={currentFrame}
                  dragEnabled={false}
                  filteredApartments={hasActiveInventoryFilters ? filteredApartments : []}
                  inventoryError={inventoryError}
                  inventoryState={isInventoryLoading ? "loading" : inventoryError ? "error" : "ready"}
                  onApartmentSelect={handleApartmentSelect}
                  onInteractionChange={setIsStageInteracting}
                  onSetFrame={setWrappedFrame}
                  selectedApartmentId={selectedApartmentMeshId}
                  selectedTower={selectedTower}
                />
              )}
            </div>

            {!isTopViewMode && !isLeaving && !isSpecialVideoOpen ? (
              <div
                className={`pointer-events-none absolute inset-x-0 z-30 flex justify-center px-4 ${
                  shouldUseCompactLayout
                    ? "bottom-3"
                    : "bottom-[max(env(safe-area-inset-bottom),1rem)]"
                }`}
              >
                <MasterPlanHotspotControls
                  compact
                  onPrevious={() => goToHotspot(-1)}
                  onNext={() => goToHotspot(1)}
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className={compactLowerContentClassName}>
          <div
            className={
              selectedApartment
                ? "flex h-full min-h-0 flex-col overflow-hidden"
                : "surface-contain flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/60 bg-white/92 shadow-[0_24px_64px_rgba(15,23,42,0.16)] backdrop-blur-2xl dark:border-white/10 dark:bg-black/70"
            }
          >
            {selectedApartment ? (
              <div
                className="custom-scrollbar flex min-h-0 flex-1 items-stretch justify-center overflow-y-auto overscroll-contain px-0 pb-[max(env(safe-area-inset-bottom),0rem)] pt-0 [-webkit-overflow-scrolling:touch] touch-pan-y"
                data-scroll-area="compact-panel"
              >
                <SelectedFlatDetailsPanel
                  ref={selectedFlatPanelRef}
                  apartment={selectedApartment}
                  compact
                  onClose={clearSelectedApartment}
                />
              </div>
            ) : selectedTower ? (
              <div
                className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain px-2 pb-2.5 pt-2 [-webkit-overflow-scrolling:touch] touch-pan-y sm:gap-3 sm:px-2.5"
                data-scroll-area="compact-panel"
              >
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
                  onApartmentSelect={handleApartmentListSelect}
                  activeHotspot={activeHotspot}
                  selectedApartmentId={selectedApartmentInventoryId}
                  compact
                />
              </div>
            ) : (
              <div
                className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-2 pb-2.5 pt-2 [-webkit-overflow-scrolling:touch] touch-pan-y sm:px-2.5"
                data-scroll-area="compact-panel"
              >
                <TowerSelect
                  embedded
                  isTopViewActive={isTopViewMode}
                  mobile
                  onTopViewClick={handleTopViewToggle}
                  selectedTower={selectedTower}
                  onSelectTower={handleTowerSelect}
                />
              </div>
            )}
          </div>
          </div>
        </div>
      ) : null}

      {!shouldShowTopViewFullscreen ? (
      <div
        className={`pointer-events-none relative z-10 h-full w-full px-4 py-6 transition-opacity duration-500 md:px-6 lg:px-8 ${
          shouldUseCompactLayout ? "hidden" : "hidden xl:block"
        } ${
          isSpecialVideoOpen ? "opacity-0" : "opacity-100"
        }`}
      >
        <div
          className={`grid h-full gap-6 ${
            shouldShowDesktopSidebar && isDesktopSidebarOpen
              ? selectedTower
                ? isDesktopCompactViewport
                  ? "xl:grid-cols-[minmax(0,1fr)_330px]"
                  : "xl:grid-cols-[minmax(0,1fr)_clamp(320px,27vw,380px)] 2xl:grid-cols-[minmax(0,1fr)_420px]"
                : isDesktopCompactViewport
                  ? "xl:grid-cols-[minmax(0,1fr)_380px]"
                  : "xl:grid-cols-[minmax(0,1fr)_clamp(360px,31vw,460px)] 2xl:grid-cols-[minmax(0,1fr)_540px]"
              : selectedTower
                ? "xl:grid-cols-[minmax(0,1fr)]"
                : "xl:grid-cols-[minmax(0,1fr)]"
          }`}
        >
          {!selectedApartment ? (
            <div
              className={`pointer-events-none ${
                shouldUseCompactLayout ? "hidden" : "hidden xl:block"
              }`}
            />
          ) : null}

          <AnimatePresence>
            {selectedApartment ? (
              <motion.div
                initial={{ opacity: 0, x: 24, y: 12 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, x: 24, y: 12 }}
                transition={{ duration: 0.26, ease: smoothEase }}
                className="pointer-events-none absolute left-6 top-1/2 z-40 hidden -translate-y-1/2 xl:block 2xl:left-10"
              >
                <button
                  type="button"
                  onClick={handleOpenBareShellWalkthrough}
                  className="pointer-events-auto group relative flex h-[320px] w-[280px] flex-col overflow-hidden rounded-[40px] border border-white/15 bg-black/20 shadow-[0_20px_40px_rgba(0,0,0,0.4)] backdrop-blur-[10px] transition-all duration-300 hover:scale-[1.02] hover:border-white/30"
                  aria-label="Open bare shell walkthrough"
                >
                  <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
                    <NextImage
                      src={BARE_SHELL_PANEL_PREVIEW_IMAGE}
                      alt="Bare shell walkthrough preview"
                      fill
                      sizes="280px"
                      className="object-cover transition-all duration-700 group-hover:scale-[1.05]"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.2)_0%,rgba(0,0,0,0.1)_50%,rgba(0,0,0,0.7)_100%)]" />
                  </div>

                  <div className="relative flex h-full flex-col p-6">
                    <div className="flex items-start justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/60">
                        Bare Shell
                      </p>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/25 shadow-[0_4px_12px_rgba(0,0,0,0.2)] backdrop-blur-[4px]">
                        <Play className="h-3 w-3 fill-white ml-0.5" />
                      </div>
                    </div>

                    <div className="my-auto text-center">
                      <p className="mx-auto max-w-[180px] text-[22px] font-medium leading-[1.2] tracking-[-0.01em] text-white">
                        Open alternate walkthrough
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="h-px w-full bg-white/20" />
                      <div className="flex items-center gap-3">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                          <Play className="h-2 w-2 fill-white" />
                        </div>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/80">
                          Video Walkthrough
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {selectedApartment ? (
              <motion.div
                initial={{ opacity: 0, x: 24, y: 12 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, x: 24, y: 12 }}
                transition={{ duration: 0.26, ease: smoothEase }}
                className="pointer-events-none absolute right-6 top-1/2 z-40 w-full max-w-[26rem] -translate-y-1/2 overflow-visible 2xl:right-10"
              >
                <SelectedFlatDetailsPanel
                  ref={selectedFlatPanelRef}
                  apartment={selectedApartment}
                  compact
                  desktopEnhancedCompact
                  hideCloseButton
                  onClose={clearSelectedApartment}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {shouldShowDesktopSidebar && !isDesktopSidebarOpen ? (
              <motion.button
                key="desktop-sidebar-open"
                type="button"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.24, ease: smoothEase }}
                onClick={() => setIsDesktopSidebarOpen(true)}
                className="pointer-events-auto absolute right-0 top-12 z-40 hidden h-16 w-14 translate-x-[22%] items-center justify-center rounded-l-[1.45rem] rounded-r-[0.5rem] border border-white/40 bg-[linear-gradient(145deg,rgba(255,255,255,0.58),rgba(255,255,255,0.2))] text-zinc-900 shadow-[0_22px_48px_rgba(15,23,42,0.2)] backdrop-blur-2xl transition hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.72),rgba(255,255,255,0.28))] xl:inline-flex"
                aria-label="Open master plan panel"
              >
                <ArrowLeft className="h-5 w-5" />
              </motion.button>
            ) : null}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {shouldShowDesktopSidebar && isDesktopSidebarOpen ? (
              <motion.aside
                key="sidebar"
                variants={panelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="pointer-events-auto gpu-layer min-w-0 hidden overflow-visible xl:col-start-2 xl:block xl:h-full"
              >
                <div
                  className={`custom-scrollbar sticky ml-auto min-h-0 w-full overflow-visible pr-1 [overflow-anchor:none] ${
                    selectedTower
                      ? isDesktopCompactViewport
                        ? "max-w-[330px]"
                        : "max-w-[clamp(320px,27vw,380px)] 2xl:max-w-[420px]"
                      : isDesktopCompactViewport
                        ? "max-w-[380px]"
                        : "max-w-[clamp(360px,31vw,460px)] 2xl:max-w-[540px]"
                  }`}
                  data-scroll-area="sidebar"
                  style={{
                    height:
                      "calc(100dvh - max(env(safe-area-inset-top), 1.5rem) - 1.5rem)",
                    top: "max(env(safe-area-inset-top), 1.5rem)",
                  }}
                >
                  <div className="relative flex h-full min-h-0 flex-col gap-6 overflow-y-auto overscroll-contain">
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
                          minArea={minArea}
                          onMinAreaChange={setMinArea}
                          onClosePanel={() => setIsDesktopSidebarOpen(false)}
                          onReset={resetFilters}
                          onBack={handleBackToTowerSelect}
                        />

                        <MasterPlanResultsCard
                          filteredApartments={filteredApartments}
                          isInventoryLoading={isInventoryLoading}
                          inventoryError={inventoryError}
                          onApartmentSelect={handleApartmentListSelect}
                          activeHotspot={activeHotspot}
                          selectedApartmentId={selectedApartmentInventoryId}
                        />
                      </>
                    ) : (
                      <TowerSelect
                        compactDesktop={isDesktopCompactViewport}
                        embedded
                        isTopViewActive={isTopViewMode}
                        onClose={() => setIsDesktopSidebarOpen(false)}
                        onTopViewClick={handleTopViewToggle}
                        selectedTower={selectedTower}
                        onSelectTower={handleTowerSelect}
                      />
                    )}
                  </div>
                </div>
              </motion.aside>
            ) : null}
          </AnimatePresence>
        </div>

        {!isLeaving ? (
          <>
            <AnimatePresence>
              {selectedTower && isMobileSheetOpen && !selectedApartment ? (
                <motion.button
                  type="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMobileSheetOpen(false)}
                  className={`pointer-events-auto absolute inset-0 z-20 bg-black/10 backdrop-blur-[1px] ${
                    shouldUseCompactLayout ? "" : "xl:hidden"
                  }`}
                  aria-label="Close master plan panel"
                />
              ) : null}
            </AnimatePresence>

            {!isMobileSheetOpen && selectedTower && !selectedApartment ? (
              <button
                type="button"
                onClick={() => setIsMobileSheetOpen(true)}
                className={`pointer-events-auto absolute right-4 z-30 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-4 py-3 text-sm font-medium text-zinc-900 shadow-[0_14px_36px_rgba(15,23,42,0.18)] backdrop-blur-xl ${
                  shouldUseCompactLayout ? "" : "xl:hidden"
                } ${
                  shouldUseCompactLayout
                    ? "bottom-[calc(env(safe-area-inset-bottom)+0.85rem)]"
                    : "bottom-6"
                }`}
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
              className={`gpu-layer absolute inset-x-0 z-30 ${
                shouldUseCompactLayout ? "" : "xl:hidden"
              } ${
                isMobileSheetOpen ? "pointer-events-auto" : "pointer-events-none"
              } ${
                shouldUseCompactLayout
                  ? "bottom-0"
                  : "bottom-3"
              }`}
            >
              <div
                className={`surface-contain flex min-h-0 flex-col overflow-hidden rounded-t-[26px] border border-white/60 border-b-0 bg-white/92 shadow-[0_-20px_50px_rgba(15,23,42,0.20)] backdrop-blur-2xl dark:border-white/10 dark:bg-black/70 sm:mx-1 sm:rounded-t-[28px] sm:rounded-b-none ${
                  selectedTower ? "h-[min(84dvh,48rem)]" : "h-auto"
                }`}
                data-scroll-area={selectedTower ? "mobile-sheet" : undefined}
              >
                {selectedTower && !selectedApartment ? (
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

                    <div className="flex min-h-0 flex-1 flex-col gap-2.5 px-2 pb-2.5 pt-2 sm:gap-3 sm:px-2.5">
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
                        onApartmentSelect={handleApartmentListSelect}
                        activeHotspot={activeHotspot}
                        selectedApartmentId={selectedApartmentInventoryId}
                        compact
                      />
                    </div>
                  </>
                ) : (
                  <div className="p-4">
                    <TowerSelect
                      embedded
                      isTopViewActive={isTopViewMode}
                      mobile
                      onTopViewClick={handleTopViewToggle}
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
      ) : null}

      <AnimatePresence>
        {isSpecialVideoOverlayMounted ? (
          <motion.div
            initial={false}
            animate={{
              opacity: isSpecialVideoOpen ? 1 : 0,
              scale: isSpecialVideoOpen ? 1 : 1.02,
            }}
            exit={{ opacity: 0, scale: 1.015 }}
            transition={{ duration: 0.38, ease: smoothEase }}
            className={`absolute inset-0 z-[70] overflow-hidden bg-black ${
              isSpecialVideoOpen ? "pointer-events-auto" : "pointer-events-none"
            }`}
          >
            <div className="absolute inset-0">
              <video
                ref={specialUnitVideoRef}
                muted
                playsInline
                preload="auto"
                crossOrigin="anonymous"
                disablePictureInPicture
                className="h-full w-full object-cover"
                onEnded={() => {
                  if (isSpecialVideoReversing) {
                    closeSpecialUnitVideo();
                    return;
                  }

                  setIsSpecialVideoCompleted(true);
                }}
              />
            </div>

            <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
              <button
                type="button"
                onClick={handleSpecialVideoBack}
                className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/78 px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-[0_18px_44px_rgba(15,23,42,0.18)] backdrop-blur-xl transition hover:bg-white"
                aria-label="Go back from unit 3601 preview"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            </div>

            <AnimatePresence>
              {isSpecialVideoCompleted &&
              !isSpecialVideoReversing &&
              specialVideoApartment ? (
                <motion.div
                  initial={{ opacity: 0, x: 24, y: 12 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  exit={{ opacity: 0, x: 24, y: 12 }}
                  transition={{ duration: 0.28, ease: smoothEase }}
                  className="pointer-events-none absolute inset-x-3 bottom-3 z-20 sm:inset-x-auto sm:right-5 sm:top-1/2 sm:bottom-auto sm:w-full sm:max-w-[27rem] sm:-translate-y-1/2 lg:right-8"
                >
                  <SelectedFlatDetailsPanel
                    apartment={specialVideoApartment}
                    compact={shouldUseCompactLayout}
                    hideCloseButton={false}
                    onClose={handleSpecialVideoBack}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        ) : null}
      </AnimatePresence>
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
  minArea,
  onMinAreaChange,
  onClosePanel,
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
  minArea: number;
  onMinAreaChange: (value: number) => void;
  onClosePanel?: () => void;
  onReset: () => void;
  onBack: () => void;
  compact?: boolean;
}) {
  const activeFilterCount =
    Number(search.trim().length > 0) +
    Number(bhk !== "All") +
    Number(facing !== "All") +
    Number(status !== "All") +
    Number(minArea > 0);
  const [isCompactOpen, setIsCompactOpen] = useState(compact);

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
            {isCompactOpen ? "Hide filters" : "Show filters"}
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
            onClick={onClosePanel ?? onReset}
            className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 cursor-pointer text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
          >
            {onClosePanel ? "Close" : "Reset"}
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
  onApartmentSelect,
  activeHotspot,
  selectedApartmentId,
  compact = false,
}: {
  filteredApartments: InventoryApartment[];
  isInventoryLoading: boolean;
  inventoryError: string | null;
  onApartmentSelect: (apartment: InventoryApartment) => void;
  activeHotspot: MasterPlanHotspotKey;
  selectedApartmentId: string | null;
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
            View the Flats matching your requirement
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
        className={`custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain [overflow-anchor:none] [-webkit-overflow-scrolling:touch] touch-pan-y ${
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
              filteredApartments.map((apartment) => {
                const isViewableAtHotspot = isInventoryApartmentAllowedAtHotspot(
                  apartment,
                  activeHotspot,
                );

                return (
                  <motion.button
                    key={apartment.id}
                    layout="position"
                    variants={itemAnim}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={() => {
                      if (!isViewableAtHotspot) {
                        return;
                      }

                      onApartmentSelect(apartment);
                    }}
                    className={`group flex w-full text-left shadow-sm transition dark:to-white/5 ${
                      apartment.id === selectedApartmentId
                        ? "border-[#d4b57b]/70 bg-linear-to-br from-[#fff7ea] to-[#f7edd6] shadow-[0_18px_42px_rgba(186,146,79,0.18)] dark:border-[#d4b57b]/35 dark:from-[#3b3223] dark:to-[#211d16]"
                        : "dark:border-white/10 dark:from-white/10"
                    } ${
                      compact
                        ? "flex-col gap-3 rounded-[20px] border px-3.5 py-3"
                        : "items-center justify-between rounded-[22px] border px-4 py-3"
                    } ${
                      apartment.id === selectedApartmentId
                        ? "border-[#e0c493]/70"
                        : compact
                          ? "border-zinc-200/60 bg-linear-to-br from-white to-zinc-50"
                          : "border-zinc-200/50 bg-linear-to-br from-white to-zinc-50"
                    } ${
                      isViewableAtHotspot
                        ? "cursor-pointer"
                        : "cursor-not-allowed opacity-60 saturate-75"
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
                        {!isViewableAtHotspot ? (
                          <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-white/8 dark:text-zinc-300">
                            Not viewable here
                          </span>
                        ) : null}
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
                );
              })
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
