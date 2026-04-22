"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import HTMLFlipBook from "react-pageflip";
import CoverPage from "@/components/deck/pages/CoverPage";
import ClosingPage from "@/components/deck/pages/ClosingPage";
import FullImageSpreadPage from "@/components/deck/pages/FullImageSpreadPage";
import OverviewLeftPage from "./pages/OverviewLeftPage";
import OverviewRightPage from "./pages/OverviewRightPage";
import { AnimatePresence, motion } from "framer-motion";
import OverviewBg from "@/assets/overviewBg.avif";
import Image from "next/image";
import UnitPlanLeftPage from "./pages/TowerA_01_left";
import UnitPlanRightPage from "./pages/TowerA_01_right";
import LeafOverlay from "@/components/ui/LeafOverlay";
import { unitPlans } from "@/data/unitPlans";
import MobileDeckLanding from "./MobileDeckLanding";
import { ChevronLeft, ChevronRight } from "lucide-react";

type PageFlipInstance = {
  flipNext: (corner?: "top" | "bottom") => void;
  flipPrev: (corner?: "top" | "bottom") => void;
};

type FlipBookRef = {
  pageFlip: () => PageFlipInstance | undefined;
};

type FlipBookState = "user_fold" | "fold_corner" | "flipping" | "read";

const MASTERPLAN_STAGE_IMAGE =
  "https://cdn.sthyra.com/images/first_frame_again.png";

const hangingPlantAnimation = {
  hidden: {
    opacity: 0,
    y: -120,
    rotate: -4,
  },
  show: {
    opacity: 1,
    y: 0,
    rotate: 0,
    transition: {
      duration: 4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const leftPlantAnimation = {
  hidden: {
    opacity: 0,
    x: -80,
    y: 60,
    scale: 0.92,
  },
  show: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    transition: {
      duration: 2,
      delay: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const bgAnimation = {
  hidden: {
    opacity: 0,
    scale: 1.04,
  },
  show: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 1.1,
      ease: "easeOut" as const,
    },
  },
};

export default function FlipBookDeck() {
  const router = useRouter();
  const bookRef = useRef<FlipBookRef | null>(null);
  const masterplanRouteTimerRef = useRef<number | null>(null);
  const [viewport, setViewport] = useState({
    width: 1400,
    height: 900,
  });
  const [currentPage, setCurrentPage] = useState(0);
  const [bookState, setBookState] = useState<FlipBookState>("read");
  const [isEnteringMasterPlan, setIsEnteringMasterPlan] = useState(false);

  useEffect(() => {
    const updateViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    router.prefetch("/master-plan");

    return () => {
      if (masterplanRouteTimerRef.current !== null) {
        window.clearTimeout(masterplanRouteTimerRef.current);
      }
    };
  }, [router]);

  const pages = useMemo(() => {
    const staticPages = [
      <CoverPage key="cover" number={1} />,
      <OverviewLeftPage key="overviewImage" number={3} />,
      <OverviewRightPage key="overviewChart" number={4} />,
    ];

    const unitPlanPages = unitPlans.flatMap((plan, index) => {
      const leftPageNumber = 5 + index * 2;
      const rightPageNumber = 6 + index * 2;

      return [
        <UnitPlanLeftPage
          key={`${plan.id}-2d`}
          number={leftPageNumber}
          series={plan.series}
          towerA={plan.towerA}
          towerB={plan.towerB}
          bhk={plan.bhk}
          facing={plan.facing}
          areaLabel={plan.areaLabel}
          areaValue={plan.areaValue}
          description={plan.description}
          image2D={plan.image2D}
        />,
        <UnitPlanRightPage
          key={`${plan.id}-3d`}
          number={rightPageNumber}
          image3D={plan.image3D}
          specs={plan.specs}
        />,
      ];
    });

    const spreadLeftPageNumber = 5 + unitPlans.length * 2;
    const spreadRightPageNumber = spreadLeftPageNumber + 1;
    const closingPageNumber = spreadRightPageNumber + 1;

    return [
      ...staticPages,
      ...unitPlanPages,
      <FullImageSpreadPage
        key="overview-frame-spread-left"
        side="left"
        number={spreadLeftPageNumber}
      />,
      <FullImageSpreadPage
        key="overview-frame-spread-right"
        side="right"
        number={spreadRightPageNumber}
      />,
      <ClosingPage key="closing" number={closingPageNumber} />,
    ];
  }, []);
  const isSafariLike =
    typeof navigator !== "undefined"
      ? /Safari/i.test(navigator.userAgent ?? "") &&
        !/Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS|Android/i.test(
          navigator.userAgent ?? "",
        )
      : false;

  const isMobile = viewport.width < 640;
  const isTablet = viewport.width >= 640 && viewport.width < 1024;
  const isSmallLaptop = viewport.width >= 1024 && viewport.width < 1280;
  const isCompactDesktop = viewport.width >= 1280 && viewport.width < 1700;
  const useStackedDeck = viewport.width < 1280;
  const isShortDesktopViewport = !useStackedDeck && viewport.height < 960;
  const useResponsiveDesktopBook =
    !useStackedDeck &&
    (isCompactDesktop || isShortDesktopViewport || (isSafariLike && viewport.width < 1800));
  const lastPageIndex = pages.length - 1;
  const masterplanSpreadPageIndex = 3 + unitPlans.length * 2;
  const isMasterplanSpreadVisible =
    !useStackedDeck &&
    currentPage >= masterplanSpreadPageIndex &&
    currentPage <= masterplanSpreadPageIndex + 1;
  const shouldShowMasterplanButton =
    isMasterplanSpreadVisible && bookState === "read" && !isEnteringMasterPlan;

  const enterMasterPlan = () => {
    if (isEnteringMasterPlan) {
      return;
    }

    router.prefetch("/master-plan");
    setIsEnteringMasterPlan(true);

    masterplanRouteTimerRef.current = window.setTimeout(() => {
      router.push("/master-plan");
    }, 1750);
  };

  const goToPreviousPage = () => {
    bookRef.current?.pageFlip()?.flipPrev("bottom");
  };

  const goToNextPage = () => {
    bookRef.current?.pageFlip()?.flipNext("bottom");
  };

  const compactDesktopPageWidth = Math.max(
    580,
    Math.min(
      Math.floor((viewport.width - (isSafariLike ? 120 : 96)) / 2),
      isSafariLike || isShortDesktopViewport ? 640 : 760,
    ),
  );
  const compactDesktopPageHeight = Math.max(
    700,
    Math.min(
      viewport.height - (isSafariLike ? 124 : 104),
      isSafariLike || isShortDesktopViewport ? 780 : 840,
    ),
  );
  const desktopPageHeight = Math.max(740, Math.min(viewport.height - 88, 940));
  const desktopPageWidth = Math.max(
    660,
    Math.min(Math.floor((viewport.width - 176) / 2), 920),
  );

  const bookConfig = (() => {
    if (useResponsiveDesktopBook) {
      return {
        width: compactDesktopPageWidth,
        height: compactDesktopPageHeight,
        minWidth: compactDesktopPageWidth,
        maxWidth: compactDesktopPageWidth,
        minHeight: compactDesktopPageHeight,
        maxHeight: compactDesktopPageHeight,
      };
    }

    if (!isMobile && !isTablet && !isSmallLaptop) {
      return {
        width: desktopPageWidth,
        height: desktopPageHeight,
        minWidth: desktopPageWidth,
        maxWidth: desktopPageWidth,
        minHeight: desktopPageHeight,
        maxHeight: desktopPageHeight,
      };
    }

    if (isSmallLaptop) {
      return {
        width: 540,
        height: Math.max(700, Math.min(viewport.height - 110, 760)),
        minWidth: 540,
        maxWidth: 540,
        minHeight: Math.max(700, Math.min(viewport.height - 110, 760)),
        maxHeight: Math.max(700, Math.min(viewport.height - 110, 760)),
      };
    }

    if (isTablet) {
      return {
        width: 700,
        height: 980,
        minWidth: 480,
        maxWidth: 740,
        minHeight: 700,
        maxHeight: 1000,
      };
    }

    // Mobile: tall portrait
    return {
      width: 360,
      height: 640,
      minWidth: 280,
      maxWidth: 380,
      minHeight: 540,
      maxHeight: 680,
    };
  })();

  return (
    <div
      className={`relative min-h-dvh justify-center bg-neutral-100 ${
        useStackedDeck
          ? "h-dvh overflow-y-auto overflow-x-hidden overscroll-contain bg-[linear-gradient(180deg,#d5b785_0%,#c19b64_26%,#f5ede0_62%,#f7f1e7_100%)] px-0 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-16 [-webkit-overflow-scrolling:touch] [touch-action:pan-y_pinch-zoom] sm:pt-18"
          : "flex h-dvh items-center overflow-hidden px-2 pb-4 pt-6 sm:px-4 lg:px-5 xl:px-6 sm:py-4"
      }`}
    >
      {!useStackedDeck ? (
        <motion.div
          variants={bgAnimation}
          initial="hidden"
          animate="show"
          className="absolute inset-0"
        >
          <Image
            src={OverviewBg}
            alt="Overview background"
            fill
            priority
            className="object-cover"
          />
        </motion.div>
      ) : null}
      {!useStackedDeck ? <LeafOverlay /> : null}

        <motion.div
          variants={leftPlantAnimation}
          initial="hidden"
          animate="show"
          className={`pointer-events-none absolute bottom-0 -left-20 hidden ${
          useStackedDeck
            ? "xl:block xl:w-[28%]"
            : isCompactDesktop
              ? "sm:block sm:w-[12%] lg:w-[20%]"
              : "sm:block sm:w-[16%] lg:w-[32%]"
        } w-[18%]`}
      >
        <Image
          src="https://cdn.sthyra.com/AADHYA%20SERENE/images/still-life-with-indoor-plants%20(1).png"
          alt="Plant Image Vector Trifecta"
          width={720}
          height={960}
          className="h-auto w-full"
        />
      </motion.div>

        <motion.div
          variants={hangingPlantAnimation}
          initial="hidden"
          animate="show"
          className={`pointer-events-none absolute right-0 top-0 z-50 hidden origin-top ${
          useStackedDeck
            ? "xl:block xl:w-[18%]"
            : isCompactDesktop
              ? "sm:block sm:w-[12%] lg:w-[14%]"
              : "sm:block sm:w-[16%] lg:w-[20%]"
        } w-[18%]`}
      >
        <Image
          src="https://cdn.sthyra.com/AADHYA%20SERENE/images/hanging-golden-pothos-marble-pot-lush-indoor-greenery%20(1).png"
          alt="Hanging Plant Image Vector Trifecta"
          width={720}
          height={960}
          className="h-auto w-full"
        />
      </motion.div>

      <div
        className={`relative z-10 mx-auto flex w-full max-w-full flex-col items-center ${
          useStackedDeck ? "min-h-full justify-start" : "justify-center"
        }`}
      >
        {useStackedDeck ? (
          <div className="w-full flex-none [touch-action:pan-y_pinch-zoom]">
            <MobileDeckLanding />
          </div>
        ) : (
          <motion.div
            className="relative flex w-full items-center justify-center will-change-transform"
            animate={
              isEnteringMasterPlan
                ? {
                    scale: 1.045,
                    opacity: 1,
                    filter: "saturate(1.08) contrast(1.02)",
                  }
                : { scale: 1, opacity: 1, filter: "saturate(1)" }
            }
            transition={{ duration: 1.95, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex w-full justify-center">
              <HTMLFlipBook
                ref={bookRef}
                width={bookConfig.width}
                height={bookConfig.height}
                size="stretch"
                minWidth={bookConfig.minWidth}
                maxWidth={bookConfig.maxWidth}
                minHeight={bookConfig.minHeight}
                maxHeight={bookConfig.maxHeight}
                drawShadow
                maxShadowOpacity={0.35}
                showCover
                mobileScrollSupport
                flippingTime={900}
                startPage={0}
                usePortrait
                startZIndex={1}
                autoSize
                clickEventForward
                useMouseEvents
                swipeDistance={30}
                showPageCorners
                disableFlipByClick={false}
                onFlip={(event) => {
                  setCurrentPage(event.data);
                }}
                onChangeState={(event) => {
                  setBookState(event.data as FlipBookState);
                }}
                className="mx-auto max-w-full"
                style={{}}
              >
                {pages}
              </HTMLFlipBook>
            </div>

            <AnimatePresence>
              {shouldShowMasterplanButton ? (
                <motion.button
                  type="button"
                  aria-label="Enter master plan"
                  onClick={(event) => {
                    event.stopPropagation();
                    enterMasterPlan();
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                  onPointerUp={(event) => event.stopPropagation()}
                  initial={{ opacity: 0, scale: 0.9, y: 18 }}
                  animate={{
                    opacity: 1,
                    scale: [1, 1.075, 1],
                    y: 0,
                    boxShadow: [
                      "0 18px 42px rgba(55,22,29,0.26), inset 0 1px 0 rgba(255,236,230,0.26)",
                      "0 26px 70px rgba(171,95,104,0.46), inset 0 1px 0 rgba(255,236,230,0.34)",
                      "0 18px 42px rgba(55,22,29,0.26), inset 0 1px 0 rgba(255,236,230,0.26)",
                    ],
                  }}
                  exit={{ opacity: 0, scale: 0.96, y: 10 }}
                  transition={{
                    opacity: { duration: 0.34, ease: [0.22, 1, 0.36, 1] },
                    y: { duration: 0.34, ease: [0.22, 1, 0.36, 1] },
                    scale: {
                      duration: 1.85,
                      repeat: Infinity,
                      ease: "easeInOut",
                    },
                    boxShadow: {
                      duration: 1.85,
                      repeat: Infinity,
                      ease: "easeInOut",
                    },
                  }}
                  className="group absolute bottom-10 left-1/2 z-40 inline-flex -translate-x-1/2 cursor-pointer items-center justify-center overflow-visible rounded-full border border-[#f2d7d3]/35 bg-[linear-gradient(135deg,#bd747c_0%,#ab5f68_46%,#87404b_100%)] px-7 py-3.5 text-[0.68rem] font-bold uppercase tracking-[0.34em] text-white transition duration-300 hover:border-[#ffe7dc]/60 hover:bg-[linear-gradient(135deg,#c9848b_0%,#ab5f68_42%,#7d3944_100%)] active:scale-[0.985]"
                >
                  <span className="pointer-events-none absolute -inset-2 rounded-full border border-[#f7ddd7]/35 opacity-55 animate-ping" />
                  <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
                    <span className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[#ffe8df]/80 to-transparent" />
                    <span className="absolute inset-0 -translate-x-full bg-[linear-gradient(105deg,transparent_0%,rgba(255,237,224,0.34)_45%,transparent_72%)] transition duration-1000 group-hover:translate-x-full" />
                  </span>
                  <span className="relative whitespace-nowrap">Enter Masterplan</span>
                </motion.button>
              ) : null}
            </AnimatePresence>

            <button
              type="button"
              onClick={goToPreviousPage}
              disabled={currentPage <= 0 || isEnteringMasterPlan}
              aria-label="Turn page left"
              className="absolute bottom-6 left-6 z-20 inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/35 bg-white/18 text-white shadow-[0_20px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl transition duration-200 hover:bg-white/26 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <ChevronLeft className="h-6 w-6" strokeWidth={2.3} />
            </button>

            <button
              type="button"
              onClick={goToNextPage}
              disabled={currentPage >= lastPageIndex || isEnteringMasterPlan}
              aria-label="Turn page right"
              className="absolute bottom-6 right-6 z-20 inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/35 bg-white/18 text-white shadow-[0_20px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl transition duration-200 hover:bg-white/26 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <ChevronRight className="h-6 w-6 " strokeWidth={2.3} />
            </button>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {isEnteringMasterPlan ? (
          <motion.div
            className="pointer-events-none fixed inset-0 z-[120] overflow-hidden bg-[#1f1a12]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 1 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="absolute inset-0"
              initial={{
                clipPath: "inset(8% 5% 8% 5% round 28px)",
                scale: 1,
              }}
              animate={{
                clipPath: "inset(0% 0% 0% 0% round 0px)",
                scale: 1.015,
              }}
              transition={{ duration: 2.05, ease: [0.16, 1, 0.3, 1] }}
            >
              <Image
                src={MASTERPLAN_STAGE_IMAGE}
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04),rgba(0,0,0,0)_42%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(18,14,9,0.12))]" />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
