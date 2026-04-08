"use client";

import { Viewer, events as viewerEvents, type Position } from "@photo-sphere-viewer/core";
import "@photo-sphere-viewer/core/index.css";
import { EquirectangularTilesAdapter } from "@photo-sphere-viewer/equirectangular-tiles-adapter";
import { MarkersPlugin } from "@photo-sphere-viewer/markers-plugin";
import "@photo-sphere-viewer/markers-plugin/index.css";
import {
  VirtualTourPlugin,
  events as virtualTourEvents,
  type VirtualTourNode,
} from "@photo-sphere-viewer/virtual-tour-plugin";
import "@photo-sphere-viewer/virtual-tour-plugin/index.css";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import NextImage from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BedDouble,
  Menu,
  Sofa,
  X,
} from "lucide-react";
import furnishedNavData from "@/data/trifecta_pano_walkthrough_data_Interior.json";
import bareShellNavData from "@/data/trifecta_pano_walkthrough_data_BareShell.json";
import {
  buildPhotoSpherePanorama,
  canUseTiledPanorama,
  getResolvedPreviewUrl,
  PanoAssetStore,
  selectWarmupTiles,
} from "@/lib/exterior-tour/pano";
import {
  buildExteriorTourGraph,
  getNodeHeading,
  imageFilenameToPanoId,
} from "@/lib/exterior-tour/nodes";
import { clamp, distancePlanar, dotPlanar, normalizePlanar, wrapAngleRad } from "@/lib/exterior-tour/math";
import type {
  DirectionalNavMap,
  ExteriorPanoNodeSource,
  ExteriorTourNode,
  NavigationDirection,
  PanoMeta,
} from "@/lib/exterior-tour/types";
import Image from "next/image";

const editorialFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const uiFont = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const FURNISHED_PANO_BASE_URL = "https://cdn.sthyra.com/interior-pano-trifecta-new/";
const BARE_SHELL_PANO_BASE_URL =
  "https://cdn.sthyra.com/bareshell-pano-trifecta-new/";
const FURNISHED_FLOOR_MAP_URL = "https://cdn.sthyra.com/images/Tower_A_01_2D.webp";
const BARE_SHELL_FLOOR_MAP_URL = "https://cdn.sthyra.com/images/Tower_A_06_2D.webp";
const DEFAULT_ZOOM = 10;
const MIN_PITCH = -Math.PI / 2 + 0.08;
const MAX_PITCH = Math.PI / 2 - 0.08;
const INTERIOR_SPHERE_RESOLUTION = 128;
const INTERIOR_SLOW_SPHERE_RESOLUTION = 96;
const INTERIOR_MIN_FOV = 36;
const INTERIOR_MAX_FOV = 74;
const FURNISHED_MAP_FLIP_X = false;
const FURNISHED_MAP_FLIP_Y = false;
const BARE_SHELL_MAP_FLIP_X = false;
const BARE_SHELL_MAP_FLIP_Y = false;

const LEGACY_SOURCE_BOTTOM_LEFT = {
  x: 1899.143896,
  y: -7658.955338,
};

const LEGACY_SOURCE_TOP_RIGHT = {
  x: 581.121048,
  y: -9052.578353,
};

const BARE_SHELL_SOURCE_BOTTOM_LEFT = {
  x: 4600.149307,
  y: -7708.955825,
};

const BARE_SHELL_SOURCE_TOP_RIGHT = {
  x: 5850.028969,
  y: -9052.57788,
};

const FURNISHED_PANO_FOLDER_OVERRIDES: Record<string, string> = {
  LS_BP_panoPath_Interior_F0005: "LS_BP_panoPath_Interior_F0005",
  LS_BP_panoPath_Interior2_F0007: "LS_BP_panoPath_Interior2_F0007",
  LS_BP_panoPath_Interior2_F0008: "LS_BP_panoPath_Interior2_F0008",
  LS_BP_panoPath_Interior5_F0014: "LS_BP_panoPath_Interior5_F0014",
};

const BARE_SHELL_PANO_FOLDER_OVERRIDES: Record<string, string> = {
  LS_BP_panoPath_Interior_F0005: "LS_BP_panoPath_F0005",
  LS_BP_panoPath_Interior2_F0007: "LS_BP_panoPath2_F0007",
  LS_BP_panoPath_Interior2_F0008: "LS_BP_panoPath2_F0008",
  LS_BP_panoPath_Interior5_F0014: "LS_BP_panoPath4_F0014",
};

type InteriorPanoWalkthroughProps = {
  initialNodeId?: string;
  className?: string;
};

type ResolvedPano = {
  nodeId: string;
  panoId: string;
  meta: PanoMeta;
  panorama: ReturnType<typeof buildPhotoSpherePanorama>;
  previewUrl: string;
};

type RoomTab = {
  id: string;
  label: string;
  image: string;
};

type ViewerBindings = {
  viewer: Viewer;
  virtualTour: VirtualTourPlugin;
};

type MapBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  flipX: boolean;
  flipY: boolean;
};

type MapPoint = {
  leftPercent: number;
  topPercent: number;
};

type NetworkInformationLike = {
  effectiveType?: string;
  saveData?: boolean;
  addEventListener?: (type: "change", listener: () => void) => void;
  removeEventListener?: (type: "change", listener: () => void) => void;
};

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
      className="group flex h-12 w-12 touch-manipulation items-center justify-center rounded-[1.15rem] border border-white/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(214,224,230,0.1))] text-white shadow-[0_18px_38px_rgba(0,0,0,0.24)] backdrop-blur-2xl transition duration-200 active:scale-95 hover:border-white/40 hover:bg-white/[0.18] disabled:cursor-not-allowed disabled:opacity-30"
    >
      <Icon className="h-5 w-5 transition duration-200 group-hover:scale-110" />
    </button>
  );
}

const ROOM_LABELS: Record<string, string> = {
  LS_BP_panoPath_Interior_F0000: "Entrance",
  LS_BP_panoPath_Interior_F0001: "Drawing Room",
  LS_BP_panoPath_Interior_F0002: "Drawing Room Passage",
  LS_BP_panoPath_Interior_F0003: "Drawing Room Passage View 2",
  LS_BP_panoPath_Interior_F0004: "Dining Room Passage",
  LS_BP_panoPath_Interior_F0005: "Living Room 2",
  LS_BP_panoPath_Interior_F0006: "Attached Washroom 2",
  LS_BP_panoPath_Interior2_F0007: "Living Room 2",
  LS_BP_panoPath_Interior2_F0008: "Living Room 2",
  LS_BP_panoPath_Interior3_F0009: "Dining Room",
  LS_BP_panoPath_Interior3_F0010: "Dining Room",
  LS_BP_panoPath_Interior3_F0011: "Attached Washroom",
  LS_BP_panoPath_Interior4_F0012: "Living Room",
  LS_BP_panoPath_Interior4_F0013: "Living Room 1",
  LS_BP_panoPath_Interior5_F0014: "Childrens Room View 2",
  LS_BP_panoPath_Interior5_F0015: "Childrens Room",
  LS_BP_panoPath_Interior5_F0016: "Bathroom",
  LS_BP_panoPath_Interior6_F0017: "Drawing Room View 2",
  LS_BP_panoPath_Interior6_F0018: "Kitchen",
  LS_BP_panoPath_F0000: "Entrance",
  LS_BP_panoPath_F0001: "Drawing Room",
  LS_BP_panoPath_F0002: "Drawing Room Passage",
  LS_BP_panoPath_F0003: "Hall Passage",
  LS_BP_panoPath_F0004: "Living Room 1 Entrance",
  LS_BP_panoPath_F0005: "Living Room 1",
  LS_BP_panoPath_F0006: "Bathroom 4",
  LS_BP_panoPath_F0007: "Kitchen",
  LS_BP_panoPath_F0008: "Maid Room",
  LS_BP_panoPath_F0009: "Master Bedroom",
  LS_BP_panoPath_F0010: "Dining Room",
  LS_BP_panoPath_F0011: "Hall 1",
  LS_BP_panoPath_F0012: "Hall 2",
  LS_BP_panoPath6_F0018: "Living Room 1 View 2",
  LS_BP_panoPath6_F0019: "Living Room 1 Washroom",
  LS_BP_panoPath7_F0022: "Kitchen",
  LS_BP_panoPath7_F0021: "Kitchen Entrance",
  LS_BP_panoPath7_F0020: "Dining Room View 2",
  LS_BP_panoPath2_F0008: "Dining Room",
  LS_BP_panoPath2_F0007: "Living Room View 2",
  LS_BP_panoPath4_F0014: "Living Room 2 Entrance",
  LS_BP_panoPath4_F0015: "Living Room 2",
  LS_BP_panoPath3_F0013: "Bathroom",
  LS_BP_panoPath2_F0009: "Living Room 3 Entrance",
  LS_BP_panoPath2_F0010: "Living Room 3",
  LS_BP_panoPath2_F0011: "Living Room 3",
  LS_BP_panoPath5_F0017: "Living Room 3 Washroom",
  LS_BP_panoPath5_F0016: "Living Room 3",
};

function getRoomLabel(imageFilename: string) {
  const panoId = imageFilenameToPanoId(imageFilename);
  return ROOM_LABELS[panoId] ?? panoId.match(/F(\d{4})$/i)?.[0] ?? panoId;
}

function getModeAwarePanoFolderCandidates(panoId: string, isBareShellMode: boolean) {
  const explicitOverride = isBareShellMode
    ? BARE_SHELL_PANO_FOLDER_OVERRIDES[panoId]
    : FURNISHED_PANO_FOLDER_OVERRIDES[panoId];

  if (!isBareShellMode) {
    if (explicitOverride) {
      return [explicitOverride];
    }

    return panoId.endsWith("F0004") ? [`${panoId}.0000`, panoId] : [panoId];
  }

  const frameMatch = panoId.match(/F\d{4}$/i)?.[0];
  const candidates = new Set<string>();
  const droppedInterior = panoId.replace(/_Interior/gi, "");

  if (explicitOverride) {
    candidates.add(explicitOverride);
  }

  if (droppedInterior !== panoId) {
    candidates.add(droppedInterior);
  }

  if (frameMatch) {
    candidates.add(`LS_BP_panoPath_${frameMatch}`);
    for (let segment = 2; segment <= 8; segment += 1) {
      candidates.add(`LS_BP_panoPath${segment}_${frameMatch}`);
    }
  }

  return [...candidates];
}

function getResolvedPanoFolderId(
  nodeId: string,
  imageFilename: string,
  availablePanoFolders: Record<string, string>,
  isBareShellMode: boolean,
) {
  const sourcePanoId = imageFilenameToPanoId(imageFilename);
  return (
    availablePanoFolders[nodeId] ??
    getModeAwarePanoFolderCandidates(sourcePanoId, isBareShellMode)[0] ??
    sourcePanoId
  );
}

function getDefaultPreviewFile() {
  return "preview.jpg";
}

function getFrameId(imageFilename: string) {
  return imageFilenameToPanoId(imageFilename).match(/F\d{4}$/i)?.[0] ?? null;
}

function buildNodeModeLabel(isBareShellMode: boolean) {
  return isBareShellMode ? "Bare Shell" : "Furnished";
}

function vectorFromAngle(angle: number) {
  return {
    x: Math.cos(angle),
    y: Math.sin(angle),
    z: 0,
  };
}

function getMapBounds(isBareShellMode: boolean): MapBounds {
  if (isBareShellMode) {
    return {
      minX: Math.min(BARE_SHELL_SOURCE_BOTTOM_LEFT.x, BARE_SHELL_SOURCE_TOP_RIGHT.x),
      maxX: Math.max(BARE_SHELL_SOURCE_BOTTOM_LEFT.x, BARE_SHELL_SOURCE_TOP_RIGHT.x),
      minY: Math.min(BARE_SHELL_SOURCE_BOTTOM_LEFT.y, BARE_SHELL_SOURCE_TOP_RIGHT.y),
      maxY: Math.max(BARE_SHELL_SOURCE_BOTTOM_LEFT.y, BARE_SHELL_SOURCE_TOP_RIGHT.y),
      flipX: BARE_SHELL_MAP_FLIP_X,
      flipY: BARE_SHELL_MAP_FLIP_Y,
    };
  }

  return {
    minX: Math.min(LEGACY_SOURCE_BOTTOM_LEFT.x, LEGACY_SOURCE_TOP_RIGHT.x),
    maxX: Math.max(LEGACY_SOURCE_BOTTOM_LEFT.x, LEGACY_SOURCE_TOP_RIGHT.x),
    minY: Math.min(LEGACY_SOURCE_BOTTOM_LEFT.y, LEGACY_SOURCE_TOP_RIGHT.y),
    maxY: Math.max(LEGACY_SOURCE_BOTTOM_LEFT.y, LEGACY_SOURCE_TOP_RIGHT.y),
    flipX: FURNISHED_MAP_FLIP_X,
    flipY: FURNISHED_MAP_FLIP_Y,
  };
}

function getMapPointForNode(node: ExteriorTourNode, bounds: MapBounds): MapPoint {
  const width = Math.max(bounds.maxX - bounds.minX, 1);
  const height = Math.max(bounds.maxY - bounds.minY, 1);
  const normalizedX = clamp((node.rawPosition.x - bounds.minX) / width, 0, 1);
  const normalizedY = clamp((node.rawPosition.y - bounds.minY) / height, 0, 1);
  const mappedX = bounds.flipX ? 1 - normalizedX : normalizedX;
  const mappedY = bounds.flipY ? 1 - normalizedY : normalizedY;

  return {
    leftPercent: mappedX * 100,
    topPercent: mappedY * 100,
  };
}

function getViewRelativeNavigationTargets(
  graph: { nodes: ExteriorTourNode[] },
  activeNode: ExteriorTourNode | undefined,
  currentYaw: number,
): DirectionalNavMap {
  const emptyTarget = {
    forward: { direction: "forward" as const, node: null, score: -Infinity },
    left: { direction: "left" as const, node: null, score: -Infinity },
    right: { direction: "right" as const, node: null, score: -Infinity },
    backward: { direction: "backward" as const, node: null, score: -Infinity },
  };

  if (!activeNode) {
    return emptyTarget;
  }

  const worldForwardAngle = getNodeHeading(activeNode) + currentYaw;
  const desiredAngles: Record<NavigationDirection, number> = {
    forward: worldForwardAngle,
    left: worldForwardAngle - Math.PI / 2,
    right: worldForwardAngle + Math.PI / 2,
    backward: worldForwardAngle + Math.PI,
  };
  const candidates = graph.nodes.filter((node) => node.id !== activeNode.id);

  return {
    forward: getBestDirectionalTarget(activeNode, candidates, desiredAngles.forward, "forward"),
    left: getBestDirectionalTarget(activeNode, candidates, desiredAngles.left, "left"),
    right: getBestDirectionalTarget(activeNode, candidates, desiredAngles.right, "right"),
    backward: getBestDirectionalTarget(activeNode, candidates, desiredAngles.backward, "backward"),
  };
}

function getBestDirectionalTarget(
  activeNode: ExteriorTourNode,
  candidates: ExteriorTourNode[],
  desiredAngle: number,
  direction: NavigationDirection,
) {
  const desiredVector = vectorFromAngle(desiredAngle);
  const ranked = candidates
    .map((candidate) => {
      const delta = {
        x: candidate.rawPosition.x - activeNode.rawPosition.x,
        y: candidate.rawPosition.y - activeNode.rawPosition.y,
        z: 0,
      };
      const directionVector = normalizePlanar(delta, desiredVector);
      const distance = distancePlanar(activeNode.rawPosition, candidate.rawPosition);
      const alignment = dotPlanar(directionVector, desiredVector);
      const distanceBias =
        1 - clamp(distance / Math.max(activeNode.nearestDistance * 4.75, 1), 0, 1);
      const score = alignment * 0.82 + distanceBias * 0.18;

      return {
        direction,
        node: candidate,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best || best.score < 0.1) {
    return {
      direction,
      node: null,
      score: best?.score ?? -Infinity,
    };
  }

  return best;
}

function buildLinkPosition(node: ExteriorTourNode, target: ExteriorTourNode): Position {
  const dx = target.rawPosition.x - node.rawPosition.x;
  const dy = target.rawPosition.y - node.rawPosition.y;
  const dz = target.rawPosition.z - node.rawPosition.z;
  const planarDistance = Math.max(distancePlanar(node.rawPosition, target.rawPosition), 1);

  return {
    yaw: wrapAngleRad(Math.atan2(dy, dx) - getNodeHeading(node)),
    pitch: clamp(Math.atan2(dz, planarDistance), MIN_PITCH, MAX_PITCH),
  };
}

export default function InteriorPanoWalkthrough({
  initialNodeId,
  className,
}: InteriorPanoWalkthroughProps) {
  const [isBareShellMode, setIsBareShellMode] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [viewYaw, setViewYaw] = useState(0);
  const [activeNodeId, setActiveNodeId] = useState(initialNodeId ?? "");
  const [availablePanoFolders, setAvailablePanoFolders] = useState<Record<string, string>>({});
  const [availableNodeIds, setAvailableNodeIds] = useState<Set<string> | null>(null);
  const [preferredFrame, setPreferredFrame] = useState<string | null>(null);
  const [isSlowNetwork, setIsSlowNetwork] = useState(false);
  const viewerHostRef = useRef<HTMLDivElement | null>(null);
  const bindingsRef = useRef<ViewerBindings | null>(null);
  const activeNodeIdRef = useRef(activeNodeId);
  const currentNodeIdRef = useRef("");
  const cacheRef = useRef(new Map<string, ResolvedPano>());

  const allNodes = useMemo(
    () => ((isBareShellMode ? bareShellNavData : furnishedNavData) as ExteriorPanoNodeSource[]),
    [isBareShellMode],
  );
  const panoBaseUrl = isBareShellMode ? BARE_SHELL_PANO_BASE_URL : FURNISHED_PANO_BASE_URL;
  const floorMapUrl = isBareShellMode ? BARE_SHELL_FLOOR_MAP_URL : FURNISHED_FLOOR_MAP_URL;
  const assetStore = useMemo(() => new PanoAssetStore(panoBaseUrl), [panoBaseUrl]);

  const nodes = useMemo(() => {
    if (!availableNodeIds) {
      return [] as ExteriorPanoNodeSource[];
    }

    return allNodes.filter((item) => availableNodeIds.has(item.id));
  }, [allNodes, availableNodeIds]);

  const graph = useMemo(() => buildExteriorTourGraph(nodes), [nodes]);
  const fallbackNodeId = graph.nodes[0]?.id ?? "";
  const explicitNodeId = activeNodeId && graph.byId[activeNodeId] ? activeNodeId : undefined;
  const preferredNodeId = preferredFrame
    ? graph.nodes.find((node) => imageFilenameToPanoId(node.imageFilename).endsWith(preferredFrame))?.id
    : undefined;
  const currentNodeId = explicitNodeId || preferredNodeId || fallbackNodeId;
  const activeNode = graph.byId[currentNodeId];
  const navigationTargets = useMemo(
    () => getViewRelativeNavigationTargets(graph, activeNode, viewYaw),
    [activeNode, graph, viewYaw],
  );
  const mapBounds = useMemo(() => getMapBounds(isBareShellMode), [isBareShellMode]);
  const mapPoints = useMemo(
    () =>
      graph.nodes.map((node) => ({
        id: node.id,
        label: getRoomLabel(node.imageFilename),
        point: getMapPointForNode(node, mapBounds),
        isActive: node.id === currentNodeId,
      })),
    [currentNodeId, graph.nodes, mapBounds],
  );
  const tabs = useMemo<RoomTab[]>(
    () =>
      graph.nodes.map((node) => {
        const panoId = getResolvedPanoFolderId(
          node.id,
          node.imageFilename,
          availablePanoFolders,
          isBareShellMode,
        );

        return {
          id: node.id,
          label: getRoomLabel(node.imageFilename),
          image: `${panoBaseUrl}${panoId}/${getDefaultPreviewFile()}`,
        };
      }),
    [availablePanoFolders, graph.nodes, isBareShellMode, panoBaseUrl],
  );

  const handleModeToggle = useCallback(() => {
    setPreferredFrame(activeNode ? getFrameId(activeNode.imageFilename) : null);
    setIsMenuOpen(false);
    setIsTransitioning(true);
    setAvailablePanoFolders({});
    setAvailableNodeIds(null);
    setIsBareShellMode((current) => !current);
  }, [activeNode]);

  const resolvePano = useCallback(
    async (nodeId: string) => {
      const node = graph.byId[nodeId];
      if (!node) {
        throw new Error(`Unknown interior node: ${nodeId}`);
      }

      const panoFolderId = getResolvedPanoFolderId(
        node.id,
        node.imageFilename,
        availablePanoFolders,
        isBareShellMode,
      );
      const cacheKey = `${isBareShellMode ? "bs" : "fu"}:${nodeId}:${panoFolderId}`;
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        return cached;
      }

      const meta = await assetStore.getMeta(panoFolderId);
      if (!canUseTiledPanorama(meta)) {
        throw new Error(`Incompatible pano tiles for ${panoFolderId}`);
      }

      const previewUrl = getResolvedPreviewUrl(
        panoFolderId,
        panoBaseUrl,
        meta.preview ?? getDefaultPreviewFile(),
      );

      const resolved: ResolvedPano = {
        nodeId,
        panoId: panoFolderId,
        meta,
        panorama: buildPhotoSpherePanorama(panoFolderId, meta, panoBaseUrl, true, previewUrl),
        previewUrl,
      };

      cacheRef.current.set(cacheKey, resolved);
      return resolved;
    },
    [assetStore, availablePanoFolders, graph, isBareShellMode, panoBaseUrl],
  );

  const buildTourNode = useCallback(
    async (node: ExteriorTourNode): Promise<VirtualTourNode> => {
      const resolved = await resolvePano(node.id);

      return {
        id: node.id,
        panorama: resolved.panorama,
        thumbnail: resolved.previewUrl,
        name: getRoomLabel(node.imageFilename),
        caption: `${getRoomLabel(node.imageFilename)} | ${buildNodeModeLabel(isBareShellMode)}`,
        links: node.neighbors
          .map((neighbor) => graph.byId[neighbor.id])
          .filter((target): target is ExteriorTourNode => Boolean(target))
          .map((target) => ({
            nodeId: target.id,
            position: buildLinkPosition(node, target),
          })),
      };
    },
    [graph.byId, isBareShellMode, resolvePano],
  );

  const goToNode = useCallback(async (targetId: string) => {
    const bindings = bindingsRef.current;
    const targetNode = graph.byId[targetId];

    if (!bindings || !targetNode || isTransitioning || targetId === activeNodeIdRef.current) {
      return;
    }

    setIsTransitioning(true);
    setViewerError(null);

    try {
      const refreshedNode = await buildTourNode(targetNode);
      bindings.virtualTour.updateNode(refreshedNode);

      const completed = await bindings.virtualTour.setCurrentNode(targetId, {
        effect: "fade",
        showLoader: false,
        speed: 650,
        rotation: true,
      });

      if (completed === false) {
        setIsTransitioning(false);
      }
    } catch (error) {
      console.error("Failed to change interior pano node:", error);
      setViewerError(`Failed to load ${getRoomLabel(targetNode.imageFilename)}.`);
      setIsTransitioning(false);
    }
  }, [buildTourNode, graph.byId, isTransitioning]);

  const navigateToDirection = useCallback(
    async (direction: NavigationDirection) => {
      const target = navigationTargets[direction].node;
      if (!target) {
        return;
      }

      await goToNode(target.id);
    },
    [goToNode, navigationTargets],
  );

  useEffect(() => {
    let cancelled = false;

    const hydrateAvailableNodes = async () => {
      const availability = await Promise.allSettled(
        allNodes.map(async (item) => {
          const panoId = imageFilenameToPanoId(item.image_filename);

          for (const candidate of getModeAwarePanoFolderCandidates(panoId, isBareShellMode)) {
            const response = await fetch(`${panoBaseUrl}${candidate}/meta.json`, {
              cache: "force-cache",
            });

            if (response.ok) {
              return { id: item.id, panoFolderId: candidate };
            }
          }

          return null;
        }),
      );

      if (cancelled) {
        return;
      }

      const nextFolders: Record<string, string> = {};
      const nextIds = new Set<string>();

      availability.forEach((result) => {
        if (result.status === "fulfilled" && result.value) {
          nextIds.add(result.value.id);
          nextFolders[result.value.id] = result.value.panoFolderId;
        }
      });

      setAvailablePanoFolders(nextFolders);
      setAvailableNodeIds(nextIds);
    };

    void hydrateAvailableNodes();

    return () => {
      cancelled = true;
    };
  }, [allNodes, isBareShellMode, panoBaseUrl]);

  useEffect(() => {
    activeNodeIdRef.current = activeNodeId;
  }, [activeNodeId]);

  useEffect(() => {
    currentNodeIdRef.current = currentNodeId;
  }, [currentNodeId]);

  useEffect(() => {
    cacheRef.current.clear();
  }, [availablePanoFolders, isBareShellMode, panoBaseUrl]);

  useEffect(() => {
    if (typeof navigator === "undefined") {
      return;
    }

    const nav = navigator as Navigator & {
      connection?: NetworkInformationLike;
      mozConnection?: NetworkInformationLike;
      webkitConnection?: NetworkInformationLike;
    };
    const connection = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;

    if (!connection) {
      return;
    }

    const updateSlowNetworkState = () => {
      const effectiveType = connection.effectiveType?.toLowerCase() ?? "";
      setIsSlowNetwork(
        Boolean(connection.saveData) ||
          effectiveType === "slow-2g" ||
          effectiveType === "2g" ||
          effectiveType === "3g",
      );
    };

    updateSlowNetworkState();
    connection.addEventListener?.("change", updateSlowNetworkState);

    return () => {
      connection.removeEventListener?.("change", updateSlowNetworkState);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const warmCurrentPanorama = async () => {
      const node = graph.byId[currentNodeId];
      if (!node) {
        return;
      }

      try {
        const resolved = await resolvePano(node.id);
        const previewFile = resolved.meta.preview ?? getDefaultPreviewFile();

        await assetStore.preloadPreview(resolved.panoId, previewFile, "high");

        const warmupTiles = selectWarmupTiles(
          resolved.panoId,
          resolved.meta,
          panoBaseUrl,
          isSlowNetwork ? 6 : 12,
        );

        await Promise.allSettled(
          warmupTiles
            .slice(0, isSlowNetwork ? 6 : 12)
            .map((tile, index) =>
              assetStore.preloadTile(tile, index < 2 ? "high" : "low"),
            ),
        );

        const neighborIds = node.neighbors
          .slice(0, isSlowNetwork ? 1 : 2)
          .map((neighbor) => neighbor.id);

        await Promise.allSettled(
          neighborIds.map(async (neighborId) => {
            const neighbor = await resolvePano(neighborId);
            return assetStore.preloadPreview(
              neighbor.panoId,
              neighbor.meta.preview ?? getDefaultPreviewFile(),
              "low",
            );
          }),
        );
      } catch (error) {
        if (!cancelled) {
          console.debug("Warmup skipped for interior pano:", error);
        }
      }
    };

    void warmCurrentPanorama();

    return () => {
      cancelled = true;
    };
  }, [assetStore, currentNodeId, graph.byId, isSlowNetwork, panoBaseUrl, resolvePano]);

  useEffect(() => {
    if (!viewerHostRef.current || !graph.nodes.length) {
      return;
    }

    let disposed = false;
    let initTimer: ReturnType<typeof globalThis.setTimeout> | null = null;

    const initializeViewer = async () => {
      const startNodeId = currentNodeIdRef.current;
      const startResolved = await resolvePano(startNodeId).catch(() => null);
      if (startResolved) {
        const warmupTiles = selectWarmupTiles(
          startResolved.panoId,
          startResolved.meta,
          panoBaseUrl,
          isSlowNetwork ? 6 : 10,
        );

        await assetStore.preloadPreview(
          startResolved.panoId,
          startResolved.meta.preview ?? getDefaultPreviewFile(),
          "high",
        );
        await Promise.allSettled(
          warmupTiles
            .slice(0, isSlowNetwork ? 6 : 10)
            .map((tile, index) =>
              assetStore.preloadTile(tile, index < 2 ? "high" : "low"),
            ),
        );
      }

      const tourNodes = await Promise.all(graph.nodes.map((node) => buildTourNode(node)));
      if (disposed || !viewerHostRef.current) {
        return;
      }

      setViewerError(null);
      viewerHostRef.current.replaceChildren();

      const viewer = new Viewer({
        container: viewerHostRef.current,
        adapter: EquirectangularTilesAdapter.withConfig({
          resolution: isSlowNetwork
            ? INTERIOR_SLOW_SPHERE_RESOLUTION
            : INTERIOR_SPHERE_RESOLUTION,
          showErrorTile: false,
          baseBlur: true,
          antialias: true,
        }),
        navbar: false,
        touchmoveTwoFingers: false,
        mousewheelCtrlKey: false,
        defaultYaw: "0deg",
        defaultZoomLvl: DEFAULT_ZOOM,
        minFov: INTERIOR_MIN_FOV,
        maxFov: INTERIOR_MAX_FOV,
        moveSpeed: 2,
        moveInertia: 0.92,
        rendererParameters: {
          antialias: true,
          powerPreference: "high-performance",
        },
        plugins: [
          MarkersPlugin,
          VirtualTourPlugin.withConfig({
            positionMode: "manual",
            renderMode: "3d",
            nodes: tourNodes,
            startNodeId,
            preload: !isSlowNetwork,
            transitionOptions: {
              effect: "fade",
              showLoader: false,
              speed: 650,
              rotation: true,
            },
            linksOnCompass: false,
          }),
        ],
      });

      const virtualTour = viewer.getPlugin<VirtualTourPlugin>(VirtualTourPlugin);
      const handleNodeChanged = ({ node }: { node: VirtualTourNode }) => {
        setActiveNodeId(node.id);
        setViewYaw(viewer.getPosition().yaw);
        setViewerError(null);
        setIsTransitioning(false);
      };
      const handlePanoramaError = () => {
        setViewerError("Panorama failed to load.");
        setIsTransitioning(false);
      };
      const handlePositionUpdated = (event: Event) => {
        const nextPosition = (event as Event & { position?: Position }).position;
        if (nextPosition) {
          setViewYaw(nextPosition.yaw);
        }
      };

      virtualTour.addEventListener(virtualTourEvents.NodeChangedEvent.type, handleNodeChanged);
      viewer.addEventListener(viewerEvents.PanoramaErrorEvent.type, handlePanoramaError);
      viewer.addEventListener(viewerEvents.PositionUpdatedEvent.type, handlePositionUpdated);

      bindingsRef.current = { viewer, virtualTour };
      setActiveNodeId(startNodeId);
      setViewYaw(viewer.getPosition().yaw);
      setViewerError(null);
      setIsTransitioning(false);

      if (disposed) {
        virtualTour.removeEventListener(virtualTourEvents.NodeChangedEvent.type, handleNodeChanged);
        viewer.removeEventListener(viewerEvents.PanoramaErrorEvent.type, handlePanoramaError);
        viewer.removeEventListener(viewerEvents.PositionUpdatedEvent.type, handlePositionUpdated);
        viewer.destroy();
        if (bindingsRef.current?.viewer === viewer) {
          bindingsRef.current = null;
        }
        return;
      }
    };

    initTimer = globalThis.setTimeout(() => {
      void initializeViewer().catch((error) => {
        console.error("Failed to initialize interior pano viewer:", error);
        setViewerError("Viewer failed to initialize.");
        setIsTransitioning(false);
      });
    }, 0);

    return () => {
      disposed = true;
      if (initTimer) {
        globalThis.clearTimeout(initTimer);
      }

      const bindings = bindingsRef.current;
      if (bindings) {
        bindings.viewer.destroy();
        bindingsRef.current = null;
      }
    };
  }, [assetStore, buildTourNode, graph.nodes, isSlowNetwork, panoBaseUrl, resolvePano]);

  if (availableNodeIds === null) {
    return (
      <div className="flex h-full items-center justify-center rounded-[2rem] border border-white/10 bg-black/30 text-white/70">
        Loading interior panoramas...
      </div>
    );
  }

  if (!graph.nodes.length) {
    return (
      <div className="flex h-full items-center justify-center rounded-[2rem] border border-white/10 bg-black/30 text-white/70">
        No interior panoramas found.
      </div>
    );
  }

  return (
    <section
      className={`relative isolate h-full w-full overflow-hidden rounded-[2.25rem] border border-white/10 bg-black text-white  ${className ?? ""}`}
    >
      <div className="absolute inset-0">
        <div ref={viewerHostRef} className="h-full w-full" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(11,18,24,0.18)_0%,rgba(11,18,24,0.03)_22%,rgba(11,18,24,0.05)_68%,rgba(11,18,24,0.22)_100%)]" />
        <div
          className={`pointer-events-none absolute inset-0 bg-black/10 transition-opacity duration-200 ${
            isTransitioning ? "opacity-100" : "opacity-0"
          }`}
        />
        {viewerError ? (
          <div className="pointer-events-none absolute inset-x-4 top-20 z-20 flex justify-center sm:top-28">
            <div className={`${uiFont.className} rounded-full border border-[#ffb3b3]/30 bg-[rgba(38,10,10,0.58)] px-4 py-2 text-xs font-medium tracking-[0.12em] text-[#ffd4d4] backdrop-blur-xl`}>
              {viewerError}
            </div>
          </div>
        ) : null}
      </div>

      <div className="pointer-events-none absolute left-0 top-0 z-30 p-3 sm:p-6">
        <button
          type="button"
          aria-label="Open room index"
          onClick={() => setIsMenuOpen(true)}
          className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-[1.2rem] border border-white/24 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(189,202,211,0.06))] text-white shadow-[0_16px_34px_rgba(0,0,0,0.22)] backdrop-blur-2xl transition hover:border-white/34 hover:bg-white/12"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <div className="pointer-events-none absolute right-4 top-[1.5rem] z-30 hidden w-[220px] xl:block 2xl:right-6 2xl:top-[2rem] 2xl:w-[300px]">
        <div className="pointer-events-auto rounded-[1.6rem] p-3 ">
            <Image
              src={floorMapUrl}
              width={800}
              height={800}
              alt="Apartment floorplan"
              className="h-auto w-full object-contain"
            />

            {mapPoints.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Open ${item.label}`}
                title={item.label}
                onClick={() => void goToNode(item.id)}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition ${
                  item.isActive
                    ? "h-3.5 w-3.5 border-2 border-[#082227] bg-[#77f0ea] shadow-[0_0_0_4px_rgba(119,240,234,0.2)]"
                    : "h-2.5 w-2.5 border border-white/55 bg-white/88 hover:scale-110 hover:bg-[#c9fffb]"
                }`}
                style={{
                  left: `${item.point.leftPercent}%`,
                  top: `${item.point.topPercent}%`,
                }}
              />
            ))}

          <button
            type="button"
            onClick={handleModeToggle}
            className={`${uiFont.className} mt-3 flex w-full items-center justify-center gap-2 rounded-[1.25rem] border border-white/22 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(171,188,196,0.06))] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-white shadow-[0_16px_32px_rgba(0,0,0,0.2)] backdrop-blur-2xl transition hover:border-white/34 hover:bg-white/12`}
          >
            {isBareShellMode ? <Sofa className="h-4 w-4" /> : <BedDouble className="h-4 w-4" />}
            {isBareShellMode ? "View Furnished" : "View Bare Shell"}
          </button>
        </div>
      </div>

      {isMenuOpen ? (
        <div className="absolute inset-0 z-40 flex pointer-events-auto">
          <button
            type="button"
            aria-label="Close room index"
            onClick={() => setIsMenuOpen(false)}
            className="absolute inset-0 bg-[rgba(14,20,27,0.22)] transition duration-200 xl:bg-[rgba(14,20,27,0.12)]"
          />

          <div className="relative flex h-full w-full flex-col border-r border-white/14 bg-[linear-gradient(180deg,rgba(144,155,164,0.16)_0%,rgba(116,127,136,0.1)_100%)] p-4 text-white shadow-[0_24px_64px_rgba(0,0,0,0.16)] backdrop-blur-[24px] transition duration-300 sm:w-[28rem] xl:mb-6 xl:ml-6 xl:mt-24 xl:h-[calc(100%-7.5rem)] xl:w-[24rem] xl:rounded-[2rem] xl:border xl:border-white/18 xl:bg-[linear-gradient(180deg,rgba(165,176,184,0.18)_0%,rgba(120,134,142,0.12)_100%)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className={`${uiFont.className} text-[10px] uppercase tracking-[0.32em] text-white/55`}>
                  {buildNodeModeLabel(isBareShellMode)}
                </div>
                <div className={`${editorialFont.className} mt-2 text-[2rem] leading-none text-white`}>
                  Room Index
                </div>
                {/* <p className={`${uiFont.className} mt-2 max-w-[18rem] text-sm leading-5 text-white/72`}>
                  Browse rooms from a very light glass panel and jump instantly to any panorama.
                </p> */}
              </div>
              <button
                type="button"
                aria-label="Close room index"
                onClick={() => setIsMenuOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-[1rem] border border-white/18 bg-white/10 text-white transition hover:border-white/28 hover:bg-white/14"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="mt-5 xl:hidden">
              <div className="mx-auto w-full max-w-[13.5rem] rounded-[1.45rem] border border-white/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(161,177,185,0.05))] p-2.5 shadow-[0_14px_30px_rgba(0,0,0,0.12)] sm:max-w-[16rem]">
                <div className="relative overflow-hidden rounded-[1.1rem] border border-white/12">
                  <Image
                    src={floorMapUrl}
                    width={800}
                    height={800}
                    alt="Apartment floorplan"
                    className="h-auto w-full object-contain"
                  />

                  {mapPoints.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-label={`Open ${item.label}`}
                      title={item.label}
                      onClick={() => void goToNode(item.id)}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition ${
                        item.isActive
                          ? "h-3.5 w-3.5 border-2 border-[#082227] bg-[#77f0ea] shadow-[0_0_0_4px_rgba(119,240,234,0.2)]"
                          : "h-2.5 w-2.5 border border-white/55 bg-white/88 hover:scale-110 hover:bg-[#c9fffb]"
                      }`}
                      style={{
                        left: `${item.point.leftPercent}%`,
                        top: `${item.point.topPercent}%`,
                      }}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleModeToggle}
                  className={`${uiFont.className} mt-3 flex w-full items-center justify-center gap-2 rounded-[1.15rem] border border-white/22 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(171,188,196,0.06))] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-white shadow-[0_14px_28px_rgba(0,0,0,0.16)] backdrop-blur-2xl transition hover:border-white/34 hover:bg-white/12`}
                >
                  {isBareShellMode ? <Sofa className="h-4 w-4" /> : <BedDouble className="h-4 w-4" />}
                  {isBareShellMode ? "View Furnished" : "View Bare Shell"}
                </button>
              </div>
            </div>

            <div className="mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {tabs.map((tab) => {
                const isActive = tab.id === currentNodeId;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setPreferredFrame(null);
                      void goToNode(tab.id);
                    }}
                    className={`group flex w-full items-center gap-3 rounded-[1.4rem] border p-2.5 text-left shadow-[0_12px_30px_rgba(0,0,0,0.1)] transition ${
                      isActive
                        ? "border-[#7fd9d5]/34 bg-[linear-gradient(135deg,rgba(175,223,223,0.16),rgba(88,122,131,0.12))]"
                        : "border-white/14 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(181,197,204,0.05))] hover:border-white/22 hover:bg-white/10"
                    }`}
                  >
                    <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-[1rem] border border-white/18 bg-white/8">
                      <NextImage
                        src={tab.image}
                        alt={tab.label}
                        fill
                        sizes="96px"
                        className="object-cover object-center transition duration-300 group-hover:scale-[1.03]"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-semibold text-white">{tab.label}</div>
                      <div className="mt-1 text-sm leading-5 text-white/72">
                        {isActive
                          ? "You are currently inside this room."
                          : "Tap to switch the panorama view to this room."}
                      </div>
                      <div className={`${uiFont.className} mt-2 text-[10px] uppercase tracking-[0.28em] text-white/48`}>
                        {isActive ? "Current" : "Open"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-auto absolute right-2 z-20 bottom-[calc(env(safe-area-inset-bottom,0px)+6.5rem)] sm:right-4 sm:bottom-[calc(env(safe-area-inset-bottom,0px)+7rem)] xl:bottom-6 xl:right-6">
        <div className="flex flex-col items-center gap-1.5 rounded-[1.15rem] border border-white/24 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(214,224,230,0.08))] p-2 shadow-[0_18px_46px_rgba(0,0,0,0.24)] backdrop-blur-2xl sm:gap-2.5 sm:rounded-[1.45rem] sm:p-2.5 xl:gap-3 xl:rounded-[1.7rem] xl:p-3">
          <ArrowButton
            icon={ArrowUp}
            label="Move forward"
            onClick={() => void navigateToDirection("forward")}
            disabled={!navigationTargets.forward.node || isTransitioning}
          />
          <ArrowButton
            icon={ArrowLeft}
            label="Move left"
            onClick={() => void navigateToDirection("left")}
            disabled={!navigationTargets.left.node || isTransitioning}
          />
          <ArrowButton
            icon={ArrowRight}
            label="Move right"
            onClick={() => void navigateToDirection("right")}
            disabled={!navigationTargets.right.node || isTransitioning}
          />
          <ArrowButton
            icon={ArrowDown}
            label="Move back"
            onClick={() => void navigateToDirection("backward")}
            disabled={!navigationTargets.backward.node || isTransitioning}
          />
        </div>
      </div>

      <style jsx global>{`
        .psv-navbar,
        .psv-virtual-tour-arrows {
          display: none !important;
        }
      `}</style>
    </section>
  );
}
