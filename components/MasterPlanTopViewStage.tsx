"use client";

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bike,
  Bird,
  BriefcaseBusiness,
  Building2,
  Dumbbell,
  Flame,
  Flower2,
  Gem,
  Goal,
  Leaf,
  PartyPopper,
  PawPrint,
  Theater,
  ToyBrick,
  Trees,
  Waves,
} from "lucide-react";
import {
  masterPlanAmenities,
  type MasterPlanAmenity,
  type MasterPlanAmenityIconKey,
} from "@/data/masterPlanAmenities";

const TOP_VIEW_VIDEO_URL =
  "https://res.cloudinary.com/dlhfbu3kh/video/upload/v1774910334/Sequence_01.mp4";
const TOP_VIEW_PLACEHOLDER_IMAGE =
  "https://res.cloudinary.com/dlhfbu3kh/image/upload/v1774907276/buildings.png";

const AMENITY_ICON_COMPONENTS: Record<MasterPlanAmenityIconKey, LucideIcon> = {
  bird: Bird,
  business: BriefcaseBusiness,
  clubhouse: Building2,
  fire: Flame,
  fitness: Dumbbell,
  flower: Flower2,
  garden: Trees,
  nature: Leaf,
  party: PartyPopper,
  pet: PawPrint,
  play: ToyBrick,
  pool: Waves,
  rock: Gem,
  sport: Goal,
  theater: Theater,
  track: Bike,
};

const TOP_VIEW_BOUNDS = {
  bottom: 88,
  left: 10,
  right: 91,
  top: 10,
} as const;

const coordinateExtents = masterPlanAmenities.reduce(
  (accumulator, amenity) => ({
    maxX: Math.max(accumulator.maxX, amenity.coordinate.x),
    maxY: Math.max(accumulator.maxY, amenity.coordinate.y),
    minX: Math.min(accumulator.minX, amenity.coordinate.x),
    minY: Math.min(accumulator.minY, amenity.coordinate.y),
  }),
  {
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
  },
);

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toPercent(value: number, min: number, max: number) {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) {
    return 0;
  }

  if (Math.abs(max - min) <= Number.EPSILON) {
    return 0.5;
  }

  return clampNumber((value - min) / (max - min), 0, 1);
}

function mapAmenityToTopViewPosition(amenity: MasterPlanAmenity) {
  const normalizedX = toPercent(
    amenity.coordinate.x,
    coordinateExtents.minX,
    coordinateExtents.maxX,
  );
  const normalizedY = toPercent(
    amenity.coordinate.y,
    coordinateExtents.minY,
    coordinateExtents.maxY,
  );

  return {
    xPercent:
      TOP_VIEW_BOUNDS.left +
      normalizedX * (TOP_VIEW_BOUNDS.right - TOP_VIEW_BOUNDS.left),
    yPercent:
      TOP_VIEW_BOUNDS.top +
      normalizedY * (TOP_VIEW_BOUNDS.bottom - TOP_VIEW_BOUNDS.top),
  };
}

export default function MasterPlanTopViewStage() {
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [hasPlaybackCompleted, setHasPlaybackCompleted] = useState(false);
  const [hoveredAmenityId, setHoveredAmenityId] = useState<string | null>(null);
  const [pinnedAmenityId, setPinnedAmenityId] = useState<string | null>(null);

  const topViewAmenities = useMemo(
    () =>
      masterPlanAmenities.map((amenity) => ({
        ...amenity,
        ...mapAmenityToTopViewPosition(amenity),
      })),
    [],
  );

  return (
    <section className="absolute inset-0 overflow-hidden bg-black">
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-300 ${
          isVideoReady ? "opacity-0" : "opacity-100"
        }`}
        style={{ backgroundImage: `url('${TOP_VIEW_PLACEHOLDER_IMAGE}')` }}
      />

      <video
        autoPlay
        muted
        playsInline
        preload="auto"
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
          isVideoReady ? "opacity-100" : "opacity-0"
        }`}
        onEnded={() => setHasPlaybackCompleted(true)}
        onLoadedData={() => setIsVideoReady(true)}
        onPlay={() => setHasPlaybackCompleted(false)}
      >
        <source src={TOP_VIEW_VIDEO_URL} type="video/mp4" />
      </video>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_32%,rgba(0,0,0,0.12)_100%)]" />

      <div
        className="absolute inset-0"
        onPointerDown={(event) => {
          if (!hasPlaybackCompleted) {
            return;
          }

          if (event.target === event.currentTarget) {
            setPinnedAmenityId(null);
          }
        }}
      >
        {hasPlaybackCompleted
          ? topViewAmenities.map((amenity) => {
          const Icon = AMENITY_ICON_COMPONENTS[amenity.iconKey];
          const isActive =
            hoveredAmenityId === amenity.id || pinnedAmenityId === amenity.id;

          return (
            <div
              key={amenity.id}
              className="absolute"
              style={{
                left: `${amenity.xPercent}%`,
                top: `${amenity.yPercent}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              {isActive ? (
                <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[calc(100%+0.45rem)] whitespace-nowrap rounded-full border border-white/20 bg-black/82 px-2.5 py-1 text-[10px] font-medium tracking-[0.01em] text-white shadow-[0_10px_24px_rgba(0,0,0,0.32)] backdrop-blur-md">
                  {amenity.label}
                </div>
              ) : null}

              <button
                type="button"
                aria-label={amenity.label}
                className={`relative flex h-7 w-7 items-center justify-center rounded-full border transition duration-200 sm:h-8 sm:w-8 ${
                  isActive
                    ? "-translate-y-0.5 border-black bg-black text-white shadow-[0_14px_30px_rgba(0,0,0,0.34)]"
                    : "border-black/25 bg-white text-black shadow-[0_10px_22px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.92)] hover:-translate-y-0.5"
                }`}
                onBlur={() => {
                  setHoveredAmenityId((currentAmenityId) =>
                    currentAmenityId === amenity.id ? null : currentAmenityId,
                  );
                }}
                onFocus={() => {
                  setHoveredAmenityId(amenity.id);
                }}
                onMouseEnter={() => {
                  setHoveredAmenityId(amenity.id);
                }}
                onMouseLeave={() => {
                  setHoveredAmenityId((currentAmenityId) =>
                    currentAmenityId === amenity.id ? null : currentAmenityId,
                  );
                }}
                onPointerUp={(event) => {
                  if (event.pointerType !== "touch" && event.pointerType !== "pen") {
                    return;
                  }

                  event.preventDefault();
                  event.stopPropagation();
                  setHoveredAmenityId(amenity.id);
                  setPinnedAmenityId((currentAmenityId) =>
                    currentAmenityId === amenity.id ? null : amenity.id,
                  );
                }}
              >
                <Icon
                  aria-hidden="true"
                  className={`h-3.5 w-3.5 stroke-[2.2] transition duration-200 sm:h-4 sm:w-4 ${
                    isActive ? "scale-110" : ""
                  }`}
                />
              </button>
            </div>
          );
        })
          : null}
      </div>
    </section>
  );
}
