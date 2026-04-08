"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, type Transition } from "framer-motion";
import { FiPhone, FiDownload, FiDollarSign, FiGrid, FiHome } from "react-icons/fi";
import { BiHome } from "react-icons/bi";
import { IoMapOutline } from "react-icons/io5";
import { PiMapPinAreaFill } from "react-icons/pi";
import { Footprints, Menu, User, X } from "lucide-react";

interface CtaButtonType {
  name: string;
  link?: string;
  action: "link" | "quote-modal";
  isHighlight: boolean;
  icon: React.ReactNode;
}

type UpperLayoutCTAProps = {
  onQuoteClick: () => void;
  mergeRouteLinks?: boolean;
};

function shouldBottomDockCta() {
  if (typeof window === "undefined") {
    return false;
  }

  const compactViewport = window.matchMedia("(max-width: 1279px)").matches;
  const primaryPointerCoarse = window.matchMedia("(pointer: coarse)").matches;
  const finePointerAvailable =
    window.matchMedia("(pointer: fine)").matches ||
    window.matchMedia("(any-pointer: fine)").matches;

  return (
    compactViewport || (primaryPointerCoarse && !finePointerAvailable)
  );
}

function shouldHideMasterPlanCompactDesktopRail(pathname: string | null) {
  if (typeof window === "undefined" || pathname !== "/master-plan") {
    return false;
  }

  return (
    window.matchMedia("(min-width: 1280px) and (max-width: 1699px)").matches &&
    window.matchMedia("(pointer: fine)").matches &&
    !window.matchMedia("(pointer: coarse)").matches &&
    !window.matchMedia("(any-pointer: coarse)").matches
  );
}

const spring: Transition = {
  type: "spring",
  stiffness: 280,
  damping: 24,
};

export default function UpperLayoutCTA({
  onQuoteClick,
  mergeRouteLinks = false,
}: UpperLayoutCTAProps) {
  const pathname = usePathname();
  const [hovered, setHovered] = useState<string | null>(null);
  const [shouldDockAtBottom, setShouldDockAtBottom] = useState(
    shouldBottomDockCta,
  );
  const [shouldHideCompactDesktopRail, setShouldHideCompactDesktopRail] =
    useState(() => shouldHideMasterPlanCompactDesktopRail(pathname));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const scrollerDragRef = useRef<{
    dragging: boolean;
    lastX: number;
    pointerId: number | null;
  }>({
    dragging: false,
    lastX: 0,
    pointerId: null,
  });
  const isMasterPlanRoute = pathname === "/master-plan";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const compactViewportMedia = window.matchMedia("(max-width: 1279px)");
    const touchViewportMedia = window.matchMedia("(pointer: coarse)");
    const finePointerMedia = window.matchMedia("(pointer: fine)");
    const anyFinePointerMedia = window.matchMedia("(any-pointer: fine)");

    const syncBottomDock = () => {
      setShouldDockAtBottom(
        compactViewportMedia.matches ||
          (touchViewportMedia.matches &&
            !finePointerMedia.matches &&
            !anyFinePointerMedia.matches),
      );
    };

    syncBottomDock();
    compactViewportMedia.addEventListener("change", syncBottomDock);
    touchViewportMedia.addEventListener("change", syncBottomDock);
    finePointerMedia.addEventListener("change", syncBottomDock);
    anyFinePointerMedia.addEventListener("change", syncBottomDock);

    return () => {
      compactViewportMedia.removeEventListener("change", syncBottomDock);
      touchViewportMedia.removeEventListener("change", syncBottomDock);
      finePointerMedia.removeEventListener("change", syncBottomDock);
      anyFinePointerMedia.removeEventListener("change", syncBottomDock);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const compactDesktopMedia = window.matchMedia(
      "(min-width: 1280px) and (max-width: 1699px)",
    );
    const finePointerMedia = window.matchMedia("(pointer: fine)");
    const coarsePointerMedia = window.matchMedia("(pointer: coarse)");
    const anyCoarsePointerMedia = window.matchMedia("(any-pointer: coarse)");

    const syncCompactDesktopRail = () => {
      setShouldHideCompactDesktopRail(
        pathname === "/master-plan" &&
          compactDesktopMedia.matches &&
          finePointerMedia.matches &&
          !coarsePointerMedia.matches &&
          !anyCoarsePointerMedia.matches,
      );
    };

    syncCompactDesktopRail();
    compactDesktopMedia.addEventListener("change", syncCompactDesktopRail);
    finePointerMedia.addEventListener("change", syncCompactDesktopRail);
    coarsePointerMedia.addEventListener("change", syncCompactDesktopRail);
    anyCoarsePointerMedia.addEventListener("change", syncCompactDesktopRail);

    return () => {
      compactDesktopMedia.removeEventListener("change", syncCompactDesktopRail);
      finePointerMedia.removeEventListener("change", syncCompactDesktopRail);
      coarsePointerMedia.removeEventListener("change", syncCompactDesktopRail);
      anyCoarsePointerMedia.removeEventListener(
        "change",
        syncCompactDesktopRail,
      );
    };
  }, [pathname]);

  const primaryButtons: CtaButtonType[] = [
    {
      name: "Contact Us",
      link: "tel:+91-808 800 4411",
      action: "link",
      isHighlight: true,
      icon: <FiPhone className="h-4 w-4" />,
    },
    {
      name: "Brochure",
      link: "/Veranza Floorplan_ E-Brochure_V3_02-03-26 (2).pdf",
      action: "link",
      isHighlight: false,
      icon: <FiDownload className="h-4 w-4" />,
    },
    {
      name: "Get A Quote",
      action: "quote-modal",
      isHighlight: false,
      icon: <FiDollarSign className="h-4 w-4" />,
    },
    {
      name: isMasterPlanRoute ? "Home" : "Floor Plan",
      link: isMasterPlanRoute ? "/" : "/floor-plan",
      action: "link",
      isHighlight: false,
      icon: isMasterPlanRoute ? (
        <FiHome className="h-4 w-4" />
      ) : (
        <FiGrid className="h-4 w-4" />
      ),
    },
  ];

  const routeButtons = useMemo(() => {
    if (!mergeRouteLinks) {
      return [];
    }

    return [
      {
        name: "Home",
        link: "/",
        action: "link",
        isHighlight: false,
        icon: <BiHome className="h-4 w-4" />,
      },
      {
        name: "Project Overview",
        link: "/project-overview",
        action: "link",
        isHighlight: false,
        icon: <User className="h-4 w-4" />,
      },
      {
        name: "Master Plan",
        link: "/master-plan",
        action: "link",
        isHighlight: false,
        icon: <PiMapPinAreaFill className="h-4 w-4" />,
      },
      {
        name: "Map",
        link: "/area-map",
        action: "link",
        isHighlight: false,
        icon: <IoMapOutline className="h-4 w-4" />,
      },
      {
        name: "Walkthrough",
        link: "/exterior-walkthrough",
        action: "link",
        isHighlight: false,
        icon: <Footprints className="h-4 w-4" />,
      },
    ].filter((button) => !(isMasterPlanRoute && button.name === "Home"));
  }, [isMasterPlanRoute, mergeRouteLinks]);

  const buttons = [...primaryButtons, ...routeButtons];
  const shouldShowLabels = !mergeRouteLinks && !shouldDockAtBottom;
  const shouldEnableRailDrag = shouldDockAtBottom;

  if (shouldHideCompactDesktopRail) {
    return null;
  }

  if (shouldDockAtBottom) {
    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-[max(env(safe-area-inset-bottom),0.45rem)] z-50 px-2 pb-0">
        <div className="flex items-end justify-start">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((value) => !value)}
            className="pointer-events-auto inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/18 bg-black/92 text-white shadow-[0_18px_48px_rgba(0,0,0,0.58)] backdrop-blur-xl transition active:scale-[0.98]"
            aria-label={isMobileMenuOpen ? "Close quick actions" : "Open quick actions"}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <AnimatePresence initial={false}>
            {isMobileMenuOpen ? (
              <motion.div
                initial={{ opacity: 0, x: -12, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -12, scale: 0.96 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="pointer-events-auto ml-2.5 flex max-w-[calc(100vw-5.75rem)] items-center gap-2 overflow-x-auto rounded-full border border-white/14 bg-black/92 px-2.5 py-2 shadow-[0_18px_48px_rgba(0,0,0,0.58)] backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {buttons.map((button) =>
                  button.action === "link" && button.link ? (
                    <Link
                      key={button.name}
                      href={button.link}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[11px] font-medium ${
                        button.isHighlight
                          ? "border-white/60 bg-white text-zinc-900"
                          : "border-white/10 bg-white/10 text-white"
                      }`}
                    >
                      <span className="flex h-4 w-4 items-center justify-center">
                        {button.icon}
                      </span>
                      <span className="whitespace-nowrap">{button.name}</span>
                    </Link>
                  ) : (
                    <button
                      key={button.name}
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onQuoteClick();
                      }}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[11px] font-medium ${
                        button.isHighlight
                          ? "border-white/60 bg-white text-zinc-900"
                          : "border-white/10 bg-white/10 text-white"
                      }`}
                    >
                      <span className="flex h-4 w-4 items-center justify-center">
                        {button.icon}
                      </span>
                      <span className="whitespace-nowrap">{button.name}</span>
                    </button>
                  ),
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  const handleScrollerPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (!shouldEnableRailDrag || !scrollerRef.current) {
      return;
    }

    const nextDragState = scrollerDragRef.current;
    nextDragState.dragging = true;
    nextDragState.lastX = event.clientX;
    nextDragState.pointerId = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleScrollerPointerMove = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    const dragState = scrollerDragRef.current;
    const scroller = scrollerRef.current;

    if (
      !shouldEnableRailDrag ||
      !dragState.dragging ||
      dragState.pointerId !== event.pointerId ||
      !scroller
    ) {
      return;
    }

    const deltaX = event.clientX - dragState.lastX;
    dragState.lastX = event.clientX;
    scroller.scrollLeft -= deltaX;
  };

  const handleScrollerPointerUp = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    const dragState = scrollerDragRef.current;

    if (dragState.pointerId !== event.pointerId) {
      return;
    }

    dragState.dragging = false;
    dragState.pointerId = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <>
      <div
        className={`pointer-events-none fixed inset-x-0 z-50 flex justify-center px-2 md:px-0 ${
          shouldDockAtBottom
            ? "bottom-[max(env(safe-area-inset-bottom),0.85rem)]"
            : "top-3 md:top-0"
        }`}
      >
      <motion.div
        layout
        transition={spring}
        className="pointer-events-auto relative mx-auto w-fit max-w-full"
      >
        <motion.div
          layout
          transition={spring}
          className={`relative max-w-full overflow-visible rounded-full border border-white/20 bg-black px-3 py-3 shadow-[0_20px_90px_rgba(0,0,0,0.8)] backdrop-blur-xl ${
            shouldDockAtBottom
              ? "md:px-5 md:py-3"
              : "md:rounded-t-[75px] md:px-16 md:py-4"
          }`}
        >
          {/* Right Wave */}
          <svg
            width="130"
            height="58"
            viewBox="0 0 130 58"
            className={`absolute -right-[113px] -top-1 hidden ${
              shouldDockAtBottom ? "" : "md:block"
            }`}
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
            className={`absolute -left-[113px] -top-1 hidden ${
              shouldDockAtBottom ? "" : "md:block"
            }`}
          >
            <path
              d="M130,58 L130,0 L0,0 A130,58 0 0,1 130,58 Z"
              className="fill-black shadow-[0_20px_50px_rgba(0,0,0,0.7)]"
            />
          </svg>

          <motion.div
            ref={scrollerRef}
            layout
            transition={spring}
            onPointerDown={handleScrollerPointerDown}
            onPointerMove={handleScrollerPointerMove}
            onPointerUp={handleScrollerPointerUp}
            onPointerCancel={handleScrollerPointerUp}
            className={`flex max-w-[calc(100vw-2rem)] items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
              shouldEnableRailDrag
                ? "cursor-grab touch-pan-x active:cursor-grabbing"
                : ""
            } ${shouldDockAtBottom ? "md:max-w-[calc(100vw-2rem)]" : "md:max-w-none"} md:gap-2`}
          >
            {buttons.map((button) => {
              const isHovered = shouldShowLabels && hovered === button.name;

              return (
                <motion.div
                  key={button.name}
                  layout
                  onHoverStart={() => setHovered(button.name)}
                  onHoverEnd={() => setHovered(null)}
                  transition={spring}
                >
                  {button.action === "link" && button.link ? (
                    <Link href={button.link}>
                      <motion.div
                        layout
                        transition={spring}
                        className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border text-xs font-medium md:text-xs ${
                          button.isHighlight
                            ? "bg-white text-zinc-900 shadow-md"
                            : "border-white/10 bg-white/10 text-white"
                        }`}
                        animate={{
                          paddingLeft: isHovered ? 16 : mergeRouteLinks ? 9 : 10,
                          paddingRight: isHovered ? 16 : mergeRouteLinks ? 9 : 10,
                        }}
                      >
                        <motion.span
                          className="flex h-8 w-4 items-center justify-center md:h-10"
                          animate={{ scale: isHovered ? 1.08 : 1 }}
                          transition={spring}
                        >
                          {button.icon}
                        </motion.span>

                        <AnimatePresence initial={false}>
                          {shouldShowLabels && isHovered && (
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
                  ) : (
                    <motion.button
                      type="button"
                      layout
                      transition={spring}
                      onClick={onQuoteClick}
                      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border text-xs font-medium md:text-xs ${
                        button.isHighlight
                          ? "bg-white text-zinc-900 shadow-md"
                          : "border-white/10 bg-white/10 text-white"
                      }`}
                      animate={{
                        paddingLeft: isHovered ? 16 : mergeRouteLinks ? 9 : 10,
                        paddingRight: isHovered ? 16 : mergeRouteLinks ? 9 : 10,
                      }}
                    >
                      <motion.span
                        className="flex h-8 w-4 items-center justify-center md:h-10"
                        animate={{ scale: isHovered ? 1.08 : 1 }}
                        transition={spring}
                      >
                        {button.icon}
                      </motion.span>

                      <AnimatePresence initial={false}>
                        {shouldShowLabels && isHovered && (
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
                    </motion.button>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
      </motion.div>
      </div>
    </>
  );
}
