"use client";

import {
  Suspense,
  memo,
  startTransition,
  type MutableRefObject,
  useCallback,
  useDeferredValue,
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
import trackingData from "@/data/trifecta_unreal_tracking_data.json";
import type {
  InventoryApartment,
  InventoryStatus,
  TowerType,
} from "@/types/inventory";

const MODEL_PATH_A = "/models/Towers_Final.glb";
const MODEL_PATH_B = "/models/Towers_Final - Copy.glb";
const APARTMENT_ID_PATTERN = /^(Tower_[A-Z]_\d{2}_\d{3,4})_/;
const TARGET_MODEL_HEIGHT = 10;
const TOTAL_FRAMES = TOTAL_MASTER_PLAN_FRAMES;
const SNAP_FRAMES = [1, 61, 121, 181, 241, 301] as const;
const DRAG_THRESHOLD_PX = 8;
const DRAG_PIXELS_PER_FRAME = 12;
const DRAG_MAX_LEAD_FRAMES = 8;
const DRAG_MAX_POINTER_PIXELS_PER_MS = 1.1;
const DRAG_PROGRESS_DAMPING_FORWARD = 18;
const DRAG_PROGRESS_DAMPING_BACKWARD = 21;
const DRAG_MAX_CATCH_UP_FRAMES_PER_SECOND = 32;
const DRAG_PROGRESS_EPSILON = 0.00008;
const SNAP_ANIMATION_MIN_DURATION_MS = 240;
const SNAP_ANIMATION_MAX_DURATION_MS = 460;
const SNAP_ANIMATION_MS_PER_FRAME = 4.5;
const HOTSPOT_NAVIGATION_MIN_DURATION_MS = 560;
const HOTSPOT_NAVIGATION_MAX_DURATION_MS = 980;
const HOTSPOT_NAVIGATION_MS_PER_FRAME = 9.5;
const DRAG_VIDEO_SYNC_FRAME_STEP = 3;
const HOVER_COOLDOWN_MS = 180;
const TRACKING_VIDEO_ASPECT = 16 / 9;
const VIDEO_SYNC_THRESHOLD_SECONDS = 1 / (MASTER_PLAN_SCRUB_VIDEO_FPS * 1.5);
const VIDEO_FAST_SEEK_THRESHOLD_SECONDS = 0.18;
const ENABLE_TRACKING_DEBUG = false;
const FILTER_HIGHLIGHT_EDGE_SIMPLIFY_THRESHOLD = 28;

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

function getHighlightEdgesGeometry(geometry: Mesh["geometry"]) {
  const cachedGeometry = HIGHLIGHT_EDGE_GEOMETRY_CACHE.get(geometry);

  if (cachedGeometry) {
    return cachedGeometry;
  }

  const edgesGeometry = new EdgesGeometry(geometry, 20);
  HIGHLIGHT_EDGE_GEOMETRY_CACHE.set(geometry, edgesGeometry);
  return edgesGeometry;
}

function createExpandedHighlightMatrix(matrix: Matrix4, scaleMultiplier: number) {
  return matrix
    .clone()
    .multiply(
      new Matrix4().makeScale(
        scaleMultiplier,
        scaleMultiplier,
        scaleMultiplier,
      ),
    );
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

function getNearestSnapFrame(frame: number) {
  const normalizedFrame = wrapFrame(frame);
  let closestFrame = 1;
  let closestDistance = Number.POSITIVE_INFINITY;

  SNAP_FRAMES.forEach((snapFrame) => {
    const distance = Math.min(
      Math.abs(normalizedFrame - snapFrame),
      Math.abs(normalizedFrame - (snapFrame + TOTAL_FRAMES)),
      Math.abs(normalizedFrame - (snapFrame - TOTAL_FRAMES)),
    );

    if (distance < closestDistance) {
      closestDistance = distance;
      closestFrame = snapFrame;
    }
  });

  return closestFrame;
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

function getTowerTrackingTransform(
  modelTowerDummies: TowerFootprint | null,
  towerCode: TowerCode,
) {
  if (!modelTowerDummies) {
    return null;
  }

  const unrealDummies = getUnrealTowerDummies(towerCode);

  if (!unrealDummies) {
    return null;
  }

  return computeSimilarityTransformFromQuads(modelTowerDummies, {
    ta1: unrealToThreePosition(unrealDummies.ta1),
    ta2: unrealToThreePosition(unrealDummies.ta2),
    ta3: unrealToThreePosition(unrealDummies.ta3),
    ta4: unrealToThreePosition(unrealDummies.ta4),
  });
}

function getUnrealTowerFootprintInThreeSpace(towerCode: TowerCode) {
  const unrealDummies = getUnrealTowerDummies(towerCode);

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
  trackingTransform: SimilarityTransform | null,
  aspect: number,
) {
  if (!trackingTransform) {
    return null;
  }

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
        position,
        quaternion,
        target,
      } satisfies TrackingCameraView,
    ];
  });
}

function interpolateTrackingCameraView(
  path: TrackingCameraView[],
  progress: number,
) {
  if (path.length === 0) {
    return null;
  }

  const wrapped = wrapProgress(progress) * path.length;
  const fromIndex = Math.floor(wrapped) % path.length;
  const toIndex = (fromIndex + 1) % path.length;
  const blend = wrapped - Math.floor(wrapped);
  const from = path[fromIndex];
  const to = path[toIndex];

  return {
    fov: MathUtils.lerp(from.fov, to.fov, blend),
    position: new Vector3().lerpVectors(from.position, to.position, blend),
    quaternion: new Quaternion().slerpQuaternions(
      from.quaternion,
      to.quaternion,
      blend,
    ),
    target: new Vector3().lerpVectors(from.target, to.target, blend),
  } satisfies TrackingCameraView;
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
    key: TOWER_A_TRACKING_KEYS[index] ?? `camera-${index}`,
    label: TOWER_A_TRACKING_KEYS[index] ?? `C${index + 1}`,
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
  const towerCode = normalizeFlatToken(apartment.towerCode);

  return new Set(
    [
      unitToken,
      `${towerCode}${unitToken}`,
      `T${towerCode}${unitToken}`,
      `${towerCode}FLAT${unitToken}`,
    ].filter(Boolean),
  );
}

function buildInventoryApartmentIndex(
  apartments: InventoryApartment[],
): InventoryApartmentIndex {
  const index: InventoryApartmentIndex = new Map();

  apartments.forEach((apartment) => {
    const towerIndex =
      index.get(apartment.tower) ?? new Map<string, InventoryApartment>();

    index.set(apartment.tower, towerIndex);

    const flatToken = normalizeFlatToken(apartment.flatNumber);
    const titleToken = normalizeFlatToken(apartment.title);

    if (flatToken && !towerIndex.has(flatToken)) {
      towerIndex.set(flatToken, apartment);
    }

    if (titleToken && !towerIndex.has(titleToken)) {
      towerIndex.set(titleToken, apartment);
    }
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

function prepareTowerScene(
  sourceScene: Object3D,
  selectedTower: TowerType | null,
  showDebugModel: boolean,
  forcedTowerCode: TowerCode = "A",
) {
  const scene = cloneSkeleton(sourceScene) as Group;
  const modelTowerDummies = collectModelTowerDummies(scene);
  const apartments = new Map<string, HoverMeshData[]>();
  const pickableMeshes: Mesh[] = [];
  const selectedTowerCode = towerTypeToCode(selectedTower);
  const towerBounds = new Map<TowerCode, Box3>();

  scene.updateWorldMatrix(true, true);

  scene.traverse((object) => {
    if (!(object instanceof Mesh)) {
      return;
    }

    object.visible = true;
    object.frustumCulled = false;

    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    const towerCode = forcedTowerCode;

    const shouldShowDebugMaterial =
      showDebugModel &&
      (!selectedTowerCode || towerCode === selectedTowerCode) &&
      towerCode === "A";

    const proxyMaterials = materials.map((material) => {
      const nextMaterial = (material as Material).clone();
      nextMaterial.side = DoubleSide;

      if (shouldShowDebugMaterial) {
        nextMaterial.transparent = true;
        nextMaterial.opacity = 0;
        nextMaterial.depthWrite = false;
        nextMaterial.colorWrite = true;
        return nextMaterial;
      }

      nextMaterial.transparent = true;
      nextMaterial.opacity = 0;
      nextMaterial.depthWrite = false;
      nextMaterial.colorWrite = false;
      return nextMaterial;
    });

    object.material = Array.isArray(object.material)
      ? proxyMaterials
      : proxyMaterials[0];

    if (towerCode) {
      object.geometry.computeBoundingBox();

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

    if (
      selectedTowerCode &&
      towerCode !== selectedTowerCode
    ) {
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

  const bounds = new Box3().setFromObject(scene);
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
        : createExpandedHighlightMatrix(matrix, scaleMultiplier),
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
  hoveredApartmentId,
  apartments,
}: {
  filteredApartmentIds: Set<string>;
  hoveredApartmentId: string | null;
  apartments: PreparedTowerModel["apartments"];
}) {
  const hoveredMeshes = useMemo(
    () => (hoveredApartmentId ? apartments.get(hoveredApartmentId) ?? [] : []),
    [apartments, hoveredApartmentId],
  );
  const filteredMeshes = useMemo(() => {
    const next: HoverMeshData[] = [];

    filteredApartmentIds.forEach((apartmentId) => {
      if (apartmentId === hoveredApartmentId) {
        return;
      }

      const apartmentMeshes = apartments.get(apartmentId);

      if (apartmentMeshes?.length) {
        next.push(...apartmentMeshes);
      }
    });

    return next;
  }, [apartments, filteredApartmentIds, hoveredApartmentId]);
  const shouldSimplifyFilteredEdges =
    filteredMeshes.length >= FILTER_HIGHLIGHT_EDGE_SIMPLIFY_THRESHOLD;

  if (!hoveredMeshes.length && filteredMeshes.length === 0) {
    return null;
  }

  return (
    <group>
      {filteredMeshes.map((meshData) => (
        <group key={`filter-${meshData.key}`}>
          <mesh
            frustumCulled={false}
            geometry={meshData.geometry}
            matrix={meshData.matrix}
            matrixAutoUpdate={false}
            raycast={() => null}
            renderOrder={10}
          >
            <meshBasicMaterial
              color="#86efac"
              depthTest={false}
              depthWrite={false}
              opacity={0.22}
              side={DoubleSide}
              toneMapped={false}
              transparent
            />
          </mesh>
          <HighlightEdgeLines
            color="#4ade80"
            geometry={meshData.geometry}
            matrix={meshData.matrix}
            renderOrder={11}
            scaleMultiplier={1.006}
            thickness={2}
          />
          {!shouldSimplifyFilteredEdges ? (
            <HighlightEdgeLines
              color="#f0fdf4"
              geometry={meshData.geometry}
              matrix={meshData.matrix}
              renderOrder={12}
              thickness={3}
            />
          ) : null}
        </group>
      ))}

      {hoveredMeshes.map((meshData) => (
        <group key={`hover-${meshData.key}`}>
          <mesh
            frustumCulled={false}
            geometry={meshData.geometry}
            matrix={meshData.matrix}
            matrixAutoUpdate={false}
            raycast={() => null}
            renderOrder={12}
          >
            <meshBasicMaterial
              color="#ffffff"
              depthTest={false}
              depthWrite={false}
              opacity={0.16}
              side={DoubleSide}
              toneMapped={false}
              transparent
            />
          </mesh>
          <HighlightEdgeLines
            color="#d1d5db"
            geometry={meshData.geometry}
            matrix={meshData.matrix}
            renderOrder={13}
            scaleMultiplier={1.008}
            thickness={2}
          />
          <HighlightEdgeLines
            color="#ffffff"
            geometry={meshData.geometry}
            matrix={meshData.matrix}
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

      const rect = element.getBoundingClientRect();
      const localPointerX = latestClientX - rect.left;
      const localPointerY = latestClientY - rect.top;
      const pointerPosition = {
        x: latestClientX,
        y: latestClientY,
      };

      pointer.x = (localPointerX / rect.width) * 2 - 1;
      pointer.y = -(localPointerY / rect.height) * 2 + 1;

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
  filteredApartments,
  onInvalidateReady,
  allowHover,
  onApartmentHover,
  rotationProgressRef,
  selectedTower,
  showApartmentMeshes,
  showTrackingDebug,
}: {
  filteredApartments: InventoryApartment[];
  onInvalidateReady?: (invalidateCanvas: () => void) => void;
  allowHover: boolean;
  onApartmentHover: (
    apartmentId: string | null,
    pointerPosition: PointerPosition | null,
  ) => void;
  rotationProgressRef: MutableRefObject<number>;
  selectedTower: TowerType | null;
  showApartmentMeshes: boolean;
  showTrackingDebug: boolean;
}) {
  const { invalidate, size } = useThree();
  const towerAGltf = useGLTF(MODEL_PATH_A);
  const towerBGltf = useGLTF(MODEL_PATH_B);
  const cameraRef = useRef<ThreePerspectiveCamera | null>(null);
  const fallbackGroupRef = useRef<Group | null>(null);
  const hoveredApartmentIdRef = useRef<string | null>(null);
  const trackingDebugLoggedRef = useRef(false);
  const [hoveredApartmentId, setHoveredApartmentId] = useState<string | null>(
    null,
  );
  const activeTowerCode = towerTypeToCode(selectedTower) ?? "A";
  const preparedTowerA = useMemo(
    () => prepareTowerScene(towerAGltf.scene, selectedTower, false, "A"),
    [selectedTower, towerAGltf.scene],
  );
  const preparedTowerB = useMemo(
    () => prepareTowerScene(towerBGltf.scene, selectedTower, false, "B"),
    [selectedTower, towerBGltf.scene],
  );
  const primaryPreparedModel =
    activeTowerCode === "B" ? preparedTowerB : preparedTowerA;
  const cameraTargetY = primaryPreparedModel.scaledHeight * 0.52;
  const towerATrackingTransform = useMemo(
    () =>
      getTowerTrackingTransform(
        preparedTowerA.trackedTowerFootprints.A ?? null,
        "A",
      ),
    [preparedTowerA.trackedTowerFootprints],
  );
  const towerBTrackingTransform = useMemo(
    () =>
      getTowerTrackingTransform(
        preparedTowerB.trackedTowerFootprints.B ?? null,
        "B",
      ),
    [preparedTowerB.trackedTowerFootprints],
  );
  const towerTrackingTransform =
    activeTowerCode === "B" ? towerBTrackingTransform : towerATrackingTransform;
  const towerTrackingPath = useMemo(
    () =>
      getTowerTrackingCameraPath(towerTrackingTransform, size.width / size.height),
    [size.height, size.width, towerTrackingTransform],
  );
  const unrealTowerDummies = useMemo(
    () =>
      showTrackingDebug
        ? getUnrealTowerFootprintInThreeSpace(activeTowerCode)
        : null,
    [activeTowerCode, showTrackingDebug],
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
  const combinedPickableMeshes = useMemo(
    () => [...preparedTowerA.pickableMeshes, ...preparedTowerB.pickableMeshes],
    [preparedTowerA.pickableMeshes, preparedTowerB.pickableMeshes],
  );
  const deferredFilteredApartments = useDeferredValue(filteredApartments);
  const filteredApartmentIndex = useMemo(
    () => buildInventoryApartmentIndex(deferredFilteredApartments),
    [deferredFilteredApartments],
  );
  const filteredApartmentIds = useMemo(() => {
    if (!showApartmentMeshes || !deferredFilteredApartments.length) {
      return new Set<string>();
    }

    return new Set(
      Array.from(combinedApartments.keys()).filter((apartmentId) =>
        Boolean(
          findInventoryApartmentInIndex(
            filteredApartmentIndex,
            apartmentId,
            selectedTower,
          ),
        ),
      ),
    );
  }, [
    combinedApartments,
    deferredFilteredApartments.length,
    filteredApartmentIndex,
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
    () => getTrackingCameraRays(towerTrackingPath),
    [towerTrackingPath],
  );
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
    return towerTrackingPath?.length
      ? `Tower ${activeTowerCode} Tracking`
      : `Tower ${activeTowerCode} Tracking`;
  }, [activeTowerCode, towerTrackingPath]);
  const fallbackScenePosition = BASE_MODEL_OFFSET;
  const trackedScenePosition: [number, number, number] = [0, 0, 0];
  const shouldShowHighlightOverlay =
    showApartmentMeshes &&
    (hoveredApartmentId !== null || filteredApartmentIds.size > 0);

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

  useFrame(() => {
    const camera = cameraRef.current;

    if (!camera) {
      return;
    }

    if (towerTrackingPath?.length) {
      const trackingView = interpolateTrackingCameraView(
        towerTrackingPath,
        rotationProgressRef.current,
      );

      if (!trackingView) {
        return;
      }

      if (Math.abs(camera.fov - trackingView.fov) > 0.001) {
        camera.fov = trackingView.fov;
        camera.updateProjectionMatrix();
      }

      camera.position.copy(trackingView.position);
      camera.quaternion.copy(trackingView.quaternion);
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
        far={towerTrackingPath?.length ? 100000 : 400}
        fov={34}
        near={0.01}
        position={BASE_CAMERA_POSITION}
      />

      <ambientLight intensity={1.75} />
      <directionalLight color="#fff7d8" intensity={2.85} position={[12, 16, 8]} />
      <directionalLight color="#d9ecff" intensity={1.2} position={[-10, 10, -10]} />
      {towerATrackingTransform ? (
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
                  hoveredApartmentId={hoveredApartmentId}
                />
              ) : null}
            </group>
          </group>
        </group>
      ) : null}
      {towerBTrackingTransform ? (
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
                  hoveredApartmentId={hoveredApartmentId}
                />
              ) : null}
            </group>
          </group>
        </group>
      ) : null}
      {!towerATrackingTransform && !towerBTrackingTransform ? (
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
                hoveredApartmentId={hoveredApartmentId}
              />
            ) : null}
          </group>
        </group>
      ) : null}

      <HoverTracker
        allowHover={allowHover}
        onHoverChange={handleSceneHover}
        pickableMeshes={combinedPickableMeshes}
      />

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
  filteredApartments: InventoryApartment[];
  inventoryError: string | null;
  inventoryState: InventoryLoadState;
  onSetFrame: (frame: number) => void;
  selectedTower: TowerType | null;
};

export default function MasterPlanFrameHoverStage({
  apartments,
  currentFrame,
  filteredApartments,
  inventoryError,
  inventoryState,
  onSetFrame,
  selectedTower,
}: MasterPlanFrameHoverStageProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasInvalidateRef = useRef<(() => void) | null>(null);
  const dragFrameRef = useRef<number | null>(null);
  const hoverCooldownTimeoutRef = useRef<number | null>(null);
  const displayedFrameRef = useRef(wrapFrame(currentFrame));
  const displayedFrameStateRef = useRef(wrapFrame(currentFrame));
  const isSettlingRef = useRef(false);
  const lastSyncedVideoFrameRef = useRef<number | null>(null);
  const progressFrameRef = useRef<number | null>(null);
  const pendingProgressRef = useRef<number | null>(null);
  const displayProgressRef = useRef(frameToProgress(currentFrame));
  const dragTargetProgressRef = useRef(frameToProgress(currentFrame));
  const hoveredApartmentIdRef = useRef<string | null>(null);
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
      const previousFrame = lastSyncedVideoFrameRef.current;
      const minimumFrameDelta =
        !force && dragStateRef.current
          ? DRAG_VIDEO_SYNC_FRAME_STEP
          : 1;

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

      const targetTime = Math.min(
        wrapProgress(progress) * video.duration,
        Math.max(video.duration - 1 / MASTER_PLAN_SCRUB_VIDEO_FPS, 0),
      );

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
          video.fastSeek(targetTime);
          return;
        }

        video.currentTime = targetTime;
      }
    },
    [],
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

      if (displayedFrameRef.current !== nextDisplayedFrame) {
        displayedFrameRef.current = nextDisplayedFrame;

        if (!dragStateRef.current && !isSettlingRef.current) {
          syncDisplayedFrameState(nextDisplayedFrame);
        }
      }

      syncVisibleVideoTime(wrappedProgress);

      if (
        !dragStateRef.current &&
        !isSettlingRef.current
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

    let previousTimestamp = 0;

    const step = (timestamp: number) => {
      dragFrameRef.current = null;
      const deltaSeconds =
        previousTimestamp === 0
          ? 1 / MASTER_PLAN_SCRUB_VIDEO_FPS
          : Math.min((timestamp - previousTimestamp) / 1000, 0.05);
      previousTimestamp = timestamp;

      const delta = getShortestProgressDelta(
        displayProgressRef.current,
        dragTargetProgressRef.current,
      );

      if (Math.abs(delta) <= DRAG_PROGRESS_EPSILON) {
        commitProgress(dragTargetProgressRef.current);
        return;
      }

      const damping =
        delta < 0
          ? DRAG_PROGRESS_DAMPING_BACKWARD
          : DRAG_PROGRESS_DAMPING_FORWARD;
      const lerpAmount = 1 - Math.exp(-damping * deltaSeconds);
      const maxStepProgress =
        (DRAG_MAX_CATCH_UP_FRAMES_PER_SECOND / TOTAL_FRAMES) * deltaSeconds;
      const nextStep =
        Math.sign(delta) *
        Math.min(Math.abs(delta) * lerpAmount, maxStepProgress);

      commitProgress(displayProgressRef.current + nextStep);
      dragFrameRef.current = window.requestAnimationFrame(step);
    };

    dragFrameRef.current = window.requestAnimationFrame(step);
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
        scheduleProgress(targetProgress);
        syncVideoTime(videoRef.current, targetProgress, { force: true });
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
          scheduleProgress(targetProgress);
          syncVideoTime(videoRef.current, targetProgress, { force: true });
          stopMotionAnimation();
          syncDisplayedFrameState(progressToFrame(targetProgress), true);
          onComplete?.();
          return;
        }

        animationFrameRef.current = window.requestAnimationFrame(animate);
      };

      animationFrameRef.current = window.requestAnimationFrame(animate);
    },
    [
      scheduleProgress,
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
      scheduleProgress(targetProgress);
      syncVideoTime(videoRef.current, targetProgress, { force: true });
      return;
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
  }, [animateToProgress, safeFrame, scheduleProgress, startHoverCooldown, syncVideoTime]);

  useEffect(() => {
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
        hoveredApartmentIdRef.current = null;
        setHoveredApartmentId(null);
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
      const snappedFrame = getNearestSnapFrame(releaseFrame);
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
    };
  }, [clearHoverCooldown, stopDragLoop, stopMotionAnimation, stopScheduledProgress]);

  const allowHover =
    supportsPreciseHover &&
    !prefersReducedMotion &&
    !isDragging &&
    !isSettling &&
    !isHoverCoolingDown &&
    isSnapFrame(displayedFrame);
  const showApartmentMeshes =
    !isDragging && !isSettling && !isHoverCoolingDown && isSnapFrame(displayedFrame);
  const showTrackingDebug =
    ENABLE_TRACKING_DEBUG &&
    !isDragging &&
    !isSettling;
  const showVideo = isVideoReady;
  const canvasDpr: [number, number] = supportsPreciseHover
    ? [0.7, 1]
    : [0.5, 0.85];
  const activeHoveredApartmentId = allowHover ? hoveredApartmentId : null;
  const apartmentIndex = useMemo(
    () => buildInventoryApartmentIndex(apartments),
    [apartments],
  );
  const hoveredApartment = formatApartmentLabel(
    activeHoveredApartmentId,
    selectedTower,
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

      tooltipRef.current.style.left = `${nextLeft}px`;
      tooltipRef.current.style.top = `${nextTop}px`;
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

  useEffect(() => {
    syncVideoTime(videoRef.current, displayProgressRef.current, { force: true });
  }, [currentFrame, syncVideoTime]);

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
            preload="auto"
            disablePictureInPicture
          />

          <div
            onPointerDownCapture={(event) => {
              if (event.pointerType !== "touch" && event.button !== 0) {
                return;
              }

              clearHoverCooldown();
              stopMotionAnimation();
              stopDragLoop();
              syncVideoTime(videoRef.current, displayProgressRef.current, {
                force: true,
              });
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
            onPointerLeave={() => {
              hoveredApartmentIdRef.current = null;
              setHoveredApartmentId(null);
            }}
            onPointerCancel={() => {
              dragStateRef.current = null;
              setIsDragging(false);
              stopDragLoop();
              stopMotionAnimation();
              hoveredApartmentIdRef.current = null;
              setHoveredApartmentId(null);
            }}
            className={`absolute inset-0 touch-none select-none ${
              allowHover && activeHoveredApartmentId
                ? "cursor-pointer"
                : isDragging
                  ? "cursor-ew-resize"
                  : "cursor-[grab] active:cursor-[grabbing]"
            }`}
          >
            <Canvas
              dpr={canvasDpr}
              frameloop="demand"
              performance={{ min: 0.45, debounce: 120 }}
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
                  filteredApartments={filteredApartments}
                  allowHover={allowHover}
                  onInvalidateReady={handleCanvasInvalidateReady}
                  onApartmentHover={handleApartmentHover}
                  rotationProgressRef={displayProgressRef}
                  selectedTower={selectedTower}
                  showApartmentMeshes={showApartmentMeshes}
                  showTrackingDebug={showTrackingDebug}
                />
              </Suspense>
            </Canvas>
          </div>
        </div>
      </div>

      {allowHover && activeHoveredApartmentId ? (
        <div
          ref={tooltipRef}
          className="pointer-events-none absolute z-30"
          style={{ left: 12, top: 12 }}
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
