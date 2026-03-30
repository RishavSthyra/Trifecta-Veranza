"use client";

import NextImage from "next/image";
import { useRouter } from "next/navigation";
import { forwardRef, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BedDouble,
  Building2,
  Expand,
  MapPin,
  Play,
  Ruler,
  X,
} from "lucide-react";
import type { InventoryApartment } from "@/types/inventory";

type SelectedFlatDetailsPanelProps = {
  apartment: InventoryApartment;
  compact?: boolean;
  hideCloseButton?: boolean;
  showBackButton?: boolean;
  onClose: () => void;
};

const PANEL_PREVIEW_IMAGE = "/frames_webp_full_q35/frame_00121.webp";

function parseRoomDimensions(roomDimensions: string) {
  return roomDimensions
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part, index) => {
      const [label, ...valueParts] = part.split(":");
      const value = valueParts.join(":").trim();

      if (!value) {
        return {
          key: `${part}-${index}`,
          label: `Space ${index + 1}`,
          value: label.trim(),
        };
      }

      return {
        key: `${label}-${index}`,
        label: label.trim(),
        value,
      };
    });
}

function getStatusStyles(status: InventoryApartment["status"]) {
  if (status === "Available") {
    return {
      badgeClassName:
        "border-emerald-300/28 bg-emerald-300/12 text-emerald-100",
      dotClassName: "bg-emerald-300",
    };
  }

  if (status === "Reserved") {
    return {
      badgeClassName: "border-amber-300/28 bg-amber-300/12 text-amber-50",
      dotClassName: "bg-amber-300",
    };
  }

  return {
    badgeClassName: "border-rose-300/28 bg-rose-300/12 text-rose-100",
    dotClassName: "bg-rose-300",
  };
}

const metaCardClassName =
  "rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]";

const SelectedFlatDetailsPanel = forwardRef<
  HTMLDivElement,
  SelectedFlatDetailsPanelProps
>(function SelectedFlatDetailsPanel(
  {
    apartment,
    compact = false,
    hideCloseButton = false,
    showBackButton = false,
    onClose,
  },
  ref,
) {
  const router = useRouter();
  const dimensionItems = useMemo(
    () => parseRoomDimensions(apartment.roomDimensions),
    [apartment.roomDimensions],
  );
  const statusStyles = getStatusStyles(apartment.status);
  const handleOpenWalkthrough = useCallback(() => {
    router.push("/walkthrough");
  }, [router]);
  const compactFacts = [
    {
      key: "tower",
      label: "Tower",
      value: apartment.tower,
      icon: Building2,
    },
    {
      key: "config",
      label: "Configuration",
      value: `${apartment.bhk} BHK`,
      icon: BedDouble,
    },
    {
      key: "area",
      label: "Surface",
      value: `${apartment.areaSqft} sqft`,
      icon: Expand,
    },
    {
      key: "facing",
      label: "Orientation",
      value: apartment.facing,
      icon: MapPin,
    },
  ];

  if (compact) {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, x: 22, y: 10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={{ opacity: 0, x: 18, y: 8 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-auto h-full w-full max-w-[min(94vw,27rem)]"
        data-scroll-area="flat-details-panel"
        data-flat-details-panel
        onTouchMoveCapture={(event) => {
          event.stopPropagation();
        }}
        onWheelCapture={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="relative flex h-full min-h-0 max-h-[min(96dvh,64rem)] flex-col overflow-hidden rounded-[32px] border border-white/14 bg-[linear-gradient(180deg,rgba(16,19,25,0.96),rgba(22,26,34,0.94))] text-white shadow-[0_24px_70px_rgba(0,0,0,0.34)] backdrop-blur-[24px]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,228,196,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(171,135,86,0.10),transparent_28%)]" />

          <div className="relative flex min-h-0 flex-1 flex-col p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              {showBackButton ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/8 text-white/78 transition hover:bg-white/12 hover:text-white"
                  aria-label="Back to inventory filters"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              ) : (
                <div className="h-10 w-10 shrink-0" />
              )}

              <div className="min-w-0 flex-1 text-center">
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/38">
                  Selected Flat
                </p>
                <p className="mt-1 truncate text-[1.25rem] font-semibold leading-none tracking-[-0.04em] text-white sm:text-[1.45rem]">
                  {apartment.title}
                </p>
              </div>

              {!hideCloseButton ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/8 text-white/78 transition hover:bg-white/12 hover:text-white"
                  aria-label="Close flat details"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <span
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] ${statusStyles.badgeClassName}`}
                >
                  <span
                    className={`inline-flex h-2 w-2 rounded-full ${statusStyles.dotClassName}`}
                  />
                  {apartment.status}
                </span>
              )}
            </div>

            <div
              className="group relative mt-4 shrink-0 overflow-hidden rounded-[28px] border border-white/12 bg-black/20"
              onClick={handleOpenWalkthrough}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleOpenWalkthrough();
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="relative h-[40vh] min-h-[40vh] w-full">
                <NextImage
                  src="/preview_WALKTHOUGH.jpg"
                  alt={`${apartment.title} walkthrough preview`}
                  fill
                  sizes="(max-width: 768px) 100vw, 420px"
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                />

                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,10,14,0.04)_0%,rgba(8,10,14,0.10)_26%,rgba(8,10,14,0.26)_56%,rgba(8,10,14,0.62)_100%)]" />

                <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/62">
                      Walkthrough
                    </p>
                    <p className="mt-1 text-sm font-medium text-white/92">
                      Private preview
                    </p>
                  </div>

                  <span
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] ${statusStyles.badgeClassName}`}
                  >
                    <span
                      className={`inline-flex h-2 w-2 rounded-full ${statusStyles.dotClassName}`}
                    />
                    {apartment.status}
                  </span>
                </div>

                <div className="absolute inset-0 z-10 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleOpenWalkthrough();
                    }}
                    className="relative flex h-[3.9rem] w-[3.9rem] items-center justify-center rounded-full border border-white/55 bg-white/88 shadow-[0_18px_36px_rgba(15,23,42,0.22)] backdrop-blur-md transition duration-300 hover:scale-105 hover:bg-white sm:h-[4.4rem] sm:w-[4.4rem]"
                    aria-label="Play walkthrough preview"
                  >
                    <span className="absolute inset-[6px] rounded-full border border-zinc-900/10" />
                    <Play className="relative ml-0.5 h-5 w-5 fill-zinc-900 text-zinc-900 sm:h-6 sm:w-6" />
                  </button>
                </div>

                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className="flex items-end justify-between gap-3 rounded-[20px] border border-white/12 bg-[linear-gradient(180deg,rgba(10,12,17,0.72),rgba(10,12,17,0.54))] px-4 py-3 backdrop-blur-md">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.26em] text-white/42">
                        Selected Flat
                      </p>
                      <p className="mt-1 truncate text-[1.8rem] font-semibold leading-none tracking-[-0.06em] text-white">
                        {apartment.title}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] uppercase tracking-[0.26em] text-white/42">
                        Floor
                      </p>
                      <p className="mt-1 text-lg font-medium text-white/88">
                        {apartment.floorLabel || apartment.floor}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-b border-white/10 pb-4">
              {compactFacts.map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.key} className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5">
                      <Icon className="h-4 w-4 text-[#d9c29c]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-white/38">
                        {item.label}
                      </p>
                      <p className="mt-1 truncate text-sm font-medium text-white/92">
                        {item.value}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.26em] text-white/38">
                    Dimensions
                  </p>
                  <p className="mt-1 text-base font-semibold tracking-[-0.03em] text-white">
                    Room dimensions
                  </p>
                </div>

                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/54">
                  {dimensionItems.length} rooms
                </div>
              </div>

              <div className="custom-scrollbar mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch] touch-pan-y">
                <div className="space-y-3 pb-1">
                  {dimensionItems.length > 0 ? (
                    dimensionItems.map((item, index) => (
                      <div
                        key={item.key}
                        className="flex items-start justify-between gap-3 border-b border-white/8 pb-3 last:border-b-0 last:pb-0"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5">
                            <Ruler className="h-4 w-4 text-[#d6c29d]" />
                          </div>

                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-[0.24em] text-white/32">
                              {String(index + 1).padStart(2, "0")}
                            </p>
                            <p className="mt-1 truncate text-sm font-medium text-white/88">
                              {item.label}
                            </p>
                          </div>
                        </div>

                        <p className="shrink-0 text-right text-sm font-semibold tracking-[0.01em] text-[#f2e6cc]">
                          {item.value}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-sm text-white/52">
                      Room dimensions are not available for this apartment yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenWalkthrough}
              className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-[#dcc59b]/30 bg-[linear-gradient(135deg,#e4cfaa_0%,#c9a874_52%,#f1dfc1_100%)] px-4 py-3 text-sm font-semibold text-[#17120c] shadow-[0_18px_40px_rgba(0,0,0,0.22)] transition hover:brightness-105"
            >
              Open walkthrough
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 18, scale: 0.99 }}
      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-auto mx-auto w-full max-w-[min(97vw,1480px)]"
      data-scroll-area="flat-details-panel"
      data-flat-details-panel
      onTouchMoveCapture={(event) => {
        event.stopPropagation();
      }}
      onWheelCapture={(event) => {
        event.stopPropagation();
      }}
    >
      <div className="relative max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-[30px] border border-white/14 bg-[linear-gradient(180deg,rgba(21,24,31,0.95),rgba(27,31,39,0.92))] text-white shadow-[0_28px_90px_rgba(0,0,0,0.38)] backdrop-blur-[26px] custom-scrollbar sm:max-h-[calc(100dvh-2rem)] xl:max-h-[min(78dvh,860px)] xl:overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(246,226,181,0.07),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(168,135,86,0.06),transparent_26%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),transparent_16%,transparent_82%,rgba(0,0,0,0.10))]" />

        <div className="relative p-4 sm:p-5 xl:flex xl:h-full xl:flex-col xl:p-6">
          <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.32em] text-white/60">
                  Signature Residence
                </span>
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] ${statusStyles.badgeClassName}`}
                >
                  <span
                    className={`inline-flex h-2 w-2 rounded-full ${statusStyles.dotClassName}`}
                  />
                  {apartment.status}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-2">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-white/38">
                    Selected Flat
                  </p>
                  <h3 className="mt-1.5 text-[2rem] font-semibold leading-none tracking-[-0.08em] text-white sm:text-[2.45rem] xl:text-[2.8rem]">
                    {apartment.title}
                  </h3>
                </div>

                <div className="pb-1 text-sm text-white/54 sm:text-base">
                  Floor{" "}
                  <span className="font-medium text-white/86">
                    {apartment.floorLabel || apartment.floor}
                  </span>
                </div>
              </div>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/62 sm:text-[15px]">
                A quieter, more curated apartment brief with live inventory
                details, dimensional planning data, and a premium preview panel
                designed to feel spacious without overpowering the master plan.
              </p>
            </div>

            {!hideCloseButton ? (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/6 text-white/76 transition hover:bg-white/12 hover:text-white"
                aria-label="Close flat details"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="mt-4 grid items-start gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.8fr)]">
            <div className="flex min-w-0 flex-col">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <div className={metaCardClassName}>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/38">
                    Tower
                  </p>
                  <div className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-white/92">
                    <Building2 className="h-4 w-4 text-[#d4c09a]" />
                    {apartment.tower}
                  </div>
                </div>

                <div className={metaCardClassName}>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/38">
                    Configuration
                  </p>
                  <div className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-white/92">
                    <BedDouble className="h-4 w-4 text-[#d4c09a]" />
                    {apartment.bhk} BHK
                  </div>
                </div>

                <div className={metaCardClassName}>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/38">
                    Facing
                  </p>
                  <div className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-white/92">
                    <MapPin className="h-4 w-4 text-[#d4c09a]" />
                    {apartment.facing}
                  </div>
                </div>

                <div className={metaCardClassName}>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/38">
                    Area
                  </p>
                  <div className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-white/92">
                    <Expand className="h-4 w-4 text-[#d4c09a]" />
                    {apartment.areaSqft} sqft
                  </div>
                </div>

                <div className={metaCardClassName}>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/38">
                    Inventory
                  </p>
                  <div className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-white/92">
                    <span
                      className={`inline-flex h-2.5 w-2.5 rounded-full ${statusStyles.dotClassName}`}
                    />
                    {apartment.status}
                  </div>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.015))]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-5 py-3.5">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.26em] text-white/38">
                      Spatial Schedule
                    </p>
                    <h4 className="mt-1.5 text-[1.05rem] font-semibold tracking-[-0.04em] text-white">
                      Room dimensions
                    </h4>
                  </div>

                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/58">
                    Detailed layout
                  </div>
                </div>

                {dimensionItems.length > 0 ? (
                  <div className="px-5 py-3 sm:py-4">
                    <div className="grid gap-x-6 divide-y divide-white/8 sm:grid-cols-2 sm:divide-y-0">
                      {dimensionItems.map((item, index) => (
                        <div
                          key={item.key}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3 sm:border-b sm:border-white/8"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5">
                              <Ruler className="h-4 w-4 text-[#d6c29d]" />
                            </div>

                            <div className="min-w-0">
                              <p className="text-[10px] uppercase tracking-[0.24em] text-white/32">
                                {String(index + 1).padStart(2, "0")}
                              </p>
                              <p className="truncate text-sm font-medium text-white/88">
                                {item.label}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-sm font-semibold tracking-[0.01em] text-[#f2e6cc]">
                              {item.value}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="px-5 py-6 text-sm text-white/52">
                    Room dimensions are not available for this apartment yet.
                  </div>
                )}
              </div>
            </div>

            <div className="min-w-0 xl:border-l xl:border-white/10 xl:pl-5">
              <div className="overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.018))] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="border-b border-white/8 px-5 py-4">
                  <p className="text-[10px] uppercase tracking-[0.26em] text-white/38">
                    Private Preview
                  </p>
                  <h4 className="mt-1.5 text-lg font-semibold tracking-[-0.04em] text-white">
                    Curated walkthrough teaser
                  </h4>
                </div>

                <div className="p-4">
                  <div
                    className="group relative overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.03] cursor-pointer"
                    onClick={handleOpenWalkthrough}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleOpenWalkthrough();
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="relative aspect-[16/10] w-full">
                      <NextImage
                        src={PANEL_PREVIEW_IMAGE}
                        alt={`${apartment.title} preview`}
                        fill
                        sizes="(max-width: 1280px) 100vw, 480px"
                        className="object-cover transition duration-700 group-hover:scale-[1.025]"
                      />

                      <div className="absolute inset-0 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenWalkthrough();
                          }}
                          className="flex h-[4.75rem] w-[4.75rem] items-center justify-center rounded-full border border-white/65 bg-white/82 shadow-[0_18px_34px_rgba(15,23,42,0.14)] backdrop-blur-md transition duration-300 hover:scale-105 hover:bg-white sm:h-[5.25rem] sm:w-[5.25rem]"
                          aria-label="Play preview"
                        >
                          <Play className="ml-1 h-7 w-7 fill-zinc-900 text-zinc-900 sm:h-8 sm:w-8" />
                        </button>
                      </div>

                      <div className="absolute inset-x-0 bottom-0 p-4">
                        <div className="flex items-end justify-between gap-3 rounded-[18px] border border-white/55 bg-white/70 p-3 backdrop-blur-md">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                              Private View
                            </p>
                            <p className="mt-1 text-sm font-medium text-zinc-900">
                              Interior walkthrough preview
                            </p>
                          </div>

                          <div className="rounded-full border border-white/60 bg-white/85 px-3 py-1.5 text-[11px] font-medium text-zinc-700">
                            Video preview
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-[22px] border border-white/10 bg-white/[0.04] px-5 py-3.5">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/38">
                    Residence Note
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/68">
                    Live stock-linked apartment information is presented in a
                    calmer premium layout so the details feel clear, polished,
                    and easier to absorb at a glance.
                  </p>
                </div>

                
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

export default SelectedFlatDetailsPanel;
