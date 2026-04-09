"use client";

import { Cache, Viewer } from "@photo-sphere-viewer/core";
import { EquirectangularTilesAdapter } from "@photo-sphere-viewer/equirectangular-tiles-adapter";
import "@photo-sphere-viewer/core/index.css";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bike,
  Building2,
  CirclePlay,
  Dumbbell,
  FerrisWheel,
  Flame,
  Flower2,
  Goal,
  LandPlot,
  Leaf,
  Menu,
  PartyPopper,
  TentTree,
  Theater,
  TreeDeciduous,
  Trees,
  Trophy,
  Volleyball,
  Waves,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import {
  EXTERIOR_MINIMAP_IMAGE_URL,
  EXTERIOR_MINIMAP_BOUNDS,
  EXTERIOR_MINIMAP_IMAGE_LAYOUT,
  exteriorAmenities,
  type ExteriorAmenity,
} from "@/data/exteriorAmenities";
import { clamp } from "@/lib/exterior-tour/math";
import { LocateFixed } from 'lucide-react';
import {
  buildExteriorTourGraph,
  getDirectionalCandidates,
  getSequentialNodeIds,
  preserveViewYawBetweenNodes,
} from "@/lib/exterior-tour/nodes";
import {
  buildTileDescriptors,
  buildPhotoSpherePanorama,
  canUseTiledPanorama,
  PanoAssetStore,
  getResolvedPreviewUrl,
  selectPriorityTiles,
  type ExteriorPanoramaSource,
} from "@/lib/exterior-tour/pano";
import type {
  DirectionalNavMap,
  ExteriorPanoNodeSource,
  NavigationDirection,
  PanoLoadState,
  PanoMeta,
  PanoTileDescriptor,
} from "@/lib/exterior-tour/types";

const editorialFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const uiFont = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const DEFAULT_ZOOM = 44;
const MIN_PITCH = -Math.PI / 2 + 0.08;
const MAX_PITCH = Math.PI / 2 - 0.08;
const EXTERIOR_SPHERE_RESOLUTION = 128;
const EXTERIOR_COARSE_SPHERE_RESOLUTION = 96;
const EXTERIOR_MIN_FOV = 36;
const EXTERIOR_MAX_FOV = 74;
const RESOLVED_PANO_CACHE_LIMIT = 10;
const ACTIVE_HQ_TILE_LIMIT = 220;
const ACTIVE_HQ_TILE_CONCURRENCY = 24;
const ACTIVE_SWEEP_TILE_LIMIT = 720;
const ACTIVE_SWEEP_TILE_CONCURRENCY = 16;
const TILE_WARM_LIMIT = 96;
const TILE_WARM_CONCURRENCY = 18;
const CACHE_MAX_ITEMS = 320;
const CACHE_TTL_MS = 1000 * 60 * 10;
const DIRECTIONS: NavigationDirection[] = ["forward", "left", "right", "backward"];

type ExteriorPanoWalkthroughProps = {
  nodes: ExteriorPanoNodeSource[];
  cdnBaseUrl: string;
  initialNodeId?: string;
  className?: string;
  title?: string;
  subtitle?: string;
};

type ResolvedPano = {
  nodeId: string;
  panoId: string;
  meta: PanoMeta | null;
  panorama: ExteriorPanoramaSource;
  previewUrl: string;
  mode: "tiles" | "preview";
};

type ViewSnapshot = {
  yaw: number;
  pitch: number;
  zoom: number;
};

function createLoadState(
  phase: PanoLoadState["phase"],
  message: string,
  detailProgress = 0,
): PanoLoadState {
  return { phase, message, detailProgress };
}

function createEmptyDirectionalMap(): DirectionalNavMap {
  return {
    forward: { direction: "forward", node: null, score: -Infinity },
    left: { direction: "left", node: null, score: -Infinity },
    right: { direction: "right", node: null, score: -Infinity },
    backward: { direction: "backward", node: null, score: -Infinity },
  };
}

function scheduleIdle(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const hostWindow = window as Window &
    typeof globalThis & {
      requestIdleCallback?: (
        callback: IdleRequestCallback,
        options?: IdleRequestOptions,
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

  if (typeof hostWindow.requestIdleCallback === "function") {
    const id = hostWindow.requestIdleCallback(() => callback(), { timeout: 800 });
    return () => hostWindow.cancelIdleCallback?.(id);
  }

  const id = globalThis.setTimeout(callback, 160);
  return () => globalThis.clearTimeout(id);
}

async function preloadTileBatch(
  assetStore: PanoAssetStore,
  tiles: PanoTileDescriptor[],
  concurrency: number,
  fetchPriority: "high" | "low" | "auto" = "low",
) {
  let index = 0;
  const workerCount = Math.max(1, Math.min(concurrency, tiles.length));

  await Promise.allSettled(
    Array.from({ length: workerCount }, async () => {
      while (index < tiles.length) {
        const currentIndex = index;
        index += 1;
        const tile = tiles[currentIndex];
        if (!tile) {
          return;
        }

        await assetStore.preloadTile(tile, fetchPriority);
      }
    }),
  );
}

function buildSweepTiles(
  panoId: string,
  meta: PanoMeta,
  baseUrl: string,
  excludeKeys: Set<string>,
  limit: number,
) {
  const rows = meta.actualRows ?? meta.rows;
  const horizon = (rows - 1) / 2;

  return buildTileDescriptors(panoId, meta, baseUrl)
    .filter((tile) => !excludeKeys.has(tile.key))
    .sort((a, b) => {
      const aRowScore = Math.abs(a.row - horizon);
      const bRowScore = Math.abs(b.row - horizon);
      if (aRowScore !== bRowScore) {
        return aRowScore - bRowScore;
      }

      const aSpread = (a.col * 17 + a.row * 13) % 31;
      const bSpread = (b.col * 17 + b.row * 13) % 31;
      return aSpread - bSpread;
    })
    .slice(0, limit);
}

function ArrowButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof ArrowUp;
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="group flex h-12 w-12 touch-manipulation items-center justify-center rounded-[1.15rem] border border-white/12 bg-black/28 text-white shadow-[0_18px_38px_rgba(0,0,0,0.28)] backdrop-blur-2xl transition duration-200 active:scale-95 hover:border-white/24 hover:bg-white/[0.1] sm:h-14 sm:w-14 sm:rounded-[1.3rem] disabled:cursor-not-allowed disabled:opacity-30"
    >
      <Icon className="h-4.5 w-4.5 transition duration-200 group-hover:scale-110 sm:h-5 sm:w-5" />
    </button>
  );
}

function clampMinimapOffset(
  offset: { x: number; y: number },
  width: number,
  height: number,
  zoom: number,
) {
  if (zoom <= 1) {
    return { x: 0, y: 0 };
  }

  const maxX = ((zoom - 1) * width) / 2;
  const maxY = ((zoom - 1) * height) / 2;

  return {
    x: clamp(offset.x, -maxX, maxX),
    y: clamp(offset.y, -maxY, maxY),
  };
}

const amenityIcons: Record<string, LucideIcon> = {
  "zen-garden": Flower2,
  "basketball-volleyball-court": Volleyball,
  "futsal-tennis-court": Goal,
  "mini-cricket-stadium": Trophy,
  "hammock-garden": TentTree,
  "skating-ring": FerrisWheel,
  "outdoor-gym": Dumbbell,
  "rock-garden": LandPlot,
  "amphi-theatre": Theater,
  "calisthenics-sand-pit": CirclePlay,
  "wide-cycling-track": Bike,
  "outdoor-party-lawn": PartyPopper,
  "childrens-play-area": CirclePlay,
  "butterfly-garden": Flower2,
  "flower-garden": Flower2,
  "play-lawn": Leaf,
  "frisbee-lawn": CirclePlay,
  "camp-fire": Flame,
  clubhouse: Building2,
  "bird-path": Trees,
  "miyawaki-forest": TreeDeciduous,
  "tennikoit-court": CirclePlay,
  "picnic-lawn": TentTree,
  "pickleball-court": Goal,
  general: Waves,
};

function AmenityIconBadge({
  amenity,
  isActive,
}: {
  amenity: ExteriorAmenity;
  isActive: boolean;
}) {
  const Icon = amenityIcons[amenity.id] ?? LocateFixed;

  return (
    <div
      className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[1rem] border sm:h-[5rem] sm:w-[5rem] ${
        isActive
          ? "border-[#ffcf57]/55 bg-[linear-gradient(145deg,rgba(255,223,124,0.22),rgba(255,255,255,0.06))] text-[#ffe083]"
          : "border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] text-white/70"
      }`}
    >
      <Icon className="h-7 w-7 sm:h-8 sm:w-8" />
    </div>
  );
}

function AmenityCard({
  amenity,
  isActive,
  onClick,
  compact,
}: {
  amenity: ExteriorAmenity;
  isActive: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  const isCompact = compact ?? false;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full rounded-[1.45rem] border text-left transition duration-200 ${
        isActive
          ? "border-[#ffcf57]/70 bg-[linear-gradient(135deg,rgba(255,207,87,0.22),rgba(8,10,14,0.82))] shadow-[0_18px_38px_rgba(0,0,0,0.28)]"
          : "border-white/10 bg-black/28 hover:border-white/22 hover:bg-black/34"
      }`}
    >
      <div className="flex items-center gap-3 p-3">
        <AmenityIconBadge amenity={amenity} isActive={isActive} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="pr-2 text-[15px] font-semibold leading-[1.25] text-white sm:text-[17px]">
                {amenity.name}
              </div>
              {!isCompact ? (
                <div className="mt-1 text-[13px] leading-5 text-white/46">
                  {amenity.summary}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function ExteriorPanoWalkthrough({
  nodes,
  cdnBaseUrl,
  initialNodeId,
  className,
  title = "Exterior Walkthrough",
  subtitle = "Fast sphere-based exterior navigation",
}: ExteriorPanoWalkthroughProps) {
  const graph = useMemo(() => buildExteriorTourGraph(nodes), [nodes]);
  const initialRequestedNodeId =
    (initialNodeId && graph.byId[initialNodeId] ? initialNodeId : null) ??
    graph.nodes[0]?.id ??
    "";

  const [activeNodeId, setActiveNodeId] = useState(initialRequestedNodeId);
  const [, setLoadState] = useState<PanoLoadState>(
    createLoadState("idle", "Preparing panorama"),
  );
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMobileAmenitiesOpen, setIsMobileAmenitiesOpen] = useState(false);
  const [minimapZoom, setMinimapZoom] = useState(1);
  const [minimapOffset, setMinimapOffset] = useState({ x: 0, y: 0 });
  const [isMinimapDragging, setIsMinimapDragging] = useState(false);
  const [navigationTargets, setNavigationTargets] = useState<DirectionalNavMap>(
    createEmptyDirectionalMap(),
  );
  const minimapDragRef = useRef<{
    pointerId: number | null;
    lastX: number;
    lastY: number;
    dragging: boolean;
  }>({
    pointerId: null,
    lastX: 0,
    lastY: 0,
    dragging: false,
  });

  const assetStore = useMemo(() => new PanoAssetStore(cdnBaseUrl), [cdnBaseUrl]);
  const viewerHostRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const cacheRef = useRef(new Map<string, ResolvedPano>());
  const availabilityRef = useRef(new Map<string, "available" | "missing">());
  const availabilityPromiseRef = useRef(new Map<string, Promise<ResolvedPano>>());
  const viewRef = useRef<ViewSnapshot>({
    yaw: 0,
    pitch: 0,
    zoom: DEFAULT_ZOOM,
  });
  const activeNodeIdRef = useRef(activeNodeId);
  activeNodeIdRef.current = activeNodeId;
  const prefersCoarsePointerRef = useRef(false);

  const activeNode = graph.byId[activeNodeId];
  const sequential = useMemo(
    () => getSequentialNodeIds(graph, activeNodeId),
    [activeNodeId, graph],
  );
  const activeAmenityId = useMemo(
    () => exteriorAmenities.find((amenity) => amenity.nodeIds.includes(activeNodeId))?.id ?? null,
    [activeNodeId],
  );
  const minimapDots = useMemo(() => {
    const minX = EXTERIOR_MINIMAP_BOUNDS.bottomLeft.x;
    const maxX = EXTERIOR_MINIMAP_BOUNDS.topRight.x;
    const minY = EXTERIOR_MINIMAP_BOUNDS.topRight.y;
    const maxY = EXTERIOR_MINIMAP_BOUNDS.bottomLeft.y;
    const xRange = Math.max(maxX - minX, 1);
    const yRange = Math.max(maxY - minY, 1);

    return exteriorAmenities.map((amenity) => ({
      ...amenity,
      leftPercent: clamp((amenity.coordinate.x - minX) / xRange, 0, 1),
      topPercent: clamp((amenity.coordinate.y - minY) / yRange, 0, 1),
    }));
  }, []);

  const rememberResolvedPano = useCallback((resolved: ResolvedPano) => {
    const cache = cacheRef.current;

    if (cache.has(resolved.nodeId)) {
      cache.delete(resolved.nodeId);
    }

    cache.set(resolved.nodeId, resolved);

    while (cache.size > RESOLVED_PANO_CACHE_LIMIT) {
      const oldestKey = cache.keys().next().value as string | undefined;
      if (!oldestKey) {
        break;
      }
      cache.delete(oldestKey);
    }
  }, []);

  const resolvePano = useCallback(
    async (
      nodeId: string,
      options?: {
        previewPriority?: "high" | "low" | "auto";
      },
    ) => {
      const cached = cacheRef.current.get(nodeId);
      if (cached) {
        rememberResolvedPano(cached);
        return cached;
      }

      const pending = availabilityPromiseRef.current.get(nodeId);
      if (pending) {
        return pending;
      }

      const node = graph.byId[nodeId];
      if (!node) {
        throw new Error(`Unknown exterior node: ${nodeId}`);
      }

      const promise = (async () => {
        let meta: PanoMeta | null = null;

        try {
          meta = await assetStore.getMeta(node.panoId);
        } catch {
          meta = null;
        }

        if (meta) {
          const previewUrl = getResolvedPreviewUrl(
            node.panoId,
            cdnBaseUrl,
            meta.preview ?? "preview.jpg",
          );
          const supportsTiles = canUseTiledPanorama(meta);

          if (!supportsTiles) {
            availabilityRef.current.set(nodeId, "missing");
            throw new Error(`Incompatible tile grid for ${node.panoId}`);
          }

          try {
            await assetStore.preloadPreview(
              node.panoId,
              meta.preview ?? "preview.jpg",
              options?.previewPriority ?? "high",
            );
          } catch (error) {
            console.warn(`Exterior preview warmup failed for ${node.panoId}`, error);
          }

          const resolved = {
            nodeId,
            panoId: node.panoId,
            meta,
            panorama: buildPhotoSpherePanorama(
              node.panoId,
              meta,
              cdnBaseUrl,
              true,
              previewUrl,
            ),
            previewUrl,
            mode: "tiles",
          } satisfies ResolvedPano;

          availabilityRef.current.set(nodeId, "available");
          rememberResolvedPano(resolved);
          return resolved;
        }

        availabilityRef.current.set(nodeId, "missing");
        throw new Error(`Missing tiled panorama metadata for ${node.panoId}`);
      })()
        .catch((error) => {
          availabilityRef.current.set(nodeId, "missing");
          throw error;
        })
        .finally(() => {
          availabilityPromiseRef.current.delete(nodeId);
        });

      availabilityPromiseRef.current.set(nodeId, promise);
      return promise;
    },
    [assetStore, cdnBaseUrl, graph, rememberResolvedPano],
  );

  useEffect(() => {
    Cache.enabled = true;
    Cache.maxItems = Math.max(Cache.maxItems, CACHE_MAX_ITEMS);
    Cache.ttl = Math.max(Cache.ttl, CACHE_TTL_MS);
    Cache.init();
  }, []);

  useEffect(() => {
    const container = viewerHostRef.current;
    if (!container || !initialRequestedNodeId) {
      return;
    }

    let cancelled = false;
    let localViewer: Viewer | null = null;

    void (async () => {
      prefersCoarsePointerRef.current =
        window.matchMedia?.("(pointer: coarse)").matches ||
        navigator.maxTouchPoints > 0;
      viewerHostRef.current!.style.touchAction = "none";
      // viewerHostRef.current!.style.webkitTapHighlightColor = "transparent";

      setLoadState(createLoadState("preview", "Loading panorama"));

      let initialResolved: ResolvedPano | null = null;
      const startCandidates = [
        initialRequestedNodeId,
        ...graph.order.filter((nodeId) => nodeId !== initialRequestedNodeId),
      ];

      for (const candidateId of startCandidates) {
        try {
          initialResolved = await resolvePano(candidateId);
          break;
        } catch {
          // Try the next pano folder that actually exists.
        }
      }

      if (!initialResolved || cancelled || !viewerHostRef.current) {
        setLoadState(createLoadState("error", "No available panorama"));
        return;
      }

      if (initialResolved.nodeId !== activeNodeIdRef.current) {
        startTransition(() => {
          setActiveNodeId(initialResolved!.nodeId);
        });
      }

      localViewer = new Viewer({
        container: viewerHostRef.current,
        adapter: EquirectangularTilesAdapter.withConfig({
          resolution: prefersCoarsePointerRef.current
            ? EXTERIOR_COARSE_SPHERE_RESOLUTION
            : EXTERIOR_SPHERE_RESOLUTION,
          showErrorTile: false,
          baseBlur: true,
          antialias: true,
        }),
        panorama: initialResolved.panorama,
        navbar: false,
        touchmoveTwoFingers: false,
        mousewheelCtrlKey: false,
        defaultZoomLvl: prefersCoarsePointerRef.current ? DEFAULT_ZOOM - 3 : DEFAULT_ZOOM,
        minFov: EXTERIOR_MIN_FOV,
        maxFov: EXTERIOR_MAX_FOV,
        moveInertia: true,
        rendererParameters: {
          antialias: true,
          powerPreference: "high-performance",
        },
      });

      viewerRef.current = localViewer;

      localViewer.addEventListener("load-progress", ({ progress }) => {
        setLoadState(
          createLoadState("detail", "Streaming tiles", clamp(progress / 100, 0, 1)),
        );
      });

      localViewer.addEventListener("panorama-load", () => {
        setLoadState(createLoadState("preview", "Loading panorama"));
      });

      localViewer.addEventListener("panorama-loaded", () => {
        setLoadState(createLoadState("ready", "Ready", 1));
      });

      localViewer.addEventListener("panorama-error", ({ error }) => {
        console.error("Exterior panorama error:", error);
        localViewer?.hideError();
        setLoadState(createLoadState("error", "Panorama unavailable"));
      });

      localViewer.addEventListener("position-updated", ({ position }) => {
        viewRef.current = {
          ...viewRef.current,
          yaw: position.yaw,
          pitch: position.pitch,
        };
      });

      localViewer.addEventListener("zoom-updated", ({ zoomLevel }) => {
        viewRef.current = {
          ...viewRef.current,
          zoom: zoomLevel,
        };
      });

      localViewer.addEventListener("ready", () => {
        viewRef.current = {
          yaw: localViewer?.getPosition().yaw ?? 0,
          pitch: localViewer?.getPosition().pitch ?? 0,
          zoom: localViewer?.getZoomLevel() ?? DEFAULT_ZOOM,
        };
      });
    })();

    return () => {
      cancelled = true;
      localViewer?.destroy();
      if (viewerRef.current === localViewer) {
        viewerRef.current = null;
      }
    };
  }, [graph.order, initialRequestedNodeId, resolvePano]);

  useEffect(() => {
    if (!activeNode) {
      return;
    }

    let cancelled = false;
    setNavigationTargets(createEmptyDirectionalMap());

    for (const direction of DIRECTIONS) {
      void (async () => {
        const rankedCandidates = getDirectionalCandidates(graph, activeNode.id, direction);

        for (const candidate of rankedCandidates) {
          try {
            await resolvePano(candidate.node.id, { previewPriority: "low" });

            if (cancelled) {
              return;
            }

            setNavigationTargets((current) => ({
              ...current,
              [direction]: {
                direction,
                node: candidate.node,
                score: candidate.score,
              },
            }));
            return;
          } catch {
            continue;
          }
        }

        if (!cancelled) {
          setNavigationTargets((current) => ({
            ...current,
            [direction]: {
              direction,
              node: null,
              score: -Infinity,
            },
          }));
        }
      })();
    }

    return () => {
      cancelled = true;
    };
  }, [activeNode, graph, resolvePano]);

  useEffect(() => {
    if (!activeNode) {
      return;
    }

    let cancelled = false;
    const cancelIdle = scheduleIdle(() => {
      void (async () => {
        try {
          const resolved = await resolvePano(activeNode.id, { previewPriority: "high" });
          if (cancelled || !resolved.meta) {
            return;
          }

          const focusTiles = selectPriorityTiles(
            resolved.panoId,
            resolved.meta,
            cdnBaseUrl,
            {
              yaw: viewRef.current.yaw,
              pitch: viewRef.current.pitch,
              zoom: viewRef.current.zoom,
            },
            ACTIVE_HQ_TILE_LIMIT,
          );

          await preloadTileBatch(
            assetStore,
            focusTiles,
            ACTIVE_HQ_TILE_CONCURRENCY,
            "high",
          );

          if (cancelled) {
            return;
          }

          const sweepTiles = buildSweepTiles(
            resolved.panoId,
            resolved.meta,
            cdnBaseUrl,
            new Set(focusTiles.map((tile) => tile.key)),
            ACTIVE_SWEEP_TILE_LIMIT,
          );

          await preloadTileBatch(
            assetStore,
            sweepTiles,
            ACTIVE_SWEEP_TILE_CONCURRENCY,
            "auto",
          );
        } catch {
          // Ignore active pano warmup failures.
        }
      })();
    });

    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, [activeNode, assetStore, cdnBaseUrl, resolvePano]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !activeNode) {
      return;
    }

    const warmupIds = [
      ...new Set(
        DIRECTIONS.flatMap((direction) =>
          getDirectionalCandidates(graph, activeNode.id, direction)
            .slice(0, 3)
            .map((candidate) => candidate.node.id),
        ),
      ),
    ]
      .filter((nodeId): nodeId is string => Boolean(nodeId))
      .slice(0, 8);

    if (warmupIds.length === 0) {
      return;
    }

    let cancelled = false;
    const cancelIdle = scheduleIdle(() => {
      void Promise.allSettled(
        warmupIds.map(async (nodeId) => {
          if (cancelled) {
            return;
          }

          const resolved = await resolvePano(nodeId, { previewPriority: "low" });
          if (cancelled) {
            return;
          }

          try {
            await viewer.textureLoader.preloadPanorama(resolved.panorama);
          } catch {
            // Some tiled panos may not support PSV preload cleanly; keep manual warmup.
          }

          if (resolved.meta) {
            const warmTiles = selectPriorityTiles(
              resolved.panoId,
              resolved.meta,
              cdnBaseUrl,
              {
                yaw: viewRef.current.yaw,
                pitch: 0,
                zoom: viewRef.current.zoom,
              },
              TILE_WARM_LIMIT,
            );
            const sweepTiles = buildSweepTiles(
              resolved.panoId,
              resolved.meta,
              cdnBaseUrl,
              new Set(warmTiles.map((tile) => tile.key)),
              180,
            );

            await preloadTileBatch(assetStore, warmTiles, TILE_WARM_CONCURRENCY, "high");
            if (cancelled) {
              return;
            }
            await preloadTileBatch(assetStore, sweepTiles, 12, "auto");
          }
        }),
      );
    });

    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, [
    activeNode,
    assetStore,
    cdnBaseUrl,
    graph,
    navigationTargets,
    resolvePano,
  ]);

  const jumpToNode = useCallback(
    async (targetId: string) => {
      if (isTransitioning || targetId === activeNodeIdRef.current) {
        return;
      }

      const viewer = viewerRef.current;
      const fromNode = graph.byId[activeNodeIdRef.current];
      const targetNode = graph.byId[targetId];
      if (!viewer || !fromNode || !targetNode) {
        return;
      }

      setIsTransitioning(true);
      setLoadState(createLoadState("preview", "Switching panorama"));

      try {
        const target = await resolvePano(targetId, { previewPriority: "high" });
        const currentPosition = viewer.getPosition();
        const targetPitch = clamp(currentPosition.pitch, MIN_PITCH, MAX_PITCH);
        const targetZoom = viewer.getZoomLevel();
        const targetYaw = preserveViewYawBetweenNodes(
          fromNode,
          targetNode,
          currentPosition.yaw,
        );

        const completed = await viewer.setPanorama(target.panorama, {
          position: {
            yaw: targetYaw,
            pitch: targetPitch,
          },
          zoom: targetZoom,
          transition: {
            effect: "fade",
            rotation: false,
            speed: prefersCoarsePointerRef.current ? 560 : 700,
          },
          showLoader: false,
        });

        if (completed !== false) {
          viewRef.current = {
            yaw: targetYaw,
            pitch: targetPitch,
            zoom: targetZoom,
          };

          startTransition(() => {
            setActiveNodeId(targetId);
          });
        }
      } catch (error) {
        console.error("Exterior amenity jump failed:", error);
        viewer.hideError();
        setLoadState(createLoadState("error", "Panorama unavailable"));
      } finally {
        globalThis.setTimeout(() => setIsTransitioning(false), 120);
      }
    },
    [graph, isTransitioning, resolvePano],
  );

  const handleMinimapWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const bounds = event.currentTarget.getBoundingClientRect();

      setMinimapZoom((current) => {
        const nextZoom = clamp(current + (event.deltaY < 0 ? 0.18 : -0.18), 1, 3.2);

        setMinimapOffset((currentOffset) =>
          clampMinimapOffset(currentOffset, bounds.width, bounds.height, nextZoom),
        );

        return nextZoom;
      });
    },
    [],
  );

  const handleMinimapPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (minimapZoom <= 1) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      minimapDragRef.current = {
        pointerId: event.pointerId,
        lastX: event.clientX,
        lastY: event.clientY,
        dragging: true,
      };
      setIsMinimapDragging(true);

      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [minimapZoom],
  );

  const handleMinimapPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const dragState = minimapDragRef.current;
      if (!dragState.dragging || dragState.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const deltaX = event.clientX - dragState.lastX;
      const deltaY = event.clientY - dragState.lastY;
      const bounds = event.currentTarget.getBoundingClientRect();

      dragState.lastX = event.clientX;
      dragState.lastY = event.clientY;

      setMinimapOffset((current) =>
        clampMinimapOffset(
          {
            x: current.x + deltaX,
            y: current.y + deltaY,
          },
          bounds.width,
          bounds.height,
          minimapZoom,
        ),
      );
    },
    [minimapZoom],
  );

  const handleMinimapPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const dragState = minimapDragRef.current;
      if (dragState.pointerId !== event.pointerId) {
        return;
      }

      dragState.dragging = false;
      dragState.pointerId = null;
      setIsMinimapDragging(false);

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [],
  );

  const navigateTo = useCallback(
    async (direction: NavigationDirection) => {
      if (isTransitioning) {
        return;
      }

      const viewer = viewerRef.current;
      const fromNode = graph.byId[activeNodeIdRef.current];
      if (!viewer || !fromNode) {
        return;
      }

      setIsTransitioning(true);
      setLoadState(createLoadState("preview", "Switching panorama"));

      try {
        const rankedCandidates = getDirectionalCandidates(
          graph,
          activeNodeIdRef.current,
          direction,
        );
        const currentPosition = viewer.getPosition();
        const targetPitch = clamp(currentPosition.pitch, MIN_PITCH, MAX_PITCH);
        const targetZoom = viewer.getZoomLevel();
        let navigated = false;

        for (const candidate of rankedCandidates) {
          const targetId = candidate.node.id;
          if (targetId === activeNodeIdRef.current) {
            continue;
          }

          try {
            const target = await resolvePano(targetId, { previewPriority: "high" });
            const completed = await viewer.setPanorama(target.panorama, {
              position: {
                yaw: preserveViewYawBetweenNodes(
                  fromNode,
                  candidate.node,
                  currentPosition.yaw,
                ),
                pitch: targetPitch,
              },
              zoom: targetZoom,
              transition: {
                effect: "fade",
                rotation: false,
                speed: prefersCoarsePointerRef.current ? 560 : 700,
              },
              showLoader: false,
            });

            if (completed !== false) {
              viewRef.current = {
                yaw: preserveViewYawBetweenNodes(
                  fromNode,
                  candidate.node,
                  currentPosition.yaw,
                ),
                pitch: targetPitch,
                zoom: targetZoom,
              };

              startTransition(() => {
                setActiveNodeId(targetId);
              });
              navigated = true;
              break;
            }
          } catch {
            availabilityRef.current.set(targetId, "missing");
            continue;
          }
        }

        if (!navigated) {
          throw new Error(`No available pano found for direction ${direction}`);
        }
      } catch (error) {
        console.error("Exterior navigation failed:", error);
        viewer.hideError();
        setLoadState(createLoadState("error", "Panorama unavailable"));
      } finally {
        globalThis.setTimeout(() => setIsTransitioning(false), 120);
      }
    },
    [graph, isTransitioning, resolvePano],
  );

  if (!activeNode) {
    return (
      <div className="flex h-full items-center justify-center rounded-[2rem] border border-white/10 bg-black/30 text-white/70">
        No exterior panoramas found.
      </div>
    );
  }

  return (
    <section
      aria-label={title}
      className={`relative isolate h-full w-full overflow-hidden rounded-[2.25rem] border border-white/10 bg-[linear-gradient(180deg,#040608_0%,#05070a_50%,#040608_100%)] text-white shadow-[0_30px_80px_rgba(0,0,0,0.35)] ${className ?? ""}`}
    >
      <div className="sr-only">{subtitle}</div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(255,255,255,0.08),transparent_24%),radial-gradient(circle_at_80%_12%,rgba(207,193,167,0.08),transparent_20%)]" />

      <div className="absolute inset-0 overflow-hidden rounded-[2.25rem]">
        <div ref={viewerHostRef} className="h-full w-full" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(4,6,10,0.2)_0%,rgba(4,6,10,0.02)_26%,rgba(4,6,10,0.05)_70%,rgba(4,6,10,0.28)_100%)]" />
        <div
          className={`pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_10%,rgba(0,0,0,0.1)_72%,rgba(0,0,0,0.18)_100%)] transition-opacity duration-200 ${
            isTransitioning ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 p-3 sm:gap-4 sm:p-6">
        <div className="pointer-events-auto flex max-w-[78vw] items-start gap-3 sm:max-w-md">
          <button
            type="button"
            aria-label="Open amenities menu"
            onClick={() => setIsMobileAmenitiesOpen(true)}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.2rem] border border-white/10 bg-black/26 text-white shadow-[0_16px_34px_rgba(0,0,0,0.28)] backdrop-blur-2xl transition hover:border-white/20 hover:bg-black/36"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <div
          className={`${uiFont.className} hidden rounded-full border border-white/10 bg-black/18 px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-white/56 shadow-[0_14px_32px_rgba(0,0,0,0.24)] backdrop-blur-2xl sm:px-4 sm:text-xs sm:tracking-[0.24em]`}
        >
          {sequential.index + 1}/{graph.order.length}
        </div>
      </div>

      <div
        className={`absolute inset-0 z-40 flex ${
          isMobileAmenitiesOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <button
          type="button"
          aria-label="Close amenities menu"
          onClick={() => setIsMobileAmenitiesOpen(false)}
          className={`absolute inset-0 bg-black/46 transition duration-200 ${
            isMobileAmenitiesOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        <div
          className={`absolute left-2 top-2 bottom-2 flex w-[calc(100vw-1rem)] max-w-[22.5rem] flex-col rounded-[1.75rem] border border-white/14 bg-[linear-gradient(180deg,rgba(154,165,175,0.16)_0%,rgba(106,118,128,0.12)_100%)] p-4 text-white shadow-[0_24px_64px_rgba(0,0,0,0.22)] backdrop-blur-[24px] transition duration-300 sm:left-3 sm:top-3 sm:bottom-3 sm:w-[25rem] sm:max-w-none md:left-4 md:top-4 md:bottom-4 md:w-[26rem] xl:left-8 xl:top-28 xl:bottom-auto xl:h-[min(66dvh,42rem)] xl:w-[24rem] xl:rounded-[2rem] xl:border-white/18 xl:bg-[linear-gradient(180deg,rgba(170,180,188,0.18)_0%,rgba(122,136,146,0.12)_100%)] 2xl:left-10 2xl:top-32 2xl:w-[25rem] ${
            isMobileAmenitiesOpen
              ? "translate-x-0"
              : "-translate-x-[calc(100%+0.5rem)] sm:-translate-x-[calc(100%+0.75rem)] md:-translate-x-[calc(100%+1rem)] xl:-translate-x-[calc(100%+2rem)] 2xl:-translate-x-[calc(100%+2.5rem)]"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className={`${uiFont.className} text-[10px] uppercase tracking-[0.32em] text-white/42`}>
                Amenities
              </div>
              <div className={`${editorialFont.className} mt-2 text-[2rem] leading-none text-white`}>
                Walkthrough Stops
              </div>
            </div>

            <button
              type="button"
              aria-label="Close amenities menu"
              onClick={() => setIsMobileAmenitiesOpen(false)}
              className="flex h-11 w-11 items-center justify-center rounded-[1rem] border border-white/18 bg-white/10 text-white transition hover:border-white/28 hover:bg-white/14"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          <div className={`${uiFont.className} mt-3 text-sm leading-6 text-white/54`}>
            Tap any amenity to jump into its exterior panorama.
          </div>

          <div className="custom-scrollbar mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="space-y-3 pb-6">
              {exteriorAmenities.map((amenity) => (
                <AmenityCard
                  key={amenity.id}
                  amenity={amenity}
                  isActive={activeAmenityId === amenity.id}
                  compact
                  onClick={() => {
                    setIsMobileAmenitiesOpen(false);
                    void jumpToNode(amenity.primaryNodeId);
                  }}
                />
              ))}

              <div className="pt-4 lg:hidden">
              <div className={`${uiFont.className} text-[10px] uppercase tracking-[0.32em] text-white/42`}>
                Minimap
              </div>
              <div className={`${editorialFont.className} mt-2 text-[1.8rem] leading-none text-white`}>
                Amenity Finder
              </div>
              <div className={`${uiFont.className} mt-3 text-sm leading-6 text-white/54`}>
                Scroll inside the map to zoom and tap any yellow dot to jump.
              </div>

              <div
                className={`relative mt-4 h-[400px] w-full overflow-hidden rounded-2xl ${
                  minimapZoom > 1
                    ? isMinimapDragging
                      ? "cursor-grabbing"
                      : "cursor-grab"
                    : "cursor-default"
                }`}
                onWheelCapture={handleMinimapWheel}
                onPointerDown={handleMinimapPointerDown}
                onPointerMove={handleMinimapPointerMove}
                onPointerUp={handleMinimapPointerUp}
                onPointerCancel={handleMinimapPointerUp}
                style={{ touchAction: "none" }}
              >
                <div
                  className="absolute inset-0 transition-transform duration-150 ease-out"
                  style={{
                    transform: `translate(${minimapOffset.x}px, ${minimapOffset.y}px) scale(${minimapZoom})`,
                    transformOrigin: "center center",
                  }}
                >
                  <div
                    className="absolute left-1/2 top-1/2 w-full -translate-x-1/2 rounded-4xl -translate-y-1/2"
                    style={{
                      aspectRatio: `${EXTERIOR_MINIMAP_IMAGE_LAYOUT.width} / ${EXTERIOR_MINIMAP_IMAGE_LAYOUT.height}`,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={EXTERIOR_MINIMAP_IMAGE_URL}
                      alt="Trifecta amenity minimap"
                      className="h-full w-full opacity-92"
                      draggable={false}
                    />

                    {minimapDots.map((amenity) => (
                      <button
                        key={amenity.id}
                        type="button"
                        aria-label={`Go to ${amenity.name}`}
                        title={amenity.name}
                        onClick={() => {
                          setIsMobileAmenitiesOpen(false);
                          void jumpToNode(amenity.primaryNodeId);
                        }}
                        className={`absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/30 transition hover:scale-110 ${
                          activeAmenityId === amenity.id
                            ? "bg-[#fff18c] shadow-[0_0_0_4px_rgba(255,241,140,0.22)]"
                            : "bg-[#ffd34d] shadow-[0_0_8px_rgba(255,211,77,0.55)]"
                        }`}
                        style={{
                          left: `${amenity.leftPercent * 100}%`,
                          top: `${amenity.topPercent * 100}%`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-auto absolute right-3 top-1/2 z-20 -translate-y-1/2 sm:right-6">
        <div className="flex flex-col items-center gap-2 rounded-[1.35rem] border border-white/10 bg-black/20 p-2.5 shadow-[0_18px_46px_rgba(0,0,0,0.3)] backdrop-blur-2xl sm:gap-3 sm:rounded-[1.7rem] sm:p-3">
          <ArrowButton
            icon={ArrowUp}
            label="Move forward"
            onClick={() => void navigateTo("forward")}
            disabled={!navigationTargets.forward.node || isTransitioning}
          />
          <ArrowButton
            icon={ArrowLeft}
            label="Move left"
            onClick={() => void navigateTo("left")}
            disabled={!navigationTargets.left.node || isTransitioning}
          />
          <ArrowButton
            icon={ArrowRight}
            label="Move right"
            onClick={() => void navigateTo("right")}
            disabled={!navigationTargets.right.node || isTransitioning}
          />
          <ArrowButton
            icon={ArrowDown}
            label="Move back"
            onClick={() => void navigateTo("backward")}
            disabled={!navigationTargets.backward.node || isTransitioning}
          />
        </div>
      </div>

      <div className="pointer-events-auto absolute bottom-2 right-2 z-30 hidden lg:block xl:bottom-3 xl:right-3">
        <div
          className={`relative h-[180px] w-[300px] max-w-[24vw] overflow-hidden xl:h-[205px] xl:w-[360px] xl:max-w-[26vw] 2xl:h-[235px] 2xl:w-[420px] 2xl:max-w-[28vw] ${
            minimapZoom > 1
              ? isMinimapDragging
                ? "cursor-grabbing"
                : "cursor-grab"
              : "cursor-default"
          }`}
          onWheelCapture={handleMinimapWheel}
          onPointerDown={handleMinimapPointerDown}
          onPointerMove={handleMinimapPointerMove}
          onPointerUp={handleMinimapPointerUp}
          onPointerCancel={handleMinimapPointerUp}
          style={{ touchAction: "none" }}
        >
          <div
            className="absolute inset-0 transition-transform duration-150 ease-out"
            style={{
              transform: `translate(${minimapOffset.x}px, ${minimapOffset.y}px) scale(${minimapZoom})`,
              transformOrigin: "center center",
            }}
          >
            <div
              className="absolute left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2"
              style={{
                aspectRatio: `${EXTERIOR_MINIMAP_IMAGE_LAYOUT.width} / ${EXTERIOR_MINIMAP_IMAGE_LAYOUT.height}`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={EXTERIOR_MINIMAP_IMAGE_URL}
                alt="Trifecta amenity minimap"
                className="h-full w-full rounded-4xl"
                draggable={false}
              />

              {minimapDots.map((amenity) => (
                <button
                  key={amenity.id}
                  type="button"
                  aria-label={`Go to ${amenity.name}`}
                  title={amenity.name}
                  onClick={() => void jumpToNode(amenity.primaryNodeId)}
                  className={`absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/35 transition hover:scale-110 ${
                    activeAmenityId === amenity.id
                      ? "bg-[#fff18c] shadow-[0_0_0_4px_rgba(255,241,140,0.22)]"
                      : "bg-[#ffd34d] shadow-[0_0_8px_rgba(255,211,77,0.65)]"
                  }`}
                  style={{
                    left: `${amenity.leftPercent * 100}%`,
                    top: `${amenity.topPercent * 100}%`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center p-4 sm:p-6">
        <div className={`${uiFont.className} flex items-center gap-3 rounded-full border border-white/10 bg-black/18 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/56 shadow-[0_14px_32px_rgba(0,0,0,0.24)] backdrop-blur-2xl`}>
          {loadState.phase === "preview" || loadState.phase === "detail" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : null}
          <span>{loadState.message}</span>
          <span>{Math.round(loadState.detailProgress * 100)}%</span>
        </div>
      </div> */}
    </section>
  );
}
