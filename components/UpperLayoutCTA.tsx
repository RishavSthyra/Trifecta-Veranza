"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, type Transition } from "framer-motion";
import { FiPhone, FiDownload, FiDollarSign, FiGrid, FiHome } from "react-icons/fi";
import { BiHome } from "react-icons/bi";
import { IoMapOutline } from "react-icons/io5";
import { RiBuilding2Line } from "react-icons/ri";
import { Footprints, Menu, Sparkles, X } from "lucide-react";

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

function isQuickRouteActive(pathname: string, href?: string) {
  if (!href) {
    return false;
  }

  if (href === "/exterior-walkthrough") {
    return (
      pathname === "/exterior-walkthrough" ||
      pathname === "/exterior-tour" ||
      pathname === "/exterios-walkthrough" ||
      pathname === "/walkthrough"
    );
  }

  return pathname === href;
}

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
      isHighlight: false,
      icon: (
        <FiPhone className="h-[0.82rem] w-[0.82rem] xl:h-[0.9rem] xl:w-[0.9rem] 2xl:h-[0.98rem] 2xl:w-[0.98rem]" />
      ),
    },
    {
      name: "Brochure",
      link: "/Veranza Floorplan_ E-Brochure_V3_02-03-26 (2).pdf",
      action: "link",
      isHighlight: false,
      icon: (
        <FiDownload className="h-[0.82rem] w-[0.82rem] xl:h-[0.9rem] xl:w-[0.9rem] 2xl:h-[0.98rem] 2xl:w-[0.98rem]" />
      ),
    },
    {
      name: "Get A Quote",
      action: "quote-modal",
      isHighlight: false,
      icon: (
        <FiDollarSign className="h-[0.82rem] w-[0.82rem] xl:h-[0.9rem] xl:w-[0.9rem] 2xl:h-[0.98rem] 2xl:w-[0.98rem]" />
      ),
    },
  ];

  if (isMasterPlanRoute) {
    primaryButtons.push({
      name: "Home",
      link: "/",
      action: "link",
      isHighlight: isQuickRouteActive(pathname ?? "", "/"),
      icon: (
        <FiHome className="h-[0.82rem] w-[0.82rem] xl:h-[0.9rem] xl:w-[0.9rem] 2xl:h-[0.98rem] 2xl:w-[0.98rem]" />
      ),
    });
  }

  const routeButtons = useMemo(() => {
    if (!mergeRouteLinks) {
      return [];
    }

    return [
      {
        name: "Home",
        link: "/",
        action: "link",
        isHighlight: isQuickRouteActive(pathname ?? "", "/"),
        icon: (
          <BiHome className="h-[0.82rem] w-[0.82rem] xl:h-[0.9rem] xl:w-[0.9rem] 2xl:h-[0.98rem] 2xl:w-[0.98rem]" />
        ),
      },
      {
        name: "Project Overview",
        link: "/project-overview",
        action: "link",
        isHighlight: isQuickRouteActive(pathname ?? "", "/project-overview"),
        icon: (
          <FiGrid className="h-[0.82rem] w-[0.82rem] xl:h-[0.9rem] xl:w-[0.9rem] 2xl:h-[0.98rem] 2xl:w-[0.98rem]" />
        ),
      },
      {
        name: "Master Plan",
        link: "/master-plan",
        action: "link",
        isHighlight: isQuickRouteActive(pathname ?? "", "/master-plan"),
        icon: (
          <RiBuilding2Line className="h-[0.82rem] w-[0.82rem] xl:h-[0.9rem] xl:w-[0.9rem] 2xl:h-[0.98rem] 2xl:w-[0.98rem]" />
        ),
      },
      {
        name: "Amenities",
        link: "/amenities",
        action: "link",
        isHighlight: isQuickRouteActive(pathname ?? "", "/amenities"),
        icon: (
          <Sparkles className="h-[0.82rem] w-[0.82rem] xl:h-[0.9rem] xl:w-[0.9rem] 2xl:h-[0.98rem] 2xl:w-[0.98rem]" />
        ),
      },
      {
        name: "Map",
        link: "/area-map",
        action: "link",
        isHighlight: isQuickRouteActive(pathname ?? "", "/area-map"),
        icon: (
          <IoMapOutline className="h-[0.82rem] w-[0.82rem] xl:h-[0.9rem] xl:w-[0.9rem] 2xl:h-[0.98rem] 2xl:w-[0.98rem]" />
        ),
      },
      {
        name: "Walkthrough",
        link: "/exterior-walkthrough",
        action: "link",
        isHighlight: isQuickRouteActive(pathname ?? "", "/exterior-walkthrough"),
        icon: (
          <Footprints className="h-[0.82rem] w-[0.82rem] xl:h-[0.9rem] xl:w-[0.9rem] 2xl:h-[0.98rem] 2xl:w-[0.98rem]" />
        ),
      },
    ].filter((button) => !(isMasterPlanRoute && button.name === "Home"));
  }, [isMasterPlanRoute, mergeRouteLinks, pathname]);

  const buttons = [...primaryButtons, ...routeButtons];
  const shouldShowLabels = !mergeRouteLinks && !shouldDockAtBottom;
  const shouldEnableRailDrag = shouldDockAtBottom;
  const isDesktopTopRail = !shouldDockAtBottom;

  if (shouldHideCompactDesktopRail) {
    return null;
  }

  if (shouldDockAtBottom) {
    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-[max(env(safe-area-inset-bottom),1.25rem)] z-50 px-2 pb-0 sm:bottom-[max(env(safe-area-inset-bottom),1.5rem)]">
        <div className="flex items-end justify-start">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((value) => !value)}
            className="pointer-events-auto inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/18 bg-black/92 text-white shadow-[0_18px_48px_rgba(0,0,0,0.58)] backdrop-blur-xl transition active:scale-[0.98] sm:h-12 sm:w-12"
            aria-label={isMobileMenuOpen ? "Close quick actions" : "Open quick actions"}
          >
            {isMobileMenuOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Menu className="h-4 w-4 sm:h-5 sm:w-5" />}
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
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-medium sm:gap-2 sm:px-3.5 sm:py-2 sm:text-[11px] ${
                        button.isHighlight
                          ? "border-white/60 bg-white text-zinc-900"
                          : "border-white/10 bg-white/10 text-white"
                      }`}
                    >
                      <span className="flex h-3.5 w-3.5 items-center justify-center sm:h-4 sm:w-4">
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
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-medium sm:gap-2 sm:px-3.5 sm:py-2 sm:text-[11px] ${
                        button.isHighlight
                          ? "border-white/60 bg-white text-zinc-900"
                          : "border-white/10 bg-white/10 text-white"
                      }`}
                    >
                      <span className="flex h-3.5 w-3.5 items-center justify-center sm:h-4 sm:w-4">
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
            : "top-3 md:top-4"
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
          className={`relative max-w-full overflow-hidden rounded-full border shadow-[0_14px_42px_rgba(0,0,0,0.34)] backdrop-blur-2xl ${
            isDesktopTopRail
              ? "border-white/12 bg-black/72 px-1.5 py-1.5 shadow-[0_18px_40px_rgba(0,0,0,0.28)]"
              : "border-white/18 bg-black/42 px-2 py-2 shadow-[0_14px_42px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.16)] sm:px-2.5 sm:py-2.5"
          } ${
            shouldDockAtBottom
              ? "md:px-5 md:py-3"
              : isDesktopTopRail
                ? ""
                : "sm:px-3 sm:py-2.5 xl:px-3.5 xl:py-2.5 2xl:px-4 2xl:py-3"
          }`}
        >
          <motion.div
            ref={scrollerRef}
            layout
            transition={spring}
            onPointerDown={handleScrollerPointerDown}
            onPointerMove={handleScrollerPointerMove}
            onPointerUp={handleScrollerPointerUp}
            onPointerCancel={handleScrollerPointerUp}
            className={`flex max-w-[calc(100vw-2rem)] items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
              isDesktopTopRail ? "gap-1 sm:gap-1.5" : "gap-1 sm:gap-1.5 2xl:gap-2"
            } ${
              shouldEnableRailDrag
                ? "cursor-grab touch-pan-x active:cursor-grabbing"
                : ""
            } ${shouldDockAtBottom ? "md:max-w-[calc(100vw-2rem)]" : "md:max-w-none"} ${
              isDesktopTopRail ? "md:gap-1.5" : "md:gap-2"
            }`}
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
                        className={`inline-flex shrink-0 items-center justify-center overflow-hidden border font-medium transition ${
                          isDesktopTopRail
                            ? `h-8 w-8 min-w-8 rounded-[0.9rem] ${
                                button.isHighlight
                                  ? "border-white bg-white text-black shadow-[0_8px_18px_rgba(255,255,255,0.12)]"
                                  : "border-white/14 bg-white/[0.04] hover:border-white/28 hover:bg-white/[0.08]"
                              }`
                            : `rounded-[1rem] text-[9px] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] xl:text-[10px] 2xl:rounded-[1.05rem] 2xl:text-xs ${
                                button.isHighlight
                                  ? "border-white/50 bg-white/90 text-zinc-900 shadow-[0_10px_24px_rgba(0,0,0,0.16)]"
                                  : "border-white/12 bg-white/[0.08] text-white/92 hover:border-white/24 hover:bg-white/[0.14]"
                              }`
                        }`}
                        animate={{
                          paddingLeft: isDesktopTopRail
                            ? 0
                            : isHovered
                              ? 14
                              : mergeRouteLinks
                                ? 8
                                : 9,
                          paddingRight: isDesktopTopRail
                            ? 0
                            : isHovered
                              ? 14
                              : mergeRouteLinks
                                ? 8
                                : 9,
                        }}
                      >
                        <motion.span
                          className={`flex items-center justify-center ${
                            isDesktopTopRail
                              ? `${button.isHighlight ? "text-black" : "text-white"} h-3.5 w-3.5`
                              : "h-6 w-4 sm:h-7 sm:w-[1.05rem] xl:h-8 xl:w-5 2xl:h-10 2xl:w-6"
                          }`}
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
                      className={`inline-flex shrink-0 items-center justify-center overflow-hidden border font-medium transition ${
                        isDesktopTopRail
                          ? `h-8 w-8 min-w-8 rounded-[0.9rem] ${
                              button.isHighlight
                                ? "border-white bg-white text-black shadow-[0_8px_18px_rgba(255,255,255,0.12)]"
                                : "border-white/14 bg-white/[0.04] hover:border-white/28 hover:bg-white/[0.08]"
                            }`
                          : `rounded-[1rem] text-[9px] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] xl:text-[10px] 2xl:rounded-[1.05rem] 2xl:text-xs ${
                              button.isHighlight
                                ? "border-white/50 bg-white/90 text-zinc-900 shadow-[0_10px_24px_rgba(0,0,0,0.16)]"
                                : "border-white/12 bg-white/[0.08] text-white/92 hover:border-white/24 hover:bg-white/[0.14]"
                            }`
                      }`}
                      animate={{
                        paddingLeft: isDesktopTopRail
                          ? 0
                          : isHovered
                            ? 14
                            : mergeRouteLinks
                              ? 8
                              : 9,
                        paddingRight: isDesktopTopRail
                          ? 0
                          : isHovered
                            ? 14
                            : mergeRouteLinks
                              ? 8
                              : 9,
                      }}
                    >
                      <motion.span
                        className={`flex items-center justify-center ${
                          isDesktopTopRail
                            ? `${button.isHighlight ? "text-black" : "text-white"} h-3.5 w-3.5`
                            : "h-6 w-4 sm:h-7 sm:w-[1.05rem] xl:h-8 xl:w-5 2xl:h-10 2xl:w-6"
                        }`}
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
