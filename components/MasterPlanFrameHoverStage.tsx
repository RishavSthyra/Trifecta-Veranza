"use client";

import {
  Suspense,
  memo,
  startTransition,
  type MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  AdaptiveDpr,
  Html,
  Line,
  PerspectiveCamera,
  useGLTF,
} from "@react-three/drei";
import {
  Box3,
  DoubleSide,
  EdgesGeometry,
  Euler,
  Group,
  MathUtils,
  Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera as ThreePerspectiveCamera,
  Quaternion,
  Vector2,
  Vector3,
} from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import {
  MASTER_PLAN_SCRUB_HQ_VIDEO_PATH,
  MASTER_PLAN_SCRUB_VIDEO_FPS,
  TOTAL_MASTER_PLAN_FRAMES,
} from "@/data/masterPlanFrameCdnUrls";
import {
  getNearestMasterPlanHotspot,
  isApartmentIdAllowedAtHotspot,
} from "@/lib/master-plan-hotspots";
import trackingData from "@/data/trifecta_unreal_tracking_data.json";
import type {
  InventoryApartment,
  InventoryStatus,
  TowerType,
} from "@/types/inventory";

const MODEL_PATH_A = "/models/forglb.glb";
const MODEL_PATH_B = "/models/forglb - Copy.glb";
const INTERACTION_MODEL_PATH_A = "/models/forglb.glb";
const INTERACTION_MODEL_PATH_B = "/models/forglb - Copy.glb";
// const MODEL_PATH_A = "/models/Towers_Final.glb";
// const MODEL_PATH_B = "/models/Towers_Final - Copy.glb";
const APARTMENT_ID_PATTERN = /^(Tower_[A-Z]_\d{2}_\d{3,4})_/;
const TARGET_MODEL_HEIGHT = 10;
const TOTAL_FRAMES = TOTAL_MASTER_PLAN_FRAMES;
const SNAP_FRAMES = [1, 61, 121, 181, 241, 301] as const;
const DRAG_THRESHOLD_PX = 8;
const DRAG_PIXELS_PER_FRAME = 8;
const DRAG_MAX_LEAD_FRAMES = 32;
const DRAG_MAX_POINTER_PIXELS_PER_MS = 2.2;
const SNAP_ANIMATION_MIN_DURATION_MS = 180;
const SNAP_ANIMATION_MAX_DURATION_MS = 340;
const SNAP_ANIMATION_MS_PER_FRAME = 3.6;
const HOTSPOT_NAVIGATION_MIN_DURATION_MS = 380;
const HOTSPOT_NAVIGATION_MAX_DURATION_MS = 720;
const HOTSPOT_NAVIGATION_MS_PER_FRAME = 6.8;
const DRAG_VIDEO_SYNC_FRAME_STEP = 1;
const HOVER_COOLDOWN_MS = 80;
const TOWER_MESH_PREWARM_FRAMES = 6;
const TRACKING_VIDEO_ASPECT = 16 / 9;
const VIDEO_SYNC_THRESHOLD_SECONDS = 1 / (MASTER_PLAN_SCRUB_VIDEO_FPS * 1.5);
const VIDEO_FAST_SEEK_THRESHOLD_SECONDS = 0.18;
const ENABLE_TRACKING_DEBUG = false;
const FILTER_HIGHLIGHT_EDGE_SIMPLIFY_THRESHOLD = 12;
const DEFAULT_MASTER_PLAN_PERFORMANCE_PROFILE: MasterPlanPerformanceProfile = {
  canvasPerformance: {
    debounce: 120,
    min: 0.45,
  },
  isConstrained: false,
  scrubVideoPreload: "auto",
  tier: "standard",
};

// Placeholder alignment until Unreal tracking data is available.
const BASE_CAMERA_POSITION: [number, number, number] = [10.5, 7.25, 13.5];
const BASE_MODEL_OFFSET: [number, number, number] = [1.8, 0, 0];

type InventoryLoadState = "loading" | "ready" | "error";
type PointerPosition = { x: number; y: number };
type CoverViewport = {
  height: number;
  left: number;
  top: number;
  width: number;
};
type MasterPlanConnection = {
  addEventListener?: (type: "change", listener: () => void) => void;
  effectiveType?: string;
  removeEventListener?: (type: "change", listener: () => void) => void;
  saveData?: boolean;
};
type MasterPlanNavigator = Navigator & {
  connection?: MasterPlanConnection;
  deviceMemory?: number;
};
type MasterPlanPerformanceTier = "standard" | "constrained" | "low";
type MasterPlanPerformanceProfile = {
  canvasPerformance: {
    debounce: number;
    min: number;
  };
  isConstrained: boolean;
  scrubVideoPreload: "auto" | "metadata";
  tier: MasterPlanPerformanceTier;
};

type HoverMeshData = {
  geometry: Mesh["geometry"];
  key: string;
  matrix: Matrix4;
};

type InventoryApartmentIndex = Map<TowerType, Map<string, InventoryApartment>>;

type PreparedTowerModel = {
  apartments: Map<string, HoverMeshData[]>;
  debugTarget: Vector3;
  modelTowerDummies: TowerFootprint | null;
  offset: [number, number, number];
  pickableMeshes: Mesh[];
  scaledHeight: number;
  scene: Group;
  scale: number;
  trackedTowerFootprints: Partial<Record<TowerCode, TowerFootprint>>;
  towerFootprints: Partial<Record<TowerCode, TowerFootprint>>;
};

const PREPARED_TOWER_CACHE = new Map<string, PreparedTowerModel>();

type DragState = {
  clampedDeltaX: number;
  didDrag: boolean;
  lastClientX: number;
  lastTimestamp: number;
  pointerId: number;
  startProgress: number;
  startX: number;
};

type TowerCode = "A" | "B";

type UnrealCameraKey = keyof typeof trackingData;

type TowerFootprint = {
  ta1: Vector3;
  ta2: Vector3;
  ta3: Vector3;
  ta4: Vector3;
};

type TrackingDebugPoint = {
  color: string;
  key: string;
  label: string;
  position: Vector3;
};

type TrackingCameraRay = {
  color: string;
  end: Vector3;
  key: string;
  label: string;
  start: Vector3;
};

type TrackingCameraView = {
  fov: number;
  key: UnrealCameraKey;
  position: Vector3;
  quaternion: Quaternion;
  target: Vector3;
};
type SimilarityTransform = {
  position: Vector3;
  quaternion: Quaternion;
  scale: number;
};
type UnrealVector3Like = {
  x: number;
  y: number;
  z: number;
};

const TOWER_A_TRACKING_KEYS = [
  "A1",
  "A2",
  "A3",
  "A4",
  "A5",
  "A6",
] as const satisfies UnrealCameraKey[];
const TRACKING_CAMERA_DISTANCE = 12;
const HIGHLIGHT_EDGE_GEOMETRY_CACHE = new WeakMap<Mesh["geometry"], EdgesGeometry>();
const HIGHLIGHT_EXPANDED_MATRIX_CACHE = new WeakMap<
  Matrix4,
  Map<number, Matrix4>
>();
const INVISIBLE_PROXY_MATERIAL = new MeshBasicMaterial({
  colorWrite: false,
  depthWrite: false,
  opacity: 0,
  side: DoubleSide,
  toneMapped: false,
  transparent: true,
});
const DEBUG_PROXY_MATERIAL = new MeshBasicMaterial({
  colorWrite: true,
  depthWrite: false,
  opacity: 0,
  side: DoubleSide,
  toneMapped: false,
  transparent: true,
});
const PROXY_MATERIAL_ARRAY_CACHE = new Map<string, Material[]>();

function getHighlightEdgesGeometry(geometry: Mesh["geometry"]) {
  const cachedGeometry = HIGHLIGHT_EDGE_GEOMETRY_CACHE.get(geometry);

  if (cachedGeometry) {
    return cachedGeometry;
  }

  const edgesGeometry = new EdgesGeometry(geometry, 20);
  HIGHLIGHT_EDGE_GEOMETRY_CACHE.set(geometry, edgesGeometry);
  return edgesGeometry;
}

function getExpandedHighlightMatrix(matrix: Matrix4, scaleMultiplier: number) {
  const cachedMatrices = HIGHLIGHT_EXPANDED_MATRIX_CACHE.get(matrix);
  const cachedMatrix = cachedMatrices?.get(scaleMultiplier);

  if (cachedMatrix) {
    return cachedMatrix;
  }

  const expandedMatrix = matrix
    .clone()
    .multiply(
      new Matrix4().makeScale(
        scaleMultiplier,
        scaleMultiplier,
        scaleMultiplier,
      ),
    );

  if (cachedMatrices) {
    cachedMatrices.set(scaleMultiplier, expandedMatrix);
  } else {
    HIGHLIGHT_EXPANDED_MATRIX_CACHE.set(
      matrix,
      new Map([[scaleMultiplier, expandedMatrix]]),
    );
  }

  return expandedMatrix;
}

function getProxyMaterials(
  material: Material | Material[],
  showDebugMaterial: boolean,
) {
  const sharedMaterial = showDebugMaterial
    ? DEBUG_PROXY_MATERIAL
    : INVISIBLE_PROXY_MATERIAL;

  if (!Array.isArray(material)) {
    return sharedMaterial;
  }

  const cacheKey = `${showDebugMaterial ? "debug" : "hidden"}:${material.length}`;
  const cachedMaterials = PROXY_MATERIAL_ARRAY_CACHE.get(cacheKey);

  if (cachedMaterials) {
    return cachedMaterials;
  }

  const nextMaterials = Array.from({ length: material.length }, () => sharedMaterial);
  PROXY_MATERIAL_ARRAY_CACHE.set(cacheKey, nextMaterials);
  return nextMaterials;
}

function extractApartmentIdFromName(name: string) {
  return name.match(APARTMENT_ID_PATTERN)?.[1] ?? null;
}

function resolveApartmentIdFromObject(object: Object3D | null) {
  let current: Object3D | null = object;

  while (current) {
    const apartmentId = extractApartmentIdFromName(current.name);
    if (apartmentId) {
      return apartmentId;
    }

    current = current.parent;
  }

  return null;
}

function wrapFrame(frame: number) {
  return ((frame - 1 + TOTAL_FRAMES) % TOTAL_FRAMES) + 1;
}

function wrapProgress(progress: number) {
  return ((progress % 1) + 1) % 1;
}

function frameToProgress(frame: number) {
  return (wrapFrame(frame) - 1) / TOTAL_FRAMES;
}

function progressToFrame(progress: number) {
  const normalizedProgress = wrapProgress(progress);
  const roundedFrame =
    Math.round(normalizedProgress * TOTAL_FRAMES) % TOTAL_FRAMES;
  return wrapFrame(roundedFrame + 1);
}

function getProgressRotation(progress: number) {
  return -(wrapProgress(progress) * Math.PI * 2);
}

function isSnapFrame(frame: number) {
  return SNAP_FRAMES.includes(wrapFrame(frame) as (typeof SNAP_FRAMES)[number]);
}

function getNearestSnapFrameInfo(frame: number) {
  const normalizedFrame = wrapFrame(frame);
  let closestFrame: number = SNAP_FRAMES[0];
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  SNAP_FRAMES.forEach((snapFrame, index) => {
    const distance = Math.min(
      Math.abs(normalizedFrame - snapFrame),
      Math.abs(normalizedFrame - (snapFrame + TOTAL_FRAMES)),
      Math.abs(normalizedFrame - (snapFrame - TOTAL_FRAMES)),
    );

    if (distance < closestDistance) {
      closestDistance = distance;
      closestFrame = snapFrame;
      closestIndex = index;
    }
  });

  return {
    distance: closestDistance,
    frame: closestFrame,
    index: closestIndex,
  };
}

function getNearestSnapFrame(frame: number) {
  return getNearestSnapFrameInfo(frame).frame;
}

function getDirectionalSnapFrame(frame: number, direction: 1 | -1) {
  const normalizedFrame = wrapFrame(frame);

  if (direction === 1) {
    return (
      SNAP_FRAMES.find((snapFrame) => snapFrame > normalizedFrame) ??
      SNAP_FRAMES[0]
    );
  }

  const previousSnapFrames = SNAP_FRAMES.filter(
    (snapFrame) => snapFrame < normalizedFrame,
  );

  return previousSnapFrames.at(-1) ?? SNAP_FRAMES.at(-1) ?? SNAP_FRAMES[0];
}

function isFrameWithinSnapWindow(frame: number, frameWindow: number) {
  return getNearestSnapFrameInfo(frame).distance <= frameWindow;
}

function getShortestProgressDelta(startProgress: number, endProgress: number) {
  const normalizedStart = wrapProgress(startProgress);
  const normalizedEnd = wrapProgress(endProgress);
  const forwardDistance = (normalizedEnd - normalizedStart + 1) % 1;
  const backwardDistance = forwardDistance - 1;

  return Math.abs(forwardDistance) <= Math.abs(backwardDistance)
    ? forwardDistance
    : backwardDistance;
}

function clampProgressLead(
  currentProgress: number,
  targetProgress: number,
  maxLeadFrames: number,
) {
  const maxLeadProgress = maxLeadFrames / TOTAL_FRAMES;
  const delta = getShortestProgressDelta(currentProgress, targetProgress);
  const clampedDelta = Math.max(
    -maxLeadProgress,
    Math.min(maxLeadProgress, delta),
  );

  return wrapProgress(currentProgress + clampedDelta);
}

function easeOutCubic(progress: number) {
  return 1 - (1 - progress) ** 3;
}

function easeInOutCubic(progress: number) {
  return progress < 0.5
    ? 4 * progress ** 3
    : 1 - (-2 * progress + 2) ** 3 / 2;
}

function getMasterPlanPerformanceProfile(): MasterPlanPerformanceProfile {
  if (typeof navigator === "undefined") {
    return DEFAULT_MASTER_PLAN_PERFORMANCE_PROFILE;
  }

  const masterPlanNavigator = navigator as MasterPlanNavigator;
  const connection = masterPlanNavigator.connection;
  const hardwareConcurrency = navigator.hardwareConcurrency ?? 8;
  const deviceMemory = masterPlanNavigator.deviceMemory ?? 8;
  const effectiveType = connection?.effectiveType ?? "";
  const saveData = connection?.saveData ?? false;
  const hasSlowNetwork =
    effectiveType === "slow-2g" ||
    effectiveType === "2g" ||
    effectiveType === "3g";
  const hasVerySlowNetwork =
    effectiveType === "slow-2g" || effectiveType === "2g";
  const hasConstrainedCpu = hardwareConcurrency <= 4;
  const hasLowEndCpu = hardwareConcurrency <= 2;
  const hasConstrainedMemory = deviceMemory <= 4;
  const hasLowEndMemory = deviceMemory <= 2;
  const isConstrained =
    saveData || hasSlowNetwork || hasConstrainedCpu || hasConstrainedMemory;

  if (!isConstrained) {
    return DEFAULT_MASTER_PLAN_PERFORMANCE_PROFILE;
  }

  const tier: MasterPlanPerformanceTier =
    saveData || hasVerySlowNetwork || hasLowEndCpu || hasLowEndMemory
      ? "low"
      : "constrained";

  return {
    canvasPerformance: {
      debounce: tier === "low" ? 220 : 180,
      min: tier === "low" ? 0.28 : 0.35,
    },
    isConstrained: true,
    scrubVideoPreload: "metadata",
    tier,
  };
}

function getDragSeekBudgetMs(tier: MasterPlanPerformanceTier) {
  if (tier === "low") {
    return 24;
  }

  if (tier === "constrained") {
    return 18;
  }

  return 12;
}

function getCanvasDprRange(
  tier: MasterPlanPerformanceTier,
  {
    isDragging,
    isSettling,
    supportsPreciseHover,
  }: {
    isDragging: boolean;
    isSettling: boolean;
    supportsPreciseHover: boolean;
  },
): [number, number] {
  if (tier === "low") {
    if (isDragging) {
      return [0.22, 0.34];
    }

    if (isSettling) {
      return [0.32, 0.46];
    }

    return supportsPreciseHover ? [0.45, 0.65] : [0.38, 0.56];
  }

  if (tier === "constrained") {
    if (isDragging) {
      return [0.28, 0.42];
    }

    if (isSettling) {
      return [0.36, 0.52];
    }

    return supportsPreciseHover ? [0.5, 0.72] : [0.42, 0.62];
  }

  if (isDragging) {
    return [0.34, 0.5];
  }

  if (isSettling) {
    return [0.48, 0.68];
  }

  return supportsPreciseHover ? [0.7, 1] : [0.5, 0.85];
}

function towerTypeToCode(tower: TowerType | null) {
  if (tower === "Tower B") {
    return "B" as const;
  }

  return tower === "Tower A" ? ("A" as const) : null;
}

function buildTowerFootprint(
  bounds: Box3,
  offset: [number, number, number],
  scale: number,
): TowerFootprint {
  const groundY = bounds.min.y;
  const toSceneSpace = (x: number, y: number, z: number) =>
    new Vector3(
      (x + offset[0]) * scale,
      (y + offset[1]) * scale,
      (z + offset[2]) * scale,
    );

  return {
    ta1: toSceneSpace(bounds.min.x, groundY, bounds.max.z),
    ta2: toSceneSpace(bounds.max.x, groundY, bounds.max.z),
    ta3: toSceneSpace(bounds.max.x, groundY, bounds.min.z),
    ta4: toSceneSpace(bounds.min.x, groundY, bounds.min.z),
  };
}

function toSceneSpacePosition(
  position: Vector3,
  offset: [number, number, number],
  scale: number,
  preserveWorldPosition = false,
  includeBaseModelOffset = true,
) {
  if (preserveWorldPosition) {
    return position.clone();
  }

  return new Vector3(
    (position.x + offset[0]) * scale +
      (includeBaseModelOffset ? BASE_MODEL_OFFSET[0] : 0),
    (position.y + offset[1]) * scale +
      (includeBaseModelOffset ? BASE_MODEL_OFFSET[1] : 0),
    (position.z + offset[2]) * scale +
      (includeBaseModelOffset ? BASE_MODEL_OFFSET[2] : 0),
  );
}

function collectModelTowerDummies(scene: Group): TowerFootprint | null {
  const dummyPositions = new Map<string, Vector3>();

  scene.traverse((object) => {
    const normalizedName = object.name.trim().toLowerCase();

    if (!/^dummy_a[1-4]$/.test(normalizedName)) {
      return;
    }

    const worldPosition = new Vector3();
    object.getWorldPosition(worldPosition);
    dummyPositions.set(normalizedName, worldPosition.clone());
  });

  const ta1 = dummyPositions.get("dummy_a1");
  const ta2 = dummyPositions.get("dummy_a2");
  const ta3 = dummyPositions.get("dummy_a3");
  const ta4 = dummyPositions.get("dummy_a4");

  if (!ta1 || !ta2 || !ta3 || !ta4) {
    return null;
  }

  return { ta1, ta2, ta3, ta4 } satisfies TowerFootprint;
}

function getTowerFootprintsFromModelDummies(
  scene: Group,
  offset: [number, number, number],
  scale: number,
  preserveWorldPosition = false,
  includeBaseModelOffset = true,
  towerCode: TowerCode = "A",
): Partial<Record<TowerCode, TowerFootprint>> {
  const modelDummies = collectModelTowerDummies(scene);

  if (!modelDummies) {
    return {} satisfies Partial<Record<TowerCode, TowerFootprint>>;
  }

  const towerFootprint: TowerFootprint = {
    ta1: toSceneSpacePosition(
      modelDummies.ta1,
      offset,
      scale,
      preserveWorldPosition,
      includeBaseModelOffset,
    ),
    ta2: toSceneSpacePosition(
      modelDummies.ta2,
      offset,
      scale,
      preserveWorldPosition,
      includeBaseModelOffset,
    ),
    ta3: toSceneSpacePosition(
      modelDummies.ta3,
      offset,
      scale,
      preserveWorldPosition,
      includeBaseModelOffset,
    ),
    ta4: toSceneSpacePosition(
      modelDummies.ta4,
      offset,
      scale,
      preserveWorldPosition,
      includeBaseModelOffset,
    ),
  };

  return {
    [towerCode]: towerFootprint,
  } satisfies Partial<Record<TowerCode, TowerFootprint>>;
}

function getCoverViewport(
  containerWidth: number,
  containerHeight: number,
  aspect: number,
): CoverViewport {
  if (containerWidth <= 0 || containerHeight <= 0 || aspect <= 0) {
    return { width: 1, height: 1, left: 0, top: 0 };
  }

  const containerAspect = containerWidth / containerHeight;

  if (containerAspect > aspect) {
    const width = containerWidth;
    const height = width / aspect;

    return {
      width,
      height,
      left: 0,
      top: (containerHeight - height) / 2,
    };
  }

  const height = containerHeight;
  const width = height * aspect;

  return {
    width,
    height,
    left: (containerWidth - width) / 2,
    top: 0,
  };
}

function getUnrealTowerDummies(towerCode: TowerCode) {
  const dummies = trackingData.A1?.dummies;
  const dummyPrefix = towerCode === "B" ? "dummy_Tb" : "dummy_Ta";

  if (
    !dummies?.[`${dummyPrefix}1` as keyof typeof dummies] ||
    !dummies[`${dummyPrefix}2` as keyof typeof dummies] ||
    !dummies[`${dummyPrefix}3` as keyof typeof dummies] ||
    !dummies[`${dummyPrefix}4` as keyof typeof dummies]
  ) {
    return null;
  }

  return {
    ta1: dummies[`${dummyPrefix}1` as keyof typeof dummies] as UnrealVector3Like,
    ta2: dummies[`${dummyPrefix}2` as keyof typeof dummies] as UnrealVector3Like,
    ta3: dummies[`${dummyPrefix}3` as keyof typeof dummies] as UnrealVector3Like,
    ta4: dummies[`${dummyPrefix}4` as keyof typeof dummies] as UnrealVector3Like,
  } satisfies Record<keyof TowerFootprint, UnrealVector3Like>;
}

function getTrackedViewTowerDummies(
  trackingKey: UnrealCameraKey,
  towerCode: TowerCode,
) {
  const dummies = trackingData[trackingKey]?.dummies;
  const dummyPrefix = towerCode === "B" ? "dummy_Tb" : "dummy_Ta";

  if (
    !dummies?.[`${dummyPrefix}1` as keyof typeof dummies] ||
    !dummies[`${dummyPrefix}2` as keyof typeof dummies] ||
    !dummies[`${dummyPrefix}3` as keyof typeof dummies] ||
    !dummies[`${dummyPrefix}4` as keyof typeof dummies]
  ) {
    return null;
  }

  return {
    ta1: dummies[`${dummyPrefix}1` as keyof typeof dummies] as UnrealVector3Like,
    ta2: dummies[`${dummyPrefix}2` as keyof typeof dummies] as UnrealVector3Like,
    ta3: dummies[`${dummyPrefix}3` as keyof typeof dummies] as UnrealVector3Like,
    ta4: dummies[`${dummyPrefix}4` as keyof typeof dummies] as UnrealVector3Like,
  } satisfies Record<keyof TowerFootprint, UnrealVector3Like>;
}

function getQuadPoints(quad: Record<keyof TowerFootprint, Vector3>) {
  return [quad.ta1, quad.ta2, quad.ta3, quad.ta4];
}

function averageVector(points: Vector3[]) {
  return points
    .reduce((sum, point) => sum.add(point.clone()), new Vector3())
    .multiplyScalar(1 / Math.max(points.length, 1));
}

function computeSimilarityTransformFromQuads(
  modelQuad: TowerFootprint,
  unrealQuad: Record<keyof TowerFootprint, Vector3>,
): SimilarityTransform | null {
  const modelPoints = getQuadPoints(modelQuad);
  const unrealPoints = getQuadPoints(unrealQuad);
  const modelCenter = averageVector(modelPoints);
  const unrealCenter = averageVector(unrealPoints);
  const centeredModel = modelPoints.map(
    (point) => new Vector2(point.x - modelCenter.x, point.z - modelCenter.z),
  );
  const centeredUnreal = unrealPoints.map(
    (point) => new Vector2(point.x - unrealCenter.x, point.z - unrealCenter.z),
  );

  let dot = 0;
  let cross = 0;
  let sourceNorm = 0;

  centeredModel.forEach((point, index) => {
    dot += point.dot(centeredUnreal[index]);
    cross += point.x * centeredUnreal[index].y - point.y * centeredUnreal[index].x;
    sourceNorm += point.lengthSq();
  });

  if (sourceNorm <= 1e-8) {
    return null;
  }

  const rotationAngle = Math.atan2(cross, dot);
  const quaternion = new Quaternion().setFromAxisAngle(
    new Vector3(0, 1, 0),
    rotationAngle,
  );
  let scaledDot = 0;

  centeredModel.forEach((point, index) => {
    const rotatedPoint = point.clone().rotateAround(new Vector2(0, 0), rotationAngle);
    scaledDot += rotatedPoint.dot(centeredUnreal[index]);
  });

  const scale = scaledDot / sourceNorm;

  if (!Number.isFinite(scale) || scale <= 0) {
    return null;
  }

  const position = unrealCenter
    .clone()
    .sub(modelCenter.clone().applyQuaternion(quaternion).multiplyScalar(scale));

  return {
    position,
    quaternion,
    scale,
  } satisfies SimilarityTransform;
}

function applyTransformToPoint(point: Vector3, transform: SimilarityTransform) {
  return point
    .clone()
    .applyQuaternion(transform.quaternion)
    .multiplyScalar(transform.scale)
    .add(transform.position);
}

function unrealToThreePosition(point: UnrealVector3Like) {
  return new Vector3(point.x, point.z, point.y);
}

function unrealEulerToThreeQuaternion(rotation: {
  pitch: number;
  yaw: number;
  roll: number;
}) {
  const euler = new Euler(
    MathUtils.degToRad(rotation.pitch),
    -MathUtils.degToRad(rotation.yaw) - Math.PI / 2,
    -MathUtils.degToRad(rotation.roll),
    "YXZ",
  );

  return new Quaternion().setFromEuler(euler);
}

function getTowerTrackingTransforms(
  modelTowerDummies: TowerFootprint | null,
  towerCode: TowerCode,
) {
  if (!modelTowerDummies) {
    return [] as SimilarityTransform[];
  }

  return TOWER_A_TRACKING_KEYS.flatMap((trackingKey) => {
    const trackedViewDummies = getTrackedViewTowerDummies(trackingKey, towerCode);

    if (!trackedViewDummies) {
      return [];
    }

    const transform = computeSimilarityTransformFromQuads(modelTowerDummies, {
      ta1: unrealToThreePosition(trackedViewDummies.ta1),
      ta2: unrealToThreePosition(trackedViewDummies.ta2),
      ta3: unrealToThreePosition(trackedViewDummies.ta3),
      ta4: unrealToThreePosition(trackedViewDummies.ta4),
    });

    return transform ? [transform] : [];
  });
}

function getUnrealTowerFootprintInThreeSpace(
  towerCode: TowerCode,
  trackingKey: UnrealCameraKey = "A1",
) {
  const unrealDummies =
    getTrackedViewTowerDummies(trackingKey, towerCode) ??
    getUnrealTowerDummies(towerCode);

  if (!unrealDummies) {
    return null;
  }

  return {
    ta1: unrealToThreePosition(unrealDummies.ta1),
    ta2: unrealToThreePosition(unrealDummies.ta2),
    ta3: unrealToThreePosition(unrealDummies.ta3),
    ta4: unrealToThreePosition(unrealDummies.ta4),
  } satisfies TowerFootprint;
}

function getTowerTrackingCameraPath(
  aspect: number,
) {
  return TOWER_A_TRACKING_KEYS.flatMap((key) => {
    const cameraData = trackingData[key]?.camera;

    if (!cameraData) {
      return [];
    }
    const horizontalFov = MathUtils.degToRad(cameraData.fov);
    const verticalFov = MathUtils.radToDeg(
      2 * Math.atan(Math.tan(horizontalFov / 2) / aspect),
    );
    // A1 used to look correct because the older setup was only locally
    // accurate near the first shot. The 4-view snap system hid that because it
    // only visited a few discrete angles. In the tracked 6-view system the
    // GLB is moved into tracked world by the solved transform, so the camera
    // path must stay in raw tracked space rather than being transformed again.
    const position = unrealToThreePosition(cameraData.position);
    const quaternion = unrealEulerToThreeQuaternion(cameraData.rotation);
    const target = position.clone().add(
      new Vector3(0, 0, -1)
        .applyQuaternion(quaternion)
        .multiplyScalar(TRACKING_CAMERA_DISTANCE),
    );

    return [
      {
        fov: verticalFov,
        key,
        position,
        quaternion,
        target,
      } satisfies TrackingCameraView,
    ];
  });
}

function getTrackingDebugPoints(
  footprint: TowerFootprint | undefined,
  color = "#ff2d2d",
  labelPrefix = "",
) {
  if (!footprint) {
    return [];
  }

  return [
    {
      color,
      key: `${labelPrefix}ta1`,
      label: `${labelPrefix}Ta1`,
      position: footprint.ta1.clone(),
    },
    {
      color,
      key: `${labelPrefix}ta2`,
      label: `${labelPrefix}Ta2`,
      position: footprint.ta2.clone(),
    },
    {
      color,
      key: `${labelPrefix}ta3`,
      label: `${labelPrefix}Ta3`,
      position: footprint.ta3.clone(),
    },
    {
      color,
      key: `${labelPrefix}ta4`,
      label: `${labelPrefix}Ta4`,
      position: footprint.ta4.clone(),
    },
  ] satisfies TrackingDebugPoint[];
}

function transformTowerFootprint(
  footprint: TowerFootprint | null | undefined,
  transform: SimilarityTransform | null,
) {
  if (!footprint || !transform) {
    return null;
  }

  return {
    ta1: applyTransformToPoint(footprint.ta1, transform),
    ta2: applyTransformToPoint(footprint.ta2, transform),
    ta3: applyTransformToPoint(footprint.ta3, transform),
    ta4: applyTransformToPoint(footprint.ta4, transform),
  } satisfies TowerFootprint;
}

function getTrackingCameraRays(path: TrackingCameraView[] | null | undefined) {
  if (!path?.length) {
    return [];
  }

  return path.map((view, index) => ({
    color: index === 0 ? "#7dd3fc" : "#38bdf8",
    end: view.target.clone(),
    key: view.key ?? `camera-${index}`,
    label: view.key ?? `C${index + 1}`,
    start: view.position.clone(),
  })) satisfies TrackingCameraRay[];
}

function vectorToDebugRow(vector: Vector3) {
  return {
    x: Number(vector.x.toFixed(4)),
    y: Number(vector.y.toFixed(4)),
    z: Number(vector.z.toFixed(4)),
  };
}

type VideoStreamBindingOptions = {
  hlsPath: string;
  mp4Path: string;
  onReady: () => void;
  video: HTMLVideoElement;
};

function bindVideoStream({
  hlsPath,
  mp4Path,
  onReady,
  video,
}: VideoStreamBindingOptions) {
  let cancelled = false;

  const markReady = () => {
    onReady();
  };

  const applyMp4Fallback = () => {
    if (cancelled) {
      return;
    }

    if (video.src !== mp4Path) {
      video.src = mp4Path;
      video.load();
    }
  };

  video.addEventListener("loadedmetadata", markReady);
  video.addEventListener("canplay", markReady);
  video.addEventListener("error", applyMp4Fallback);

  applyMp4Fallback();

  if (hlsPath && video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = hlsPath;
    video.load();
  }

  return () => {
    cancelled = true;
    video.removeEventListener("loadedmetadata", markReady);
    video.removeEventListener("canplay", markReady);
    video.removeEventListener("error", applyMp4Fallback);
    video.pause();
    video.removeAttribute("src");
    video.load();
  };
}

function inferTowerFromApartmentId(
  apartmentId: string | null,
  fallbackTower: TowerType | null,
): TowerType {
  if (!apartmentId) {
    return fallbackTower ?? "Tower A";
  }

  const towerCode = apartmentId.split("_")[1];
  return towerCode === "B" ? "Tower B" : "Tower A";
}

function formatApartmentLabel(
  apartmentId: string | null,
  fallbackTower: TowerType | null,
) {
  const resolvedTower = inferTowerFromApartmentId(apartmentId, fallbackTower);

  if (!apartmentId) {
    return {
      floor: null,
      tower: resolvedTower,
      towerCode: resolvedTower.endsWith("B") ? "B" : "A",
      unit: null,
      title: "Hover a flat",
    };
  }

  const [, towerCode = "A", floorCode = "", unitCode = ""] =
    apartmentId.split("_");

  return {
    floor: floorCode,
    tower: `Tower ${towerCode}` as TowerType,
    towerCode,
    unit: unitCode,
    title: `Flat ${unitCode}`,
  };
}

function normalizeFlatToken(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

function buildFlatCandidates(
  apartmentId: string,
  fallbackTower: TowerType | null,
) {
  const apartment = formatApartmentLabel(apartmentId, fallbackTower);
  const unitToken = normalizeFlatToken(apartment.unit ?? "");
  const floorToken = normalizeFlatToken(apartment.floor ?? "");
  const towerCode = normalizeFlatToken(apartment.towerCode);
  const compoundUnitTokens = new Set<string>();

  if (floorToken && unitToken) {
    const trimmedUnitToken = unitToken.replace(/^0+/, "");
    const unitSlices = new Set([
      unitToken,
      unitToken.slice(-3),
      unitToken.slice(-2),
      trimmedUnitToken,
    ]);

    unitSlices.forEach((unitSlice) => {
      if (!unitSlice) {
        return;
      }

      compoundUnitTokens.add(`${floorToken}${unitSlice}`);
    });
  }

  return new Set(
    [
      unitToken,
      ...compoundUnitTokens,
      `${towerCode}${unitToken}`,
      `T${towerCode}${unitToken}`,
      `${towerCode}FLAT${unitToken}`,
      ...Array.from(compoundUnitTokens, (token) => `${towerCode}${token}`),
      ...Array.from(compoundUnitTokens, (token) => `T${towerCode}${token}`),
    ].filter(Boolean),
  );
}

function buildApartmentTokenLookup(apartmentIds: Iterable<string>) {
  const lookup = new Map<TowerType, Map<string, string[]>>();

  for (const apartmentId of apartmentIds) {
    const tower = inferTowerFromApartmentId(apartmentId, null);
    const towerLookup = lookup.get(tower) ?? new Map<string, string[]>();
    lookup.set(tower, towerLookup);

    buildFlatCandidates(apartmentId, tower).forEach((token) => {
      const nextApartmentIds = towerLookup.get(token);

      if (nextApartmentIds) {
        nextApartmentIds.push(apartmentId);
        return;
      }

      towerLookup.set(token, [apartmentId]);
    });
  }

  return lookup;
}

function buildInventoryApartmentIndex(
  apartments: InventoryApartment[],
): InventoryApartmentIndex {
  const index: InventoryApartmentIndex = new Map();

  apartments.forEach((apartment) => {
    const towerIndex = index.get(apartment.tower) ?? new Map<string, InventoryApartment>();

    index.set(apartment.tower, towerIndex);

    const flatToken = normalizeFlatToken(apartment.flatNumber);
    const titleToken = normalizeFlatToken(apartment.title);
    const flatDigitsToken = normalizeFlatToken(
      apartment.flatNumber.replace(/[^0-9]/g, ""),
    );
    const titleDigitsToken = normalizeFlatToken(
      apartment.title.replace(/[^0-9]/g, ""),
    );
    const towerCode = apartment.tower === "Tower B" ? "B" : "A";
    const floorToken = String(apartment.floor).replace(/[^0-9]/g, "").padStart(2, "0");
    const numericVariants = new Set(
      [flatDigitsToken, titleDigitsToken].filter(Boolean),
    );
    const indexTokens = new Set<string>(
      [flatToken, titleToken, `${towerCode}${flatToken}`, `${towerCode}${titleToken}`].filter(
        Boolean,
      ),
    );

    numericVariants.forEach((numericToken) => {
      indexTokens.add(numericToken);
      indexTokens.add(`${towerCode}${numericToken}`);
      indexTokens.add(`T${towerCode}${numericToken}`);

      const lastTwo = numericToken.slice(-2);
      const lastThree = numericToken.slice(-3);
      const lastFour = numericToken.slice(-4);

      [lastTwo, lastThree, lastFour].filter(Boolean).forEach((sliceToken) => {
        indexTokens.add(sliceToken);
        indexTokens.add(`${floorToken}${sliceToken}`);
        indexTokens.add(`${towerCode}${floorToken}${sliceToken}`);
      });
    });

    indexTokens.forEach((token) => {
      if (token && !towerIndex.has(token)) {
        towerIndex.set(token, apartment);
      }
    });
  });

  return index;
}

function findInventoryApartmentInIndex(
  apartmentIndex: InventoryApartmentIndex,
  apartmentId: string | null,
  fallbackTower: TowerType | null,
) {
  if (!apartmentId) {
    return null;
  }

  const tower = inferTowerFromApartmentId(apartmentId, fallbackTower);
  const towerIndex = apartmentIndex.get(tower);

  if (!towerIndex) {
    return null;
  }

  const candidates = buildFlatCandidates(apartmentId, fallbackTower);

  for (const candidate of candidates) {
    const apartment = towerIndex.get(candidate);

    if (apartment) {
      return apartment;
    }
  }

  return null;
}

function getStatusMeta(
  status: InventoryStatus | null | undefined,
  inventoryState: InventoryLoadState,
  inventoryError: string | null,
) {
  if (status === "Available") {
    return {
      badgeClassName:
        "border-emerald-300/35 bg-emerald-400/12 text-emerald-100 shadow-[0_0_24px_rgba(52,211,153,0.16)]",
      dotClassName: "bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.95)]",
      label: "Available",
    };
  }

  if (status === "Reserved") {
    return {
      badgeClassName:
        "border-amber-300/35 bg-amber-300/14 text-amber-50 shadow-[0_0_24px_rgba(251,191,36,0.16)]",
      dotClassName: "bg-amber-300 shadow-[0_0_14px_rgba(252,211,77,0.95)]",
      label: "Reserved",
    };
  }

  if (status === "Sold") {
    return {
      badgeClassName:
        "border-rose-300/35 bg-rose-400/14 text-rose-50 shadow-[0_0_24px_rgba(251,113,133,0.18)]",
      dotClassName: "bg-rose-300 shadow-[0_0_14px_rgba(253,164,175,0.95)]",
      label: "Sold",
    };
  }

  if (inventoryState === "loading") {
    return {
      badgeClassName:
        "border-sky-200/30 bg-sky-300/12 text-sky-50 shadow-[0_0_24px_rgba(125,211,252,0.14)]",
      dotClassName: "bg-sky-200 shadow-[0_0_14px_rgba(186,230,253,0.95)]",
      label: "Syncing",
    };
  }

  if (inventoryError) {
    return {
      badgeClassName:
        "border-white/20 bg-white/8 text-white/90 shadow-[0_0_20px_rgba(148,163,184,0.12)]",
      dotClassName: "bg-white/70 shadow-[0_0_12px_rgba(255,255,255,0.65)]",
      label: "Offline",
    };
  }

  return {
    badgeClassName:
      "border-white/20 bg-white/8 text-white/90 shadow-[0_0_20px_rgba(148,163,184,0.12)]",
    dotClassName: "bg-white/70 shadow-[0_0_12px_rgba(255,255,255,0.65)]",
    label: "Unmapped",
  };
}

type ApartmentHighlightMode = "filter" | "hover";

type ApartmentHighlightPalette = {
  fill: string;
  fillOpacity: number;
  innerEdge: string;
  outerEdge: string;
};

function getApartmentHighlightPalette(
  status: InventoryStatus | null | undefined,
  mode: ApartmentHighlightMode,
): ApartmentHighlightPalette {
  if (status === "Sold") {
    return {
      fill: "#fb7185",
      fillOpacity: mode === "hover" ? 0.18 : 0.2,
      innerEdge: "#f43f5e",
      outerEdge: "#ffe4e6",
    };
  }

  if (status === "Reserved") {
    return {
      fill: "#facc15",
      fillOpacity: mode === "hover" ? 0.18 : 0.2,
      innerEdge: "#f59e0b",
      outerEdge: "#fef3c7",
    };
  }

  if (mode === "hover") {
    return {
      fill: "#ffffff",
      fillOpacity: 0.16,
      innerEdge: "#d1d5db",
      outerEdge: "#ffffff",
    };
  }

  return {
    fill: "#86efac",
    fillOpacity: 0.22,
    innerEdge: "#4ade80",
    outerEdge: "#f0fdf4",
  };
}

function prepareTowerScene(
  sourceScene: Object3D,
  showDebugModel: boolean,
  interactionSceneSource: Object3D = sourceScene,
  forcedTowerCode: TowerCode = "A",
) {
  const trackingScene = cloneSkeleton(sourceScene) as Group;
  const scene = cloneSkeleton(interactionSceneSource) as Group;
  const modelTowerDummies = collectModelTowerDummies(trackingScene);
  const apartments = new Map<string, HoverMeshData[]>();
  const pickableMeshes: Mesh[] = [];
  const towerBounds = new Map<TowerCode, Box3>();

  scene.updateWorldMatrix(true, true);
  trackingScene.updateWorldMatrix(true, true);

  scene.traverse((object) => {
    if (!(object instanceof Mesh)) {
      return;
    }

    object.visible = true;
    object.frustumCulled = true;

    const towerCode = forcedTowerCode;
    const shouldShowDebugMaterial = showDebugModel && towerCode === "A";
    object.material = getProxyMaterials(object.material, shouldShowDebugMaterial);

    if (towerCode) {
      if (!object.geometry.boundingBox) {
        object.geometry.computeBoundingBox();
      }

      if (object.geometry.boundingBox) {
        const nextBounds = object.geometry.boundingBox
          .clone()
          .applyMatrix4(object.matrixWorld);
        const existingBounds = towerBounds.get(towerCode);

        if (existingBounds) {
          existingBounds.union(nextBounds);
        } else {
          towerBounds.set(towerCode, nextBounds);
        }
      }
    }

    const apartmentId = resolveApartmentIdFromObject(object);
    const normalizedApartmentId =
      apartmentId && forcedTowerCode
        ? apartmentId.replace(/^Tower_[AB]_/, `Tower_${forcedTowerCode}_`)
        : apartmentId;

    if (!normalizedApartmentId) {
      return;
    }

    object.userData.apartmentId = normalizedApartmentId;
    pickableMeshes.push(object);

    const meshEntry = apartments.get(normalizedApartmentId) ?? [];
    meshEntry.push({
      geometry: object.geometry,
      key: object.uuid,
      matrix: object.matrixWorld.clone(),
    });
    apartments.set(normalizedApartmentId, meshEntry);
  });

  const bounds = new Box3().setFromObject(trackingScene);
  const size = bounds.getSize(new Vector3());
  const center = bounds.getCenter(new Vector3());
  const scale = TARGET_MODEL_HEIGHT / Math.max(size.y, 1);
  const offset = [-center.x, -bounds.min.y, -center.z] as [number, number, number];
  const towerFootprints: Partial<Record<TowerCode, TowerFootprint>> =
    getTowerFootprintsFromModelDummies(scene, offset, scale, false, true, forcedTowerCode);
  const trackedTowerFootprints: Partial<Record<TowerCode, TowerFootprint>> =
    getTowerFootprintsFromModelDummies(
      scene,
      offset,
      scale,
      false,
      false,
      forcedTowerCode,
    );

  towerBounds.forEach((towerBoundsEntry, towerCode) => {
    towerFootprints[towerCode] ??= buildTowerFootprint(
      towerBoundsEntry,
      offset,
      scale,
    );
    trackedTowerFootprints[towerCode] ??= buildTowerFootprint(
      towerBoundsEntry,
      offset,
      scale,
    );
  });

  return {
    apartments,
    debugTarget: new Vector3(0, size.y * 0.32 * scale, 0),
    modelTowerDummies,
    offset,
    pickableMeshes,
    scaledHeight: size.y * scale,
    scene,
    scale,
    trackedTowerFootprints,
    towerFootprints,
  } satisfies PreparedTowerModel;
}

function getPreparedTowerScene(
  sourceScene: Object3D,
  showDebugModel: boolean,
  interactionSceneSource: Object3D = sourceScene,
  forcedTowerCode: TowerCode = "A",
) {
  const cacheKey = [
    sourceScene.uuid,
    interactionSceneSource.uuid,
    forcedTowerCode,
    showDebugModel ? "debug" : "standard",
  ].join(":");
  const cachedPreparedTower = PREPARED_TOWER_CACHE.get(cacheKey);

  if (cachedPreparedTower) {
    return cachedPreparedTower;
  }

  const preparedTower = prepareTowerScene(
    sourceScene,
    showDebugModel,
    interactionSceneSource,
    forcedTowerCode,
  );

  PREPARED_TOWER_CACHE.set(cacheKey, preparedTower);
  return preparedTower;
}

function LoadingState() {
  return (
    <Html center>
      <div className="rounded-full border border-white/30 bg-slate-950/88 px-4 py-2 text-xs font-medium uppercase tracking-[0.28em] text-white shadow-[0_12px_48px_rgba(15,23,42,0.28)]">
        Loading hover map
      </div>
    </Html>
  );
}

const HighlightEdgeLines = memo(function HighlightEdgeLines({
  color,
  geometry,
  matrix,
  scaleMultiplier = 1,
  renderOrder,
  thickness = 1,
}: {
  color: string;
  geometry: Mesh["geometry"];
  matrix: Matrix4;
  scaleMultiplier?: number;
  renderOrder: number;
  thickness?: number;
}) {
  const edgesGeometry = useMemo(
    () => getHighlightEdgesGeometry(geometry),
    [geometry],
  );
  const renderMatrix = useMemo(
    () =>
      scaleMultiplier === 1
        ? matrix
        : getExpandedHighlightMatrix(matrix, scaleMultiplier),
    [matrix, scaleMultiplier],
  );

  return (
    <lineSegments
      frustumCulled={false}
      geometry={edgesGeometry}
      matrix={renderMatrix}
      matrixAutoUpdate={false}
      raycast={() => null}
      renderOrder={renderOrder}
    >
      <lineBasicMaterial
        color={color}
        depthTest={false}
        linewidth={thickness}
        toneMapped={false}
      />
    </lineSegments>
  );
});

const HighlightOverlay = memo(function HighlightOverlay({
  filteredApartmentIds,
  getApartmentStatus,
  hoveredApartmentId,
  apartments,
  selectedApartmentId,
  simplifyFilteredVisuals,
}: {
  filteredApartmentIds: Set<string>;
  getApartmentStatus: (
    apartmentId: string | null,
  ) => InventoryStatus | null | undefined;
  hoveredApartmentId: string | null;
  apartments: PreparedTowerModel["apartments"];
  selectedApartmentId: string | null;
  simplifyFilteredVisuals: boolean;
}) {
  const hoveredMeshes = useMemo(() => {
    if (!hoveredApartmentId || hoveredApartmentId === selectedApartmentId) {
      return [];
    }

    const palette = getApartmentHighlightPalette(
      getApartmentStatus(hoveredApartmentId),
      "hover",
    );

    return (apartments.get(hoveredApartmentId) ?? []).map((meshData) => ({
      meshData,
      palette,
    }));
  }, [apartments, getApartmentStatus, hoveredApartmentId, selectedApartmentId]);
  const selectedMeshes = useMemo(() => {
    if (!selectedApartmentId) {
      return [];
    }

    const palette = getApartmentHighlightPalette(
      getApartmentStatus(selectedApartmentId),
      "filter",
    );

    return (apartments.get(selectedApartmentId) ?? []).map((meshData) => ({
      meshData,
      palette: {
        ...palette,
        fillOpacity: Math.min(palette.fillOpacity + 0.08, 0.3),
      },
    }));
  }, [apartments, getApartmentStatus, selectedApartmentId]);
  const filteredMeshes = useMemo(() => {
    const next: Array<{
      meshData: HoverMeshData;
      palette: ApartmentHighlightPalette;
    }> = [];

    filteredApartmentIds.forEach((apartmentId) => {
      if (
        apartmentId === hoveredApartmentId ||
        apartmentId === selectedApartmentId
      ) {
        return;
      }

      const apartmentMeshes = apartments.get(apartmentId);
      const palette = getApartmentHighlightPalette(
        getApartmentStatus(apartmentId),
        "filter",
      );

      if (apartmentMeshes?.length) {
        apartmentMeshes.forEach((meshData) => {
          next.push({
            meshData,
            palette,
          });
        });
      }
    });

    return next;
  }, [
    apartments,
    filteredApartmentIds,
    getApartmentStatus,
    hoveredApartmentId,
    selectedApartmentId,
  ]);
  const shouldSimplifyFilteredEdges =
    simplifyFilteredVisuals ||
    filteredMeshes.length >= FILTER_HIGHLIGHT_EDGE_SIMPLIFY_THRESHOLD;

  if (
    !hoveredMeshes.length &&
    !selectedMeshes.length &&
    filteredMeshes.length === 0
  ) {
    return null;
  }

  return (
    <group>
      {filteredMeshes.map((meshData) => (
        <group key={`filter-${meshData.meshData.key}`}>
          <mesh
            frustumCulled={false}
            geometry={meshData.meshData.geometry}
            matrix={meshData.meshData.matrix}
            matrixAutoUpdate={false}
            raycast={() => null}
            renderOrder={10}
          >
            <meshBasicMaterial
              color={meshData.palette.fill}
              depthTest={false}
              depthWrite={false}
              opacity={meshData.palette.fillOpacity}
              side={DoubleSide}
              toneMapped={false}
              transparent
            />
          </mesh>
          <HighlightEdgeLines
            color={meshData.palette.innerEdge}
            geometry={meshData.meshData.geometry}
            matrix={meshData.meshData.matrix}
            renderOrder={11}
            scaleMultiplier={1.006}
            thickness={2}
          />
          {!shouldSimplifyFilteredEdges ? (
            <HighlightEdgeLines
              color={meshData.palette.outerEdge}
              geometry={meshData.meshData.geometry}
              matrix={meshData.meshData.matrix}
              renderOrder={12}
              thickness={3}
            />
          ) : null}
        </group>
      ))}

      {selectedMeshes.map((meshData) => (
        <group key={`selected-${meshData.meshData.key}`}>
          <mesh
            frustumCulled={false}
            geometry={meshData.meshData.geometry}
            matrix={meshData.meshData.matrix}
            matrixAutoUpdate={false}
            raycast={() => null}
            renderOrder={14}
          >
            <meshBasicMaterial
              color={meshData.palette.fill}
              depthTest={false}
              depthWrite={false}
              opacity={meshData.palette.fillOpacity}
              side={DoubleSide}
              toneMapped={false}
              transparent
            />
          </mesh>
          <HighlightEdgeLines
            color={meshData.palette.innerEdge}
            geometry={meshData.meshData.geometry}
            matrix={meshData.meshData.matrix}
            renderOrder={15}
            scaleMultiplier={1.008}
            thickness={2}
          />
          <HighlightEdgeLines
            color={meshData.palette.outerEdge}
            geometry={meshData.meshData.geometry}
            matrix={meshData.meshData.matrix}
            renderOrder={16}
            thickness={4}
          />
        </group>
      ))}

      {hoveredMeshes.map((meshData) => (
        <group key={`hover-${meshData.meshData.key}`}>
          <mesh
            frustumCulled={false}
            geometry={meshData.meshData.geometry}
            matrix={meshData.meshData.matrix}
            matrixAutoUpdate={false}
            raycast={() => null}
            renderOrder={12}
          >
            <meshBasicMaterial
              color={meshData.palette.fill}
              depthTest={false}
              depthWrite={false}
              opacity={meshData.palette.fillOpacity}
              side={DoubleSide}
              toneMapped={false}
              transparent
            />
          </mesh>
          <HighlightEdgeLines
            color={meshData.palette.innerEdge}
            geometry={meshData.meshData.geometry}
            matrix={meshData.meshData.matrix}
            renderOrder={13}
            scaleMultiplier={1.008}
            thickness={2}
          />
          <HighlightEdgeLines
            color={meshData.palette.outerEdge}
            geometry={meshData.meshData.geometry}
            matrix={meshData.meshData.matrix}
            renderOrder={14}
            thickness={4}
          />
        </group>
      ))}
    </group>
  );
});

const HoverTracker = memo(function HoverTracker({
  allowHover,
  onHoverChange,
  pickableMeshes,
}: {
  allowHover: boolean;
  onHoverChange: (
    apartmentId: string | null,
    pointerPosition: PointerPosition | null,
  ) => void;
  pickableMeshes: Mesh[];
}) {
  const { camera, gl, raycaster } = useThree();

  useEffect(() => {
    const element = gl.domElement;
    const pointer = new Vector2();
    const worldNormal = new Vector3();
    let frameId = 0;
    let latestClientX = 0;
    let latestClientY = 0;
    let latestButtons = 0;
    let latestOffsetX = 0;
    let latestOffsetY = 0;

    const updateHover = (
      apartmentId: string | null,
      pointerPosition: PointerPosition | null,
    ) => {
      onHoverChange(apartmentId, pointerPosition);
    };

    if (!allowHover || pickableMeshes.length === 0) {
      updateHover(null, null);
      return;
    }

    const processPointerMove = () => {
      frameId = 0;

      if (latestButtons !== 0) {
        updateHover(null, null);
        return;
      }

      const pointerPosition = {
        x: latestClientX,
        y: latestClientY,
      };

      if (element.clientWidth <= 0 || element.clientHeight <= 0) {
        updateHover(null, null);
        return;
      }

      pointer.x = (latestOffsetX / element.clientWidth) * 2 - 1;
      pointer.y = -(latestOffsetY / element.clientHeight) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);

      const intersections = raycaster.intersectObjects(pickableMeshes, false);
      const frontFacingHit = intersections.find((intersection) => {
        const apartmentId = intersection.object.userData.apartmentId as
          | string
          | undefined;

        if (!apartmentId) {
          return false;
        }

        if (!intersection.face) {
          return true;
        }

        worldNormal
          .copy(intersection.face.normal)
          .transformDirection(intersection.object.matrixWorld);

        return worldNormal.dot(raycaster.ray.direction) <= -0.02;
      });

      const fallbackHit = intersections.find(
        (intersection) =>
          typeof intersection.object.userData.apartmentId === "string",
      );

      const hit = frontFacingHit ?? fallbackHit ?? null;

      updateHover(
        (hit?.object.userData.apartmentId as string | undefined) ?? null,
        pointerPosition,
      );
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!event.isPrimary || event.pointerType === "touch") {
        return;
      }

      latestClientX = event.clientX;
      latestClientY = event.clientY;
      latestButtons = event.buttons;
      latestOffsetX = event.offsetX;
      latestOffsetY = event.offsetY;

      if (frameId !== 0) {
        return;
      }

      frameId = window.requestAnimationFrame(processPointerMove);
    };

    const handlePointerLeave = () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      }

      updateHover(null, null);
    };

    element.addEventListener("pointermove", handlePointerMove);
    element.addEventListener("pointerleave", handlePointerLeave);
    element.addEventListener("pointercancel", handlePointerLeave);

    return () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }

      element.removeEventListener("pointermove", handlePointerMove);
      element.removeEventListener("pointerleave", handlePointerLeave);
      element.removeEventListener("pointercancel", handlePointerLeave);
    };
  }, [allowHover, camera, gl, onHoverChange, pickableMeshes, raycaster]);

  return null;
});

function TrackingDebugOverlay({
  currentViewLabel,
  rays,
  points,
}: {
  currentViewLabel: string;
  rays: TrackingCameraRay[];
  points: TrackingDebugPoint[];
}) {
  if (points.length === 0 && rays.length === 0) {
    return null;
  }

  return (
    <group>
      {rays.map((ray) => (
        <group key={ray.key}>
          <Line
            color={ray.color}
            depthTest={false}
            lineWidth={1.6}
            opacity={0.9}
            points={[ray.start, ray.end]}
            transparent
          />
          <mesh position={ray.start.toArray()} renderOrder={38}>
            <sphereGeometry args={[0.11, 16, 16]} />
            <meshBasicMaterial color={ray.color} depthTest={false} toneMapped={false} />
          </mesh>
          <Html
            center
            distanceFactor={10}
            position={ray.end.toArray()}
            style={{ pointerEvents: "none" }}
            transform
          >
            <div
              className="rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-white shadow-[0_8px_24px_rgba(2,6,23,0.35)]"
              style={{ background: "rgba(14, 165, 233, 0.88)" }}
            >
              {ray.label}
            </div>
          </Html>
        </group>
      ))}

      {points.map((point) => (
        <group key={point.key} position={point.position.toArray()}>
          <mesh renderOrder={40}>
            <sphereGeometry args={[0.16, 24, 24]} />
            <meshBasicMaterial
              color={point.color}
              depthTest={false}
              toneMapped={false}
            />
          </mesh>
          <Html
            center
            distanceFactor={8}
            position={[0, 0.48, 0]}
            style={{ pointerEvents: "none" }}
            transform
          >
            <div
              className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white shadow-[0_10px_28px_rgba(2,6,23,0.3)]"
              style={{ background: point.color }}
            >
              {point.label}
            </div>
          </Html>
        </group>
      ))}

      <Html
        center
        position={[0, 8, 0]}
        style={{ pointerEvents: "none" }}
        transform
      >
        <div className="rounded-full border border-red-300/60 bg-black/72 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-red-100 shadow-[0_12px_32px_rgba(0,0,0,0.3)]">
          {currentViewLabel}
        </div>
      </Html>
    </group>
  );
}

const TowerScene = memo(function TowerScene({
  apartments,
  currentFrame,
  filteredApartments,
  getApartmentStatus,
  onInvalidateReady,
  onPointerSelectionReady,
  allowHover,
  onApartmentHover,
  rotationProgressRef,
  selectedApartmentId,
  selectedTower,
  simplifyFilteredVisuals,
  showApartmentMeshes,
  showTowerMeshes,
  showTrackingDebug,
}: {
  apartments: InventoryApartment[];
  currentFrame: number;
  filteredApartments: InventoryApartment[];
  getApartmentStatus: (
    apartmentId: string | null,
  ) => InventoryStatus | null | undefined;
  onInvalidateReady?: (invalidateCanvas: () => void) => void;
  onPointerSelectionReady?: (
    pickApartmentAtClientPoint: (clientX: number, clientY: number) => string | null,
  ) => void;
  allowHover: boolean;
  onApartmentHover: (
    apartmentId: string | null,
    pointerPosition: PointerPosition | null,
  ) => void;
  rotationProgressRef: MutableRefObject<number>;
  selectedApartmentId: string | null;
  selectedTower: TowerType | null;
  simplifyFilteredVisuals: boolean;
  showApartmentMeshes: boolean;
  showTowerMeshes: boolean;
  showTrackingDebug: boolean;
}) {
  const { camera, gl, invalidate, raycaster } = useThree();
  const towerAGltf = useGLTF(MODEL_PATH_A);
  const towerBGltf = useGLTF(MODEL_PATH_B);
  const towerAInteractionGltf = useGLTF(INTERACTION_MODEL_PATH_A);
  const towerBInteractionGltf = useGLTF(INTERACTION_MODEL_PATH_B);
  const cameraRef = useRef<ThreePerspectiveCamera | null>(null);
  const fallbackGroupRef = useRef<Group | null>(null);
  const hoveredApartmentIdRef = useRef<string | null>(null);
  const trackingDebugLoggedRef = useRef(false);
  const [hoveredApartmentId, setHoveredApartmentId] = useState<string | null>(
    null,
  );
  const activeTowerCode = towerTypeToCode(selectedTower) ?? "A";
  const preparedTowerA = useMemo(
    () =>
      getPreparedTowerScene(
        towerAGltf.scene,
        false,
        towerAInteractionGltf.scene,
        "A",
      ),
    [towerAGltf.scene, towerAInteractionGltf.scene],
  );
  const preparedTowerB = useMemo(
    () =>
      getPreparedTowerScene(
        towerBGltf.scene,
        false,
        towerBInteractionGltf.scene,
        "B",
      ),
    [towerBGltf.scene, towerBInteractionGltf.scene],
  );
  const primaryPreparedModel =
    activeTowerCode === "B" ? preparedTowerB : preparedTowerA;
  const cameraTargetY = primaryPreparedModel.scaledHeight * 0.52;
  const trackingFrameInfo = useMemo(
    () => getNearestSnapFrameInfo(currentFrame),
    [currentFrame],
  );
  const towerATrackingTransforms = useMemo(
    () =>
      getTowerTrackingTransforms(
        preparedTowerA.trackedTowerFootprints.A ?? null,
        "A",
      ),
    [preparedTowerA.trackedTowerFootprints],
  );
  const towerBTrackingTransforms = useMemo(
    () =>
      getTowerTrackingTransforms(
        preparedTowerB.trackedTowerFootprints.B ?? null,
        "B",
      ),
    [preparedTowerB.trackedTowerFootprints],
  );
  const trackingCameraPath = useMemo(
    () =>
      towerATrackingTransforms.length > 0 || towerBTrackingTransforms.length > 0
        ? getTowerTrackingCameraPath(TRACKING_VIDEO_ASPECT)
        : [],
    [towerATrackingTransforms.length, towerBTrackingTransforms.length],
  );
  const trackingSnapshots = useMemo(
    () =>
      TOWER_A_TRACKING_KEYS.map((key, index) => ({
        cameraView: trackingCameraPath[index] ?? null,
        key,
        towerATransform:
          towerATrackingTransforms[index] ?? towerATrackingTransforms[0] ?? null,
        towerBTransform:
          towerBTrackingTransforms[index] ?? towerBTrackingTransforms[0] ?? null,
      })),
    [trackingCameraPath, towerATrackingTransforms, towerBTrackingTransforms],
  );
  const currentTrackingSnapshot =
    trackingSnapshots[trackingFrameInfo.index] ?? trackingSnapshots[0] ?? null;
  const currentTrackingKey =
    currentTrackingSnapshot?.key ?? TOWER_A_TRACKING_KEYS[0];
  const towerATrackingTransform = currentTrackingSnapshot?.towerATransform ?? null;
  const towerBTrackingTransform = currentTrackingSnapshot?.towerBTransform ?? null;
  const towerTrackingTransform =
    activeTowerCode === "B" ? towerBTrackingTransform : towerATrackingTransform;
  const trackingCameraView = currentTrackingSnapshot?.cameraView ?? null;
  const unrealTowerDummies = useMemo(
    () =>
      showTrackingDebug
        ? getUnrealTowerFootprintInThreeSpace(activeTowerCode, currentTrackingKey)
        : null,
    [activeTowerCode, currentTrackingKey, showTrackingDebug],
  );
  const transformedTrackedTowerDummies = useMemo(
    () =>
      showTrackingDebug
        ? transformTowerFootprint(
            primaryPreparedModel.trackedTowerFootprints[activeTowerCode],
            towerTrackingTransform,
          )
        : null,
    [
      activeTowerCode,
      primaryPreparedModel.trackedTowerFootprints,
      showTrackingDebug,
      towerTrackingTransform,
    ],
  );
  const combinedApartments = useMemo(() => {
    const next = new Map<string, HoverMeshData[]>();

    preparedTowerA.apartments.forEach((value, key) => {
      next.set(key, value);
    });
    preparedTowerB.apartments.forEach((value, key) => {
      next.set(key, value);
    });

    return next;
  }, [preparedTowerA.apartments, preparedTowerB.apartments]);
  const activeApartments = useMemo(() => {
    if (selectedTower === "Tower A") {
      return preparedTowerA.apartments;
    }

    if (selectedTower === "Tower B") {
      return preparedTowerB.apartments;
    }

    return combinedApartments;
  }, [
    combinedApartments,
    preparedTowerA.apartments,
    preparedTowerB.apartments,
    selectedTower,
  ]);
  const activeHotspot = useMemo(
    () => getNearestMasterPlanHotspot(currentFrame),
    [currentFrame],
  );
  const apartmentIndex = useMemo(
    () => buildInventoryApartmentIndex(apartments),
    [apartments],
  );
  const allowedApartmentIds = useMemo(
    () =>
      new Set(
        Array.from(activeApartments.keys()).filter((apartmentId) =>
          isApartmentIdAllowedAtHotspot(apartmentId, activeHotspot, selectedTower),
        ),
      ),
    [activeApartments, activeHotspot, selectedTower],
  );
  const inventoryBackedApartmentIds = useMemo(
    () =>
      new Set(
        Array.from(allowedApartmentIds).filter((apartmentId) => {
          const inventoryApartment = findInventoryApartmentInIndex(
            apartmentIndex,
            apartmentId,
            selectedTower,
          );

          return Boolean(inventoryApartment && inventoryApartment.floor > 0);
        }),
      ),
    [allowedApartmentIds, apartmentIndex, selectedTower],
  );
  const activeApartmentTokenLookup = useMemo(
    () => buildApartmentTokenLookup(inventoryBackedApartmentIds),
    [inventoryBackedApartmentIds],
  );
  const combinedPickableMeshes = useMemo(
    () => [...preparedTowerA.pickableMeshes, ...preparedTowerB.pickableMeshes],
    [preparedTowerA.pickableMeshes, preparedTowerB.pickableMeshes],
  );
  const hoverPickableMeshes = useMemo(() => {
    if (selectedTower === "Tower A") {
      return preparedTowerA.pickableMeshes;
    }

    if (selectedTower === "Tower B") {
      return preparedTowerB.pickableMeshes;
    }

    return combinedPickableMeshes;
  }, [
    combinedPickableMeshes,
    preparedTowerA.pickableMeshes,
    preparedTowerB.pickableMeshes,
    selectedTower,
  ]);
  const hotspotScopedPickableMeshes = useMemo(
    () =>
      hoverPickableMeshes.filter((mesh) => {
        const apartmentId =
          (mesh.userData.apartmentId as string | undefined) ??
          resolveApartmentIdFromObject(mesh);

        return apartmentId ? inventoryBackedApartmentIds.has(apartmentId) : false;
      }),
    [hoverPickableMeshes, inventoryBackedApartmentIds],
  );
  const filteredApartmentIds = useMemo(() => {
    if (
      !showApartmentMeshes ||
      activeApartmentTokenLookup.size === 0 ||
      filteredApartments.length === 0
    ) {
      return new Set<string>();
    }

    const nextApartmentIds = new Set<string>();

    filteredApartments.forEach((apartment) => {
      if (selectedTower && apartment.tower !== selectedTower) {
        return;
      }

      const towerLookup = activeApartmentTokenLookup.get(apartment.tower);

      if (!towerLookup) {
        return;
      }

      [normalizeFlatToken(apartment.flatNumber), normalizeFlatToken(apartment.title)]
        .filter(Boolean)
        .forEach((token) => {
          towerLookup.get(token)?.forEach((apartmentId) => {
            nextApartmentIds.add(apartmentId);
          });
        });
    });

    return nextApartmentIds;
  }, [
    activeApartmentTokenLookup,
    filteredApartments,
    selectedTower,
    showApartmentMeshes,
  ]);
  const towerDebugPoints = useMemo(() => {
    if (!showTrackingDebug) {
      return [];
    }

    const activeFootprint = primaryPreparedModel.towerFootprints[activeTowerCode];

    if (towerTrackingTransform && transformedTrackedTowerDummies && unrealTowerDummies) {
      return [
        ...getTrackingDebugPoints(
          transformedTrackedTowerDummies,
          "rgba(245, 158, 11, 0.95)",
          "Model ",
        ),
        ...getTrackingDebugPoints(
          unrealTowerDummies,
          "rgba(14, 165, 233, 0.95)",
          "Track ",
        ),
      ];
    }

    return getTrackingDebugPoints(activeFootprint);
  }, [
    activeTowerCode,
    primaryPreparedModel.towerFootprints,
    showTrackingDebug,
    towerTrackingTransform,
    transformedTrackedTowerDummies,
    unrealTowerDummies,
  ]);
  const trackingCameraRays = useMemo(
    () => getTrackingCameraRays(trackingCameraPath),
    [trackingCameraPath],
  );
  const pickApartmentAtClientPoint = useCallback(
    (clientX: number, clientY: number) => {
      if (hotspotScopedPickableMeshes.length === 0) {
        return null;
      }

      const rect = gl.domElement.getBoundingClientRect();

      if (rect.width <= 0 || rect.height <= 0) {
        return null;
      }

      const pointer = new Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      const worldNormal = new Vector3();

      raycaster.setFromCamera(pointer, cameraRef.current ?? camera);

      const intersections = raycaster.intersectObjects(
        hotspotScopedPickableMeshes,
        false,
      );
      const frontFacingHit = intersections.find((intersection) => {
        const apartmentId = intersection.object.userData.apartmentId as
          | string
          | undefined;

        if (!apartmentId) {
          return false;
        }

        if (!intersection.face) {
          return true;
        }

        worldNormal
          .copy(intersection.face.normal)
          .transformDirection(intersection.object.matrixWorld);

        return worldNormal.dot(raycaster.ray.direction) <= -0.02;
      });
      const fallbackHit = intersections.find(
        (intersection) =>
          typeof intersection.object.userData.apartmentId === "string",
      );

      return (
        (frontFacingHit?.object.userData.apartmentId as string | undefined) ??
        (fallbackHit?.object.userData.apartmentId as string | undefined) ??
        null
      );
    },
    [camera, gl, hotspotScopedPickableMeshes, raycaster],
  );

  useEffect(() => {
    onPointerSelectionReady?.(pickApartmentAtClientPoint);
  }, [onPointerSelectionReady, pickApartmentAtClientPoint]);

  useEffect(() => {
    if (!showTrackingDebug) {
      trackingDebugLoggedRef.current = false;
      return;
    }

    if (
      trackingDebugLoggedRef.current ||
      !transformedTrackedTowerDummies ||
      !unrealTowerDummies
    ) {
      return;
    }

    console.groupCollapsed(`Tower ${activeTowerCode} tracking debug`);
    console.table({
      modelTa1: vectorToDebugRow(transformedTrackedTowerDummies.ta1),
      modelTa2: vectorToDebugRow(transformedTrackedTowerDummies.ta2),
      modelTa3: vectorToDebugRow(transformedTrackedTowerDummies.ta3),
      modelTa4: vectorToDebugRow(transformedTrackedTowerDummies.ta4),
      unrealTa1: vectorToDebugRow(unrealTowerDummies.ta1),
      unrealTa2: vectorToDebugRow(unrealTowerDummies.ta2),
      unrealTa3: vectorToDebugRow(unrealTowerDummies.ta3),
      unrealTa4: vectorToDebugRow(unrealTowerDummies.ta4),
    });
    console.groupEnd();
    trackingDebugLoggedRef.current = true;
  }, [activeTowerCode, showTrackingDebug, transformedTrackedTowerDummies, unrealTowerDummies]);
  const trackingViewLabel = useMemo(() => {
    if (!trackingCameraPath.length) {
      return `Tower ${activeTowerCode} Tracking`;
    }

    return `Tower ${activeTowerCode} ${trackingCameraView?.key ?? currentTrackingKey}`;
  }, [activeTowerCode, currentTrackingKey, trackingCameraPath.length, trackingCameraView?.key]);
  const fallbackScenePosition = BASE_MODEL_OFFSET;
  const trackedScenePosition: [number, number, number] = [0, 0, 0];
  const shouldShowSelectedApartment = selectedApartmentId !== null;
  const shouldRenderTowerProxies =
    showTowerMeshes || showTrackingDebug || shouldShowSelectedApartment;
  const hotspotHoveredApartmentId = useMemo(
    () =>
      hoveredApartmentId &&
      isApartmentIdAllowedAtHotspot(
        hoveredApartmentId,
        activeHotspot,
        selectedTower,
      )
        ? hoveredApartmentId
        : null,
    [activeHotspot, hoveredApartmentId, selectedTower],
  );
  const activeHoveredApartmentId =
    allowHover ? hotspotHoveredApartmentId : null;
  const shouldShowHighlightOverlay =
    (showApartmentMeshes || shouldShowSelectedApartment) &&
    (
      activeHoveredApartmentId !== null ||
      filteredApartmentIds.size > 0 ||
      shouldShowSelectedApartment
    );

  useEffect(() => {
    onInvalidateReady?.(invalidate);
  }, [invalidate, onInvalidateReady]);

  const handleSceneHover = useCallback(
    (apartmentId: string | null, pointerPosition: PointerPosition | null) => {
      if (hoveredApartmentIdRef.current !== apartmentId) {
        hoveredApartmentIdRef.current = apartmentId;
        setHoveredApartmentId(apartmentId);
      }

      onApartmentHover(apartmentId, pointerPosition);
    },
    [onApartmentHover],
  );

  useEffect(() => {
    const camera = cameraRef.current;

    if (!camera || !trackingCameraView) {
      return;
    }

    if (Math.abs(camera.fov - trackingCameraView.fov) > 0.001) {
      camera.fov = trackingCameraView.fov;
      camera.updateProjectionMatrix();
    }

    camera.position.copy(trackingCameraView.position);
    camera.quaternion.copy(trackingCameraView.quaternion);
    invalidate();
  }, [invalidate, trackingCameraView]);

  useFrame(() => {
    const camera = cameraRef.current;

    if (!camera) {
      return;
    }

    if (trackingCameraPath.length) {
      return;
    }

    camera.position.set(...BASE_CAMERA_POSITION);
    camera.lookAt(
      fallbackScenePosition[0],
      cameraTargetY + fallbackScenePosition[1],
      fallbackScenePosition[2],
    );

    if (fallbackGroupRef.current) {
      fallbackGroupRef.current.rotation.y = getProgressRotation(
        rotationProgressRef.current,
      );
    }
  });

  return (
    <>
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        far={trackingCameraPath.length ? 100000 : 400}
        fov={34}
        near={0.01}
        position={BASE_CAMERA_POSITION}
      />

      <ambientLight intensity={1.75} />
      <directionalLight color="#fff7d8" intensity={2.85} position={[12, 16, 8]} />
      <directionalLight color="#d9ecff" intensity={1.2} position={[-10, 10, -10]} />
      {shouldRenderTowerProxies && towerATrackingTransform ? (
        <group
          position={towerATrackingTransform.position.toArray()}
          quaternion={towerATrackingTransform.quaternion.toArray()}
          scale={towerATrackingTransform.scale}
        >
          <group position={trackedScenePosition} scale={preparedTowerA.scale}>
            <group position={preparedTowerA.offset}>
              <primitive object={preparedTowerA.scene} />
              {shouldShowHighlightOverlay ? (
                <HighlightOverlay
                  apartments={preparedTowerA.apartments}
                  filteredApartmentIds={filteredApartmentIds}
                  getApartmentStatus={getApartmentStatus}
                  hoveredApartmentId={activeHoveredApartmentId}
                  selectedApartmentId={selectedApartmentId}
                  simplifyFilteredVisuals={simplifyFilteredVisuals}
                />
              ) : null}
            </group>
          </group>
        </group>
      ) : null}
      {shouldRenderTowerProxies && towerBTrackingTransform ? (
        <group
          position={towerBTrackingTransform.position.toArray()}
          quaternion={towerBTrackingTransform.quaternion.toArray()}
          scale={towerBTrackingTransform.scale}
        >
          <group position={trackedScenePosition} scale={preparedTowerB.scale}>
            <group position={preparedTowerB.offset}>
              <primitive object={preparedTowerB.scene} />
              {shouldShowHighlightOverlay ? (
                <HighlightOverlay
                  apartments={preparedTowerB.apartments}
                  filteredApartmentIds={filteredApartmentIds}
                  getApartmentStatus={getApartmentStatus}
                  hoveredApartmentId={activeHoveredApartmentId}
                  selectedApartmentId={selectedApartmentId}
                  simplifyFilteredVisuals={simplifyFilteredVisuals}
                />
              ) : null}
            </group>
          </group>
        </group>
      ) : null}
      {shouldRenderTowerProxies && !towerATrackingTransform && !towerBTrackingTransform ? (
        <group
          ref={fallbackGroupRef}
          position={fallbackScenePosition}
          scale={primaryPreparedModel.scale}
        >
          <group position={primaryPreparedModel.offset}>
            <primitive object={primaryPreparedModel.scene} />
            {shouldShowHighlightOverlay ? (
              <HighlightOverlay
                apartments={primaryPreparedModel.apartments}
                filteredApartmentIds={filteredApartmentIds}
                getApartmentStatus={getApartmentStatus}
                hoveredApartmentId={activeHoveredApartmentId}
                selectedApartmentId={selectedApartmentId}
                simplifyFilteredVisuals={simplifyFilteredVisuals}
              />
            ) : null}
          </group>
        </group>
      ) : null}

      {allowHover ? (
        <HoverTracker
          allowHover
          onHoverChange={handleSceneHover}
          pickableMeshes={hotspotScopedPickableMeshes}
        />
      ) : null}

      {showTrackingDebug ? (
        <TrackingDebugOverlay
          currentViewLabel={trackingViewLabel}
          rays={trackingCameraRays}
          points={towerDebugPoints}
        />
      ) : null}
    </>
  );
});

type MasterPlanFrameHoverStageProps = {
  apartments: InventoryApartment[];
  currentFrame: number;
  dragEnabled?: boolean;
  filteredApartments: InventoryApartment[];
  inventoryError: string | null;
  inventoryState: InventoryLoadState;
  onApartmentSelect?: (
    apartment: InventoryApartment | null,
    apartmentId: string | null,
  ) => void;
  onInteractionChange?: (isInteracting: boolean) => void;
  onSetFrame: (frame: number) => void;
  selectedApartmentId: string | null;
  selectedTower: TowerType | null;
};

export default function MasterPlanFrameHoverStage({
  apartments,
  currentFrame,
  dragEnabled = true,
  filteredApartments,
  inventoryError,
  inventoryState,
  onApartmentSelect,
  onInteractionChange,
  onSetFrame,
  selectedApartmentId,
  selectedTower,
}: MasterPlanFrameHoverStageProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pointerSelectionRef = useRef<
    ((clientX: number, clientY: number) => string | null) | null
  >(null);
  const dragStateRef = useRef<DragState | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasInvalidateRef = useRef<(() => void) | null>(null);
  const dragFrameRef = useRef<number | null>(null);
  const hoverCooldownTimeoutRef = useRef<number | null>(null);
  const displayedFrameRef = useRef(wrapFrame(currentFrame));
  const displayedFrameStateRef = useRef(wrapFrame(currentFrame));
  const isSettlingRef = useRef(false);
  const lastSyncedVideoFrameRef = useRef<number | null>(null);
  const lastDragVideoSyncTimeRef = useRef(0);
  const progressFrameRef = useRef<number | null>(null);
  const pendingProgressRef = useRef<number | null>(null);
  const displayProgressRef = useRef(frameToProgress(currentFrame));
  const dragTargetProgressRef = useRef(frameToProgress(currentFrame));
  const hoveredApartmentIdRef = useRef<string | null>(null);
  const tooltipFrameRef = useRef<number | null>(null);
  const tooltipPositionRef = useRef({ x: 12, y: 12 });
  const [performanceProfile, setPerformanceProfile] =
    useState<MasterPlanPerformanceProfile>(() =>
      getMasterPlanPerformanceProfile(),
    );
  const [hoveredApartmentId, setHoveredApartmentId] = useState<string | null>(
    null,
  );
  const [displayedFrame, setDisplayedFrame] = useState(() => wrapFrame(currentFrame));
  const [isDragging, setIsDragging] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isHoverCoolingDown, setIsHoverCoolingDown] = useState(false);
  const [supportsPreciseHover, setSupportsPreciseHover] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [sectionSize, setSectionSize] = useState(() => ({
    height: 0,
    width: 0,
  }));
  const safeFrame = wrapFrame(currentFrame);
  const coverViewport = useMemo(
    () =>
      getCoverViewport(
        sectionSize.width,
        sectionSize.height,
        TRACKING_VIDEO_ASPECT,
      ),
    [sectionSize.height, sectionSize.width],
  );
  const dragSeekBudgetMs = useMemo(
    () => getDragSeekBudgetMs(performanceProfile.tier),
    [performanceProfile.tier],
  );
  const invalidateCanvas = useCallback(() => {
    canvasInvalidateRef.current?.();
  }, []);

  const stopScheduledProgress = useCallback(() => {
    if (progressFrameRef.current !== null) {
      window.cancelAnimationFrame(progressFrameRef.current);
      progressFrameRef.current = null;
    }
  }, []);

  const stopDragLoop = useCallback(() => {
    if (dragFrameRef.current !== null) {
      window.cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }
  }, []);

  const clearHoverCooldown = useCallback(() => {
    if (hoverCooldownTimeoutRef.current !== null) {
      window.clearTimeout(hoverCooldownTimeoutRef.current);
      hoverCooldownTimeoutRef.current = null;
    }

    setIsHoverCoolingDown(false);
  }, []);

  const clearHoveredApartment = useCallback(() => {
    hoveredApartmentIdRef.current = null;
    setHoveredApartmentId((currentHoveredApartmentId) =>
      currentHoveredApartmentId === null ? currentHoveredApartmentId : null,
    );
  }, []);

  const startHoverCooldown = useCallback(() => {
    clearHoverCooldown();
    setIsHoverCoolingDown(true);
    hoverCooldownTimeoutRef.current = window.setTimeout(() => {
      hoverCooldownTimeoutRef.current = null;
      setIsHoverCoolingDown(false);
    }, HOVER_COOLDOWN_MS);
  }, [clearHoverCooldown]);

  const syncDisplayedFrameState = useCallback(
    (nextFrame: number, urgent = false) => {
      const wrappedFrame = wrapFrame(nextFrame);

      if (displayedFrameStateRef.current === wrappedFrame) {
        return;
      }

      displayedFrameStateRef.current = wrappedFrame;

      if (urgent) {
        setDisplayedFrame(wrappedFrame);
        return;
      }

      startTransition(() => {
        setDisplayedFrame(wrappedFrame);
      });
    },
    [],
  );

  const syncVideoTime = useCallback(
    (
      video: HTMLVideoElement | null,
      progress: number,
      { force = false }: { force?: boolean } = {},
    ) => {
      if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
        return;
      }

      const targetFrame = progressToFrame(progress);
      const targetTime = Math.min(
        wrapProgress(progress) * video.duration,
        Math.max(video.duration - 1 / MASTER_PLAN_SCRUB_VIDEO_FPS, 0),
      );
      const previousFrame = lastSyncedVideoFrameRef.current;
      const minimumFrameDelta =
        !force && dragStateRef.current
          ? DRAG_VIDEO_SYNC_FRAME_STEP
          : 1;
      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now();

      if (!force) {
        if (
          dragStateRef.current &&
          dragSeekBudgetMs > 0 &&
          now - lastDragVideoSyncTimeRef.current < dragSeekBudgetMs
        ) {
          return;
        }

        if (
          previousFrame === targetFrame &&
          Math.abs(video.currentTime - targetTime) <=
            VIDEO_SYNC_THRESHOLD_SECONDS * 0.5
        ) {
          return;
        }

        if (
          previousFrame !== null &&
          Math.abs(
            getShortestProgressDelta(frameToProgress(previousFrame), progress),
          ) *
            TOTAL_FRAMES <
            minimumFrameDelta
        ) {
          return;
        }
      }

      lastSyncedVideoFrameRef.current = targetFrame;

      if (
        Math.abs(video.currentTime - targetTime) >
        VIDEO_SYNC_THRESHOLD_SECONDS
      ) {
        if (
          targetTime < video.currentTime &&
          Math.abs(video.currentTime - targetTime) > VIDEO_FAST_SEEK_THRESHOLD_SECONDS &&
          typeof video.fastSeek === "function"
        ) {
          lastDragVideoSyncTimeRef.current = now;
          video.fastSeek(targetTime);
          return;
        }

        lastDragVideoSyncTimeRef.current = now;
        video.currentTime = targetTime;
      }
    },
    [dragSeekBudgetMs],
  );

  const syncVisibleVideoTime = useCallback(
    (progress: number) => {
      syncVideoTime(videoRef.current, progress);
    },
    [syncVideoTime],
  );

  const commitProgress = useCallback(
    (nextProgress: number) => {
      const wrappedProgress = wrapProgress(nextProgress);
      displayProgressRef.current = wrappedProgress;
      const nextDisplayedFrame = progressToFrame(wrappedProgress);
      const previousDisplayedFrame = displayedFrameRef.current;
      const displayedFrameChanged = previousDisplayedFrame !== nextDisplayedFrame;

      if (displayedFrameChanged) {
        displayedFrameRef.current = nextDisplayedFrame;

        if (!dragStateRef.current && !isSettlingRef.current) {
          syncDisplayedFrameState(nextDisplayedFrame);
        }
      }

      if (displayedFrameChanged || !dragStateRef.current) {
        syncVisibleVideoTime(wrappedProgress);
      }

      if (dragStateRef.current) {
        return;
      }

      const previousInPrewarmWindow = isFrameWithinSnapWindow(
        previousDisplayedFrame,
        TOWER_MESH_PREWARM_FRAMES,
      );
      const nextInPrewarmWindow = isFrameWithinSnapWindow(
        nextDisplayedFrame,
        TOWER_MESH_PREWARM_FRAMES,
      );
      const previousSnapIndex = getNearestSnapFrameInfo(previousDisplayedFrame).index;
      const nextSnapIndex = getNearestSnapFrameInfo(nextDisplayedFrame).index;

      if (
        previousInPrewarmWindow !== nextInPrewarmWindow ||
        (
          previousSnapIndex !== nextSnapIndex &&
          (previousInPrewarmWindow || nextInPrewarmWindow)
        )
      ) {
        canvasInvalidateRef.current?.();
      }
    },
    [syncDisplayedFrameState, syncVisibleVideoTime],
  );

  const scheduleProgress = useCallback(
    (nextProgress: number) => {
      pendingProgressRef.current = wrapProgress(nextProgress);

      if (progressFrameRef.current !== null) {
        return;
      }

      progressFrameRef.current = window.requestAnimationFrame(() => {
        progressFrameRef.current = null;

        if (pendingProgressRef.current == null) {
          return;
        }

        const progress = pendingProgressRef.current;
        pendingProgressRef.current = null;
        commitProgress(progress);
      });
    },
    [commitProgress],
  );

  const startDragLoop = useCallback(() => {
    if (dragFrameRef.current !== null) {
      return;
    }

    dragFrameRef.current = window.requestAnimationFrame(() => {
      dragFrameRef.current = null;
      commitProgress(dragTargetProgressRef.current);
    });
  }, [commitProgress]);

  const stopMotionAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    isSettlingRef.current = false;
    setIsSettling(false);
  }, []);

  const animateToProgress = useCallback(
    (
      targetProgress: number,
      duration: number,
      onComplete?: (() => void) | undefined,
      easing: (progress: number) => number = easeOutCubic,
    ) => {
      stopDragLoop();
      stopMotionAnimation();

      const startProgress = displayProgressRef.current;
      const progressDelta = getShortestProgressDelta(
        startProgress,
        targetProgress,
      );

      if (Math.abs(progressDelta) < 0.0005) {
        stopScheduledProgress();
        commitProgress(targetProgress);
        syncVideoTime(videoRef.current, targetProgress, { force: true });
        invalidateCanvas();
        onComplete?.();
        return;
      }

      isSettlingRef.current = true;
      setIsSettling(true);
      let startTime = 0;

      const animate = (timestamp: number) => {
        if (startTime === 0) {
          startTime = timestamp;
        }

        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easing(progress);

        scheduleProgress(startProgress + progressDelta * easedProgress);

        if (progress >= 1) {
          dragTargetProgressRef.current = wrapProgress(targetProgress);
          stopScheduledProgress();
          commitProgress(targetProgress);
          syncVideoTime(videoRef.current, targetProgress, { force: true });
          stopMotionAnimation();
          syncDisplayedFrameState(progressToFrame(targetProgress), true);
          invalidateCanvas();
          onComplete?.();
          return;
        }

        animationFrameRef.current = window.requestAnimationFrame(animate);
      };

      animationFrameRef.current = window.requestAnimationFrame(animate);
    },
    [
      commitProgress,
      invalidateCanvas,
      scheduleProgress,
      stopScheduledProgress,
      stopDragLoop,
      stopMotionAnimation,
      syncDisplayedFrameState,
      syncVideoTime,
    ],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const hoverMedia = window.matchMedia("(hover: hover) and (pointer: fine)");
    const motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncInteractionPreferences = () => {
      setSupportsPreciseHover(hoverMedia.matches);
      setPrefersReducedMotion(motionMedia.matches);
    };

    syncInteractionPreferences();

    hoverMedia.addEventListener("change", syncInteractionPreferences);
    motionMedia.addEventListener("change", syncInteractionPreferences);

    return () => {
      hoverMedia.removeEventListener("change", syncInteractionPreferences);
      motionMedia.removeEventListener("change", syncInteractionPreferences);
    };
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined") {
      return;
    }

    const masterPlanNavigator = navigator as MasterPlanNavigator;
    const connection = masterPlanNavigator.connection;
    const syncPerformanceProfile = () => {
      setPerformanceProfile((current) => {
        const next = getMasterPlanPerformanceProfile();

        if (
          current.isConstrained === next.isConstrained &&
          current.scrubVideoPreload === next.scrubVideoPreload &&
          current.tier === next.tier &&
          current.canvasPerformance.min === next.canvasPerformance.min &&
          current.canvasPerformance.debounce ===
            next.canvasPerformance.debounce
        ) {
          return current;
        }

        return next;
      });
    };

    syncPerformanceProfile();
    connection?.addEventListener?.("change", syncPerformanceProfile);

    return () => {
      connection?.removeEventListener?.("change", syncPerformanceProfile);
    };
  }, []);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section || typeof ResizeObserver === "undefined") {
      return;
    }

    const syncSectionSize = () => {
      const rect = section.getBoundingClientRect();

      setSectionSize((current) => {
        const nextWidth = Math.round(rect.width);
        const nextHeight = Math.round(rect.height);

        if (
          current.width === nextWidth &&
          current.height === nextHeight
        ) {
          return current;
        }

        return {
          width: nextWidth,
          height: nextHeight,
        };
      });
    };

    syncSectionSize();

    const resizeObserver = new ResizeObserver(syncSectionSize);
    resizeObserver.observe(section);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const syncVideoState = () => {
      video.pause();
      lastSyncedVideoFrameRef.current = null;
      lastDragVideoSyncTimeRef.current = 0;
      syncVideoTime(video, displayProgressRef.current, { force: true });
      setIsVideoReady(true);
    };

    const cleanup = bindVideoStream({
      hlsPath: "",
      mp4Path: MASTER_PLAN_SCRUB_HQ_VIDEO_PATH,
      onReady: syncVideoState,
      video,
    });

    return () => {
      cleanup();
    };
  }, [syncVideoTime]);

  useEffect(() => {
    if (dragStateRef.current) {
      return;
    }

    const targetProgress = frameToProgress(safeFrame);
    const frameDistance =
      Math.abs(
        getShortestProgressDelta(displayProgressRef.current, targetProgress),
      ) * TOTAL_FRAMES;

    if (frameDistance < 0.5) {
      const syncId = window.requestAnimationFrame(() => {
        stopScheduledProgress();
        commitProgress(targetProgress);
        syncVideoTime(videoRef.current, targetProgress, { force: true });
      });

      return () => {
        window.cancelAnimationFrame(syncId);
      };
    }

    const duration = Math.min(
      HOTSPOT_NAVIGATION_MAX_DURATION_MS,
      Math.max(
        HOTSPOT_NAVIGATION_MIN_DURATION_MS,
        frameDistance * HOTSPOT_NAVIGATION_MS_PER_FRAME,
      ),
    );

    const animationId = window.requestAnimationFrame(() => {
      animateToProgress(
        targetProgress,
        duration,
        startHoverCooldown,
        easeInOutCubic,
      );
    });

    return () => {
      window.cancelAnimationFrame(animationId);
    };
  }, [
    animateToProgress,
    commitProgress,
    safeFrame,
    startHoverCooldown,
    stopScheduledProgress,
    syncVideoTime,
  ]);

  useEffect(() => {
    if (!dragEnabled) {
      dragStateRef.current = null;
      stopDragLoop();
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;

      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }

      const deltaX = event.clientX - dragState.startX;

      if (!dragState.didDrag && Math.abs(deltaX) < DRAG_THRESHOLD_PX) {
        return;
      }

      if (!dragState.didDrag) {
        dragState.didDrag = true;
        clearHoverCooldown();
        setIsDragging(true);
        stopDragLoop();
        stopMotionAnimation();
        clearHoveredApartment();
      }

      event.preventDefault();
      const elapsedMs = Math.max(event.timeStamp - dragState.lastTimestamp, 1);
      const rawDeltaX = event.clientX - dragState.lastClientX;
      const maxDeltaX = DRAG_MAX_POINTER_PIXELS_PER_MS * elapsedMs;
      const clampedIncrement = Math.max(
        -maxDeltaX,
        Math.min(maxDeltaX, rawDeltaX),
      );

      dragState.clampedDeltaX += clampedIncrement;
      dragState.lastClientX = event.clientX;
      dragState.lastTimestamp = event.timeStamp;

      const rawTargetProgress = wrapProgress(
        dragState.startProgress +
          dragState.clampedDeltaX / (DRAG_PIXELS_PER_FRAME * TOTAL_FRAMES),
      );
      dragTargetProgressRef.current = clampProgressLead(
        displayProgressRef.current,
        rawTargetProgress,
        DRAG_MAX_LEAD_FRAMES,
      );
      startDragLoop();
    };

    const handlePointerEnd = (event: PointerEvent) => {
      const dragState = dragStateRef.current;

      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }

      dragStateRef.current = null;
      setIsDragging(false);
      stopDragLoop();

      if (!dragState.didDrag) {
        return;
      }

      const releaseFrame = progressToFrame(dragTargetProgressRef.current);
      const dragDirection =
        dragState.clampedDeltaX === 0
          ? 0
          : dragState.clampedDeltaX > 0
            ? 1
            : -1;
      const snappedFrame =
        dragDirection === 0
          ? getNearestSnapFrame(releaseFrame)
          : getDirectionalSnapFrame(releaseFrame, dragDirection);
      const targetProgress = frameToProgress(snappedFrame);
      dragTargetProgressRef.current = targetProgress;
      const totalFrames =
        Math.abs(
          getShortestProgressDelta(displayProgressRef.current, targetProgress),
        ) * TOTAL_FRAMES;
      const duration = Math.min(
        SNAP_ANIMATION_MAX_DURATION_MS,
        Math.max(
          SNAP_ANIMATION_MIN_DURATION_MS,
          totalFrames * SNAP_ANIMATION_MS_PER_FRAME,
        ),
      );

      animateToProgress(targetProgress, duration, () => {
        startHoverCooldown();
        onSetFrame(snappedFrame);
      });
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
    };
  }, [
    animateToProgress,
    clearHoverCooldown,
    clearHoveredApartment,
    dragEnabled,
    onSetFrame,
    startDragLoop,
    startHoverCooldown,
    stopDragLoop,
    stopMotionAnimation,
  ]);

  useEffect(() => {
    return () => {
      clearHoverCooldown();
      stopDragLoop();
      stopMotionAnimation();
      stopScheduledProgress();
      if (tooltipFrameRef.current !== null) {
        window.cancelAnimationFrame(tooltipFrameRef.current);
      }
    };
  }, [clearHoverCooldown, stopDragLoop, stopMotionAnimation, stopScheduledProgress]);

  const allowHover =
    dragEnabled &&
    supportsPreciseHover &&
    !prefersReducedMotion &&
    !isDragging &&
    !isSettling &&
    !isHoverCoolingDown &&
    isSnapFrame(displayedFrame);
  const showTowerMeshes = isFrameWithinSnapWindow(
    displayedFrame,
    TOWER_MESH_PREWARM_FRAMES,
  ) && !isDragging && !isSettling;
  const showApartmentMeshes =
    !isDragging && !isSettling && !isHoverCoolingDown && isSnapFrame(displayedFrame);
  const showTrackingDebug =
    ENABLE_TRACKING_DEBUG &&
    !isDragging &&
    !isSettling;
  const showVideo = isVideoReady;
  const canvasDpr: [number, number] = useMemo(
    () =>
      getCanvasDprRange(performanceProfile.tier, {
        isDragging,
        isSettling,
        supportsPreciseHover,
      }),
    [isDragging, isSettling, performanceProfile.tier, supportsPreciseHover],
  );
  const trackingFrame = getNearestSnapFrame(displayedFrame);
  const activeHotspot = useMemo(
    () => getNearestMasterPlanHotspot(trackingFrame),
    [trackingFrame],
  );
  const apartmentIndex = useMemo(
    () => buildInventoryApartmentIndex(apartments),
    [apartments],
  );
  const hoveredInventoryCandidate = findInventoryApartmentInIndex(
    apartmentIndex,
    hoveredApartmentId,
    selectedTower,
  );
  const hotspotHoveredApartmentId =
    hoveredApartmentId &&
    Boolean(hoveredInventoryCandidate && hoveredInventoryCandidate.floor > 0) &&
    isApartmentIdAllowedAtHotspot(
      hoveredApartmentId,
      activeHotspot,
      selectedTower,
    )
      ? hoveredApartmentId
      : null;
  const activeHoveredApartmentId =
    allowHover ? hotspotHoveredApartmentId : null;
  const getApartmentStatus = (apartmentId: string | null) =>
    findInventoryApartmentInIndex(
      apartmentIndex,
      apartmentId,
      selectedTower,
    )?.status ?? null;
  const hoveredApartment = useMemo(
    () => formatApartmentLabel(activeHoveredApartmentId, selectedTower),
    [activeHoveredApartmentId, selectedTower],
  );
  const hoveredInventoryApartment = findInventoryApartmentInIndex(
    apartmentIndex,
    activeHoveredApartmentId,
    selectedTower,
  );
  const hoveredFlatLabel = (
    hoveredInventoryApartment?.flatNumber ||
    hoveredApartment.unit ||
    "--"
  )
    .toUpperCase()
    .trim();
  const statusMeta = getStatusMeta(
    hoveredInventoryApartment?.status,
    inventoryState,
    inventoryError,
  );
  const selectApartmentByMeshId = (apartmentMeshId: string | null) => {
    if (!onApartmentSelect) {
      return;
    }

    onApartmentSelect(
      findInventoryApartmentInIndex(
        apartmentIndex,
        apartmentMeshId,
        selectedTower,
      ),
      apartmentMeshId,
    );
  };

  useEffect(() => {
    onInteractionChange?.(isDragging || isSettling);
  }, [isDragging, isSettling, onInteractionChange]);

  useEffect(() => {
    return () => {
      onInteractionChange?.(false);
    };
  }, [onInteractionChange]);

  const updateTooltipPosition = useCallback(
    (pointerPosition: PointerPosition | null) => {
      if (!pointerPosition || !sectionRef.current || !tooltipRef.current) {
        return;
      }

      const rect = sectionRef.current.getBoundingClientRect();
      const tooltipWidth = 180;
      const tooltipHeight = 62;
      const offsetX = 16;
      const offsetY = 16;

      const nextLeft = Math.min(
        Math.max(pointerPosition.x - rect.left + offsetX, 12),
        Math.max(rect.width - tooltipWidth - 12, 12),
      );
      const nextTop = Math.min(
        Math.max(pointerPosition.y - rect.top + offsetY, 12),
        Math.max(rect.height - tooltipHeight - 12, 12),
      );

      if (
        Math.abs(tooltipPositionRef.current.x - nextLeft) < 0.5 &&
        Math.abs(tooltipPositionRef.current.y - nextTop) < 0.5
      ) {
        return;
      }

      tooltipPositionRef.current = {
        x: nextLeft,
        y: nextTop,
      };

      if (tooltipFrameRef.current !== null) {
        return;
      }

      tooltipFrameRef.current = window.requestAnimationFrame(() => {
        tooltipFrameRef.current = null;

        if (!tooltipRef.current) {
          return;
        }

        tooltipRef.current.style.transform = `translate3d(${tooltipPositionRef.current.x}px, ${tooltipPositionRef.current.y}px, 0)`;
      });
    },
    [],
  );

  const handleApartmentHover = useCallback(
    (apartmentId: string | null, pointerPosition: PointerPosition | null) => {
      if (!allowHover) {
        return;
      }

      updateTooltipPosition(pointerPosition);

      if (hoveredApartmentIdRef.current === apartmentId) {
        return;
      }

      hoveredApartmentIdRef.current = apartmentId;

      startTransition(() => {
        setHoveredApartmentId(apartmentId);
      });
    },
    [allowHover, updateTooltipPosition],
  );

  const handleCanvasInvalidateReady = useCallback((invalidateCanvas: () => void) => {
    canvasInvalidateRef.current = invalidateCanvas;
  }, []);
  const handlePointerSelectionReady = useCallback(
    (pickApartmentAtClientPoint: (clientX: number, clientY: number) => string | null) => {
      pointerSelectionRef.current = pickApartmentAtClientPoint;
    },
    [],
  );

  useEffect(() => {
    if (!dragStateRef.current && !isSettlingRef.current) {
      syncVideoTime(videoRef.current, displayProgressRef.current, { force: true });
    }

    if (
      !isDragging &&
      !isSettling &&
      (showTowerMeshes || allowHover || showTrackingDebug)
    ) {
      invalidateCanvas();
    }
  }, [
    allowHover,
    currentFrame,
    invalidateCanvas,
    isDragging,
    isSettling,
    showTowerMeshes,
    showTrackingDebug,
    syncVideoTime,
  ]);

  return (
    <section
      ref={sectionRef}
      className="absolute inset-0 overflow-hidden bg-black"
    >
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-300 ${
          isVideoReady ? "opacity-0" : "opacity-100"
        }`}
        style={{ backgroundImage: "url('/FALLBACK.png')" }}
      />

      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute"
          style={{
            height: `${coverViewport.height}px`,
            left: `${coverViewport.left}px`,
            top: `${coverViewport.top}px`,
            width: `${coverViewport.width}px`,
          }}
        >
          <video
            ref={videoRef}
            aria-label={`Master plan scrub view ${displayedFrame}`}
            className={`pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-200 ${
              showVideo ? "opacity-100" : "opacity-0"
            }`}
            muted
            playsInline
            preload={performanceProfile.scrubVideoPreload}
            disablePictureInPicture
          />

          <div
            onPointerDownCapture={(event) => {
              if (!dragEnabled) {
                return;
              }

              if (event.pointerType !== "touch" && event.button !== 0) {
                return;
              }

              clearHoverCooldown();
              stopMotionAnimation();
              stopDragLoop();
              syncVideoTime(videoRef.current, displayProgressRef.current, {
                force: true,
              });
              invalidateCanvas();
              dragTargetProgressRef.current = displayProgressRef.current;
              dragStateRef.current = {
                clampedDeltaX: 0,
                didDrag: false,
                lastClientX: event.clientX,
                lastTimestamp: event.timeStamp,
                pointerId: event.pointerId,
                startProgress: displayProgressRef.current,
                startX: event.clientX,
              };
            }}
            onPointerUpCapture={(event) => {
              if (!dragEnabled) {
                return;
              }

              if (event.pointerType !== "touch" && event.button !== 0) {
                return;
              }

              const dragState = dragStateRef.current;

              if (!dragState || dragState.didDrag) {
                return;
              }

              selectApartmentByMeshId(
                pointerSelectionRef.current?.(event.clientX, event.clientY) ??
                  hoveredApartmentIdRef.current,
              );
            }}
            onPointerLeave={() => {
              clearHoveredApartment();
            }}
            onPointerCancel={() => {
              dragStateRef.current = null;
              setIsDragging(false);
              stopDragLoop();
              stopMotionAnimation();
              clearHoveredApartment();
            }}
            className={`absolute inset-0 touch-none select-none ${
              !dragEnabled
                ? "cursor-default"
                : allowHover && activeHoveredApartmentId
                ? "cursor-pointer"
                : isDragging
                  ? "cursor-ew-resize"
                  : "cursor-[grab] active:cursor-[grabbing]"
            }`}
          >
            {!isDragging ? (
              <Canvas
                dpr={canvasDpr}
                frameloop="demand"
                performance={performanceProfile.canvasPerformance}
                gl={{
                  alpha: true,
                  antialias: false,
                  depth: true,
                  powerPreference: "high-performance",
                  stencil: false,
                }}
              >
                <Suspense fallback={<LoadingState />}>
                  <AdaptiveDpr />
                  <TowerScene
                    apartments={apartments}
                    currentFrame={trackingFrame}
                    filteredApartments={filteredApartments}
                    getApartmentStatus={getApartmentStatus}
                    allowHover={allowHover}
                    onInvalidateReady={handleCanvasInvalidateReady}
                    onPointerSelectionReady={handlePointerSelectionReady}
                    onApartmentHover={handleApartmentHover}
                    rotationProgressRef={displayProgressRef}
                    selectedApartmentId={
                      !isDragging && !isSettling ? selectedApartmentId : null
                    }
                    selectedTower={selectedTower}
                    simplifyFilteredVisuals={performanceProfile.tier !== "standard"}
                    showApartmentMeshes={showApartmentMeshes}
                    showTowerMeshes={showTowerMeshes}
                    showTrackingDebug={showTrackingDebug}
                  />
                </Suspense>
              </Canvas>
            ) : null}
          </div>
        </div>
      </div>

      {allowHover && activeHoveredApartmentId && !selectedApartmentId ? (
        <div
          ref={tooltipRef}
          className="pointer-events-none absolute z-30 will-change-transform"
          style={{ transform: "translate3d(12px, 12px, 0)" }}
        >
          <div className="rounded-[18px] border border-white/30 bg-[linear-gradient(145deg,rgba(255,255,255,0.20),rgba(255,255,255,0.10))] px-3.5 py-3 shadow-[0_18px_44px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.28)] backdrop-blur-2xl">
            <div className="flex items-center gap-3">
              <span className="text-[1.28rem] font-semibold leading-none tracking-[-0.05em] text-slate-950">
                {hoveredFlatLabel}
              </span>
              <div
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] ${statusMeta.badgeClassName}`}
              >                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         
                <span
                  className={`inline-flex h-2 w-2 rounded-full ${statusMeta.dotClassName}`}
                />
                {statusMeta.label}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

useGLTF.preload(MODEL_PATH_A);
useGLTF.preload(MODEL_PATH_B);
useGLTF.preload(INTERACTION_MODEL_PATH_A);
useGLTF.preload(INTERACTION_MODEL_PATH_B);
