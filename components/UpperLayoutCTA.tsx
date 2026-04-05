"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, type Transition } from "framer-motion";
import { FiPhone, FiDownload, FiDollarSign, FiGrid, FiHome } from "react-icons/fi";
import { BiHome } from "react-icons/bi";
import { IoMapOutline } from "react-icons/io5";
import { PiMapPinAreaFill } from "react-icons/pi";
import { User } from "lucide-react";

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
  const isMasterPlanRoute = pathname === "/master-plan";
  const isExteriorWalkthroughRoute =
    pathname === "/exterios-walkthrough" || pathname === "/exterior-tour";

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
    ].filter((button) => !(isMasterPlanRoute && button.name === "Home"));
  }, [isMasterPlanRoute, mergeRouteLinks]);

  const buttons = [...primaryButtons, ...routeButtons];
  const shouldShowLabels = !mergeRouteLinks;

  return (
    <>
      {isExteriorWalkthroughRoute ? (
        <div className="pointer-events-none absolute right-3 top-3 z-50 md:hidden">
          <Link
            href="/"
            className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-[1.2rem] border border-white/10 bg-black/72 text-white shadow-[0_18px_42px_rgba(0,0,0,0.34)] backdrop-blur-2xl transition hover:border-white/20 hover:bg-black/82"
            aria-label="Go home"
          >
            <FiHome className="h-5 w-5" />
          </Link>
        </div>
      ) : null}

      <div
        className={`pointer-events-none absolute left-1/2 top-3 z-50 w-full max-w-[calc(100vw-1rem)] -translate-x-1/2 px-2 md:top-0 md:max-w-none md:px-0 ${
          isExteriorWalkthroughRoute ? "hidden md:block" : ""
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
          className="relative max-w-full overflow-visible rounded-full border border-white/20 bg-black px-3 py-3 shadow-[0_20px_90px_rgba(0,0,0,0.8)] backdrop-blur-xl md:rounded-t-[75px] md:px-16 md:py-4"
        >
          {/* Right Wave */}
          <svg
            width="130"
            height="58"
            viewBox="0 0 130 58"
            className="absolute -right-[113px] -top-1 hidden md:block"
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
            className="absolute -left-[113px]  -top-1 hidden md:block"
          >
            <path
              d="M130,58 L130,0 L0,0 A130,58 0 0,1 130,58 Z"
              className="fill-black shadow-[0_20px_50px_rgba(0,0,0,0.7)]"
            />
          </svg>

          <motion.div
            layout
            transition={spring}
            className="flex max-w-[calc(100vw-2rem)] items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:max-w-none md:gap-2"
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
