"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import CoverPage from "@/components/deck/pages/CoverPage";
import ClosingPage from "@/components/deck/pages/ClosingPage";
import OverviewLeftPage from "./pages/OverviewLeftPage";
import OverviewRightPage from "./pages/OverviewRightPage";
import { motion } from "framer-motion";
import PlantImage from "@/assets/still-life-with-indoor-plants.png";
import OverviewBg from "@/assets/overviewBg.jpeg";
import HangingPlant from "@/assets/hanging-golden-pothos-marble-pot-lush-indoor-greenery.png";
import Image from "next/image";
import UnitPlanLeftPage from "./pages/TowerA_01_left";
import UnitPlanRightPage from "./pages/TowerA_01_right";
import LeafOverlay from "@/components/ui/LeafOverlay"
import { unitPlans } from "@/data/unitPlans";

type PageFlipInstance = {
  flipNext: (corner?: "top" | "bottom") => void;
  flipPrev: (corner?: "top" | "bottom") => void;
};

type FlipBookRef = {
  pageFlip: () => PageFlipInstance | undefined;
};

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
  const bookRef = useRef<FlipBookRef | null>(null);
  const [viewport, setViewport] = useState({
    width: 1400,
    height: 900,
  });

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

  const closingPageNumber = 5 + unitPlans.length * 2;

  return [
    ...staticPages,
    ...unitPlanPages,
    <ClosingPage key="closing" number={closingPageNumber} />,
  ];
}, []);

  const isMobile = viewport.width < 640;
  const isTablet = viewport.width >= 640 && viewport.width < 1024;
  const isSmallLaptop = viewport.width >= 1024 && viewport.width < 1280;

  const bookConfig = (() => {
    // Desktop: keep your current layout
    if (!isMobile && !isTablet && !isSmallLaptop) {
      return {
        width: 1000,
        height: 950,
        minWidth: 280,
        maxWidth: 1000,
        minHeight: 420,
        maxHeight: 950,
      };
    }

    // Small laptops: slightly taller, less square
    if (isSmallLaptop) {
      return {
        width: 900,
        height: 1150,
        minWidth: 700,
        maxWidth: 920,
        minHeight: 780,
        maxHeight: 1150,
      };
    }

    // Tablets: more portrait-like
    if (isTablet) {
      return {
        width: 760,
        height: 1120,
        minWidth: 520,
        maxWidth: 780,
        minHeight: 760,
        maxHeight: 1120,
      };
    }

    // Mobile: tall portrait
    return {
      width: 390,
      height: 680,
      minWidth: 260,
      maxWidth: 410,
      minHeight: 500,
      maxHeight: 720,
    };
  })();

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-neutral-100 px-2 pb-3 pt-18 sm:px-4 sm:py-4 sm:pt-6">
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
       <LeafOverlay />

      <motion.div
        variants={leftPlantAnimation}
        initial="hidden"
        animate="show"
        className="pointer-events-none absolute bottom-0 left-0 hidden w-[18%] sm:block sm:w-[16%] lg:w-[20%]"
      >
        <Image
          src={PlantImage}
          alt="Plant Image Vector Trifecta"
          className="h-auto w-full"
          priority
        />
      </motion.div>

      <motion.div
        variants={hangingPlantAnimation}
        initial="hidden"
        animate="show"
        className="pointer-events-none absolute right-0 top-0 z-50 hidden w-[18%] origin-top sm:block sm:w-[16%] lg:w-[20%]"
      >
        <Image
          src={HangingPlant}
          alt="Hanging Plant Image Vector Trifecta"
          className="h-auto w-full"
          priority
        />
      </motion.div>

      <div className="relative z-10 mx-auto flex w-full max-w-[100%] flex-col items-center justify-center">
        <div className="relative flex w-full items-center justify-center">
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
              onFlip={() => {}}
              className="mx-auto"
              style={{}}
            >
              {pages}
            </HTMLFlipBook>
          </div>
        </div>
      </div>
    </div>
  );
}
