"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Menu,
  Sparkles,
  X,
} from "lucide-react";

export type AmenityPageItem = {
  id: string;
  title: string;
  category: string;
  shortDescription: string;
  details: string;
  videoSrc?: string;
  thumbnailSrc?: string;
  tags?: string[];
  statLabel?: string;
  statValue?: string;
};

export type AmenitiesPageData = {
  eyebrow: string;
  title: string;
  description: string;
  summary?: string;
  items: AmenityPageItem[];
};

type AmenitiesPageClientProps = {
  data: AmenitiesPageData;
};

function hasMediaSource(value?: string) {
  return Boolean(value && value.trim().length > 0);
}

function AmenityPlaceholder({ title }: { title: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-white text-zinc-950">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(24,24,27,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(24,24,27,0.055)_1px,transparent_1px)] bg-[size:42px_42px]" />
      <div className="absolute left-[16%] top-[18%] h-32 w-32 rounded-full bg-emerald-100/70 blur-3xl" />
      <div className="absolute bottom-[18%] right-[20%] h-36 w-36 rounded-full bg-amber-100/80 blur-3xl" />
      <div className="relative px-6 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.10)]">
          <Sparkles className="h-7 w-7 text-emerald-700" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.34em] text-zinc-500">
          Media placeholder
        </p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight sm:text-6xl">
          {title}
        </h1>
      </div>
    </div>
  );
}

function AmenityCard({
  amenity,
  active,
}: {
  amenity: AmenityPageItem;
  active: boolean;
}) {
  return (
    <div
      className={`relative aspect-[16/10] overflow-hidden rounded-[0.95rem] border ${
        active ? "border-white/55" : "border-white/10"
      } bg-white/8`}
    >
      {hasMediaSource(amenity.thumbnailSrc) ? (
        <Image
          src={amenity.thumbnailSrc as string}
          alt={amenity.title}
          fill
          sizes="(max-width: 1024px) 78vw, 280px"
          className="object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-white/92">
          <ImageIcon className="h-7 w-7 text-zinc-300" />
        </div>
      )}
      <div className="absolute inset-0 bg-linear-to-t from-black/68 via-black/12 to-transparent" />
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-semibold text-white">
          {amenity.title}
        </span>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
            active
              ? "bg-white text-zinc-950"
              : "bg-white/14 text-white backdrop-blur-md"
          }`}
        >
          {active ? "Active" : "View"}
        </span>
      </div>
    </div>
  );
}

export default function AmenitiesPageClient({ data }: AmenitiesPageClientProps) {
  const [activeId, setActiveId] = useState(data.items[0]?.id ?? "");
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  const activeIndex = useMemo(
    () => Math.max(0, data.items.findIndex((item) => item.id === activeId)),
    [activeId, data.items],
  );
  const activeAmenity = data.items[activeIndex] ?? data.items[0];

  const selectAmenity = (id: string) => {
    setActiveId(id);
    setIsPanelOpen(false);
  };

  const goToRelativeAmenity = (offset: number) => {
    if (!data.items.length) {
      return;
    }

    const nextIndex =
      (activeIndex + offset + data.items.length) % data.items.length;
    setActiveId(data.items[nextIndex].id);
  };

  if (!activeAmenity) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white text-zinc-950">
        No amenities found.
      </main>
    );
  }

  return (
    <main className="relative h-screen min-h-screen overflow-hidden bg-white text-white">
      {hasMediaSource(activeAmenity.videoSrc) ? (
        <video
          key={activeAmenity.videoSrc}
          className="absolute inset-0 h-full w-full object-cover"
          src={activeAmenity.videoSrc}
          poster={
            hasMediaSource(activeAmenity.thumbnailSrc)
              ? activeAmenity.thumbnailSrc
              : undefined
          }
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : hasMediaSource(activeAmenity.thumbnailSrc) ? (
        <Image
          src={activeAmenity.thumbnailSrc as string}
          alt={activeAmenity.title}
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
      ) : (
        <AmenityPlaceholder title={activeAmenity.title} />
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/76 via-black/24 to-transparent" />

      <section className="pointer-events-none absolute bottom-8 left-5 right-5 z-10 pr-0 sm:bottom-10 sm:left-8 sm:right-8 lg:right-[24rem]">
        <div className="max-w-4xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/18 bg-black/18 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-white backdrop-blur-xl">
            <Sparkles className="h-3.5 w-3.5 text-amber-200" />
            {activeAmenity.category}
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white drop-shadow-[0_12px_40px_rgba(0,0,0,0.45)] sm:text-6xl lg:text-7xl">
            {activeAmenity.title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/82 sm:text-base">
            {activeAmenity.shortDescription}
          </p>
        </div>
      </section>

      <div className="absolute bottom-8 left-5 z-20 flex items-center gap-2 sm:bottom-10 lg:left-auto lg:right-[25rem]">
        <button
          type="button"
          onClick={() => goToRelativeAmenity(-1)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/18 bg-black/24 text-white shadow-[0_14px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl transition hover:bg-white hover:text-zinc-950"
          aria-label="Previous amenity"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => goToRelativeAmenity(1)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/18 bg-black/24 text-white shadow-[0_14px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl transition hover:bg-white hover:text-zinc-950"
          aria-label="Next amenity"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => setIsPanelOpen(true)}
        className="absolute right-4 top-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-white/16 bg-black/58 text-white shadow-[0_18px_48px_rgba(0,0,0,0.28)] backdrop-blur-xl lg:hidden"
        aria-label="Open amenities"
      >
        <Menu className="h-5 w-5" />
      </button>

      <aside
        className={`fixed right-5 top-1/2 z-30 hidden h-[min(76vh,46rem)] -translate-y-1/2 transition-[width] duration-300 lg:block ${
          isPanelCollapsed ? "w-[5.25rem]" : "w-[21rem]"
        }`}
      >
        <div className="flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-white/14 bg-zinc-950/66 text-white shadow-[0_30px_90px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
          {isPanelCollapsed ? (
            <div className="flex justify-center px-3 pb-2 pt-4">
              <button
                type="button"
                onClick={() => setIsPanelCollapsed(false)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/8 text-white transition hover:bg-white hover:text-zinc-950"
                aria-label="Expand amenities sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/14 bg-white/10">
                  <Sparkles className="h-5 w-5 text-amber-200" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/50">
                    {data.eyebrow}
                  </p>
                  <h2 className="truncate text-xl font-semibold">
                    {data.title}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPanelCollapsed(true)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/8 text-white transition hover:bg-white hover:text-zinc-950"
                aria-label="Collapse amenities sidebar"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {isPanelCollapsed ? (
            <div className="custom-scrollbar flex flex-1 flex-col items-center gap-3 overflow-y-auto p-3">
              {data.items.map((amenity, index) => {
                const active = amenity.id === activeAmenity.id;

                return (
                  <button
                    key={amenity.id}
                    type="button"
                    onClick={() => selectAmenity(amenity.id)}
                    className={`flex h-11 w-11 items-center justify-center rounded-full border text-sm font-semibold transition ${
                      active
                        ? "border-white bg-white text-zinc-950"
                        : "border-white/12 bg-white/8 text-white hover:bg-white/16"
                    }`}
                    aria-label={amenity.title}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <div className="px-5 pb-3">
                <p className="line-clamp-2 text-sm leading-6 text-white/62">
                  {activeAmenity.details}
                </p>
                <p className="mt-3 text-xs text-white/42">
                  {activeIndex + 1} of {data.items.length}
                </p>
              </div>

              <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-4 pt-1">
                {data.items.map((amenity) => {
                  const active = amenity.id === activeAmenity.id;

                  return (
                    <button
                      key={amenity.id}
                      type="button"
                      onClick={() => selectAmenity(amenity.id)}
                      className={`w-full rounded-[1.15rem] border p-2.5 text-left transition ${
                        active
                          ? "border-white/38 bg-white/16 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                          : "border-white/8 bg-white/6 hover:border-white/22 hover:bg-white/10"
                      }`}
                    >
                      <AmenityCard amenity={amenity} active={active} />
                      <div className="px-1.5 pb-1 pt-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-200/75">
                          {amenity.category}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {amenity.title}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </aside>

      <div
        className={`fixed inset-0 z-40 bg-black/42 backdrop-blur-sm transition lg:hidden ${
          isPanelOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setIsPanelOpen(false)}
      />
      <aside
        className={`fixed bottom-3 right-3 top-3 z-50 w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.35rem] border border-white/14 bg-zinc-950/84 text-white shadow-[0_26px_90px_rgba(0,0,0,0.38)] backdrop-blur-2xl transition duration-300 lg:hidden ${
          isPanelOpen ? "translate-x-0 opacity-100" : "translate-x-[110%] opacity-0"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/14 bg-white/10">
                <Sparkles className="h-5 w-5 text-amber-200" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/48">
                  {data.eyebrow}
                </p>
                <p className="text-lg font-semibold">{data.title}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPanelOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/8"
              aria-label="Close amenities"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-4">
            {data.items.map((amenity) => {
              const active = amenity.id === activeAmenity.id;

              return (
                <button
                  key={amenity.id}
                  type="button"
                  onClick={() => selectAmenity(amenity.id)}
                  className={`w-full rounded-[1.15rem] border p-2.5 text-left transition ${
                    active
                      ? "border-white/45 bg-white/16"
                      : "border-white/8 bg-white/6"
                  }`}
                >
                  <AmenityCard amenity={amenity} active={active} />
                  <div className="px-1 pb-1 pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-200/75">
                      {amenity.category}
                    </p>
                    <p className="pt-1 text-sm font-semibold text-white">
                      {amenity.title}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </main>
  );
}
