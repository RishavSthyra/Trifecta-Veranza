"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  Html,
  Outlines,
  PerspectiveCamera,
  useGLTF,
} from "@react-three/drei";
import {
  Box3,
  DoubleSide,
  Group,
  Material,
  Matrix4,
  Mesh,
  Object3D,
  Vector2,
  Vector3,
} from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import type {
  InventoryApartment,
  InventoryStatus,
  TowerType,
} from "@/types/inventory";

const MODEL_PATH = "/models/Tower-Planes.glb";
const APARTMENT_ID_PATTERN = /^(Tower_[A-Z]_\d{2}_\d{3,4})_/;
const TARGET_MODEL_HEIGHT = 10;
const TOTAL_FRAMES = 360;
const SNAP_FRAMES = [1, 90, 180, 270, 360] as const;
const DRAG_THRESHOLD_PX = 8;
const DRAG_PIXELS_PER_FRAME = 10;
const SNAP_ANIMATION_FRAME_MS = 14;

// Placeholder alignment until Unreal tracking data is available.
const BASE_CAMERA_POSITION: [number, number, number] = [10.5, 7.25, 13.5];
const BASE_MODEL_OFFSET: [number, number, number] = [1.8, 0, 0];

type InventoryLoadState = "loading" | "ready" | "error";
type PointerPosition = { x: number; y: number };

type HoverMeshData = {
  geometry: Mesh["geometry"];
  key: string;
  matrix: Matrix4;
};

type PreparedTowerModel = {
  apartments: Map<string, HoverMeshData[]>;
  offset: [number, number, number];
  pickableMeshes: Mesh[];
  scaledHeight: number;
  scene: Group;
  scale: number;
};

type DragState = {
  didDrag: boolean;
  lastFrame: number;
  pointerId: number;
  startFrame: number;
  startX: number;
};

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

function getFrameRotation(frame: number) {
  return -(((wrapFrame(frame) - 1) / TOTAL_FRAMES) * Math.PI * 2);
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

function getShortestSnapStep(currentFrame: number, targetFrame: number) {
  const normalizedCurrent = wrapFrame(currentFrame);
  const normalizedTarget = wrapFrame(targetFrame);
  const forwardDistance =
    (normalizedTarget - normalizedCurrent + TOTAL_FRAMES) % TOTAL_FRAMES;
  const backwardDistance =
    (normalizedCurrent - normalizedTarget + TOTAL_FRAMES) % TOTAL_FRAMES;

  return forwardDistance <= backwardDistance ? 1 : -1;
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

function findInventoryApartment(
  apartments: InventoryApartment[],
  apartmentId: string | null,
  fallbackTower: TowerType | null,
) {
  if (!apartmentId) {
    return null;
  }

  const candidates = buildFlatCandidates(apartmentId, fallbackTower);
  const tower = inferTowerFromApartmentId(apartmentId, fallbackTower);

  return (
    apartments.find((apartment) => {
      if (apartment.tower !== tower) {
        return false;
      }

      const flatToken = normalizeFlatToken(apartment.flatNumber);
      const titleToken = normalizeFlatToken(apartment.title);
      return candidates.has(flatToken) || candidates.has(titleToken);
    }) ?? null
  );
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

function prepareTowerScene(sourceScene: Object3D) {
  const scene = cloneSkeleton(sourceScene) as Group;
  const apartments = new Map<string, HoverMeshData[]>();
  const pickableMeshes: Mesh[] = [];

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

    const proxyMaterials = materials.map((material) => {
      const nextMaterial = (material as Material).clone();
      nextMaterial.transparent = true;
      nextMaterial.opacity = 0;
      nextMaterial.depthWrite = false;
      nextMaterial.colorWrite = false;
      nextMaterial.side = DoubleSide;
      return nextMaterial;
    });

    object.material = Array.isArray(object.material)
      ? proxyMaterials
      : proxyMaterials[0];

    const apartmentId = resolveApartmentIdFromObject(object);

    if (!apartmentId) {
      return;
    }

    object.userData.apartmentId = apartmentId;
    pickableMeshes.push(object);

    const meshEntry = apartments.get(apartmentId) ?? [];
    meshEntry.push({
      geometry: object.geometry,
      key: object.uuid,
      matrix: object.matrixWorld.clone(),
    });
    apartments.set(apartmentId, meshEntry);
  });

  const bounds = new Box3().setFromObject(scene);
  const size = bounds.getSize(new Vector3());
  const center = bounds.getCenter(new Vector3());
  const scale = TARGET_MODEL_HEIGHT / Math.max(size.y, 1);

  return {
    apartments,
    offset: [-center.x, -bounds.min.y, -center.z] as [number, number, number],
    pickableMeshes,
    scaledHeight: size.y * scale,
    scene,
    scale,
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

function HoverOverlay({
  hoveredApartmentId,
  apartments,
}: {
  hoveredApartmentId: string | null;
  apartments: PreparedTowerModel["apartments"];
}) {
  const hoveredMeshes = hoveredApartmentId
    ? apartments.get(hoveredApartmentId) ?? []
    : [];

  if (!hoveredMeshes.length) {
    return null;
  }

  return (
    <group>
      {hoveredMeshes.map((meshData) => (
        <mesh
          key={meshData.key}
          frustumCulled={false}
          geometry={meshData.geometry}
          matrix={meshData.matrix}
          matrixAutoUpdate={false}
          raycast={() => null}
          renderOrder={12}
        >
          <meshPhysicalMaterial
            clearcoat={1}
            clearcoatRoughness={0.04}
            color="#ffe066"
            depthTest={false}
            depthWrite={false}
            emissive="#ffaa00"
            emissiveIntensity={2}
            metalness={0}
            opacity={0.8}
            polygonOffset
            polygonOffsetFactor={-8}
            roughness={0.06}
            side={DoubleSide}
            toneMapped={false}
            transparent
          />
          <Outlines
            angle={Math.PI}
            color="#fff2a6"
            opacity={1}
            screenspace
            thickness={4.2}
            transparent
          />
        </mesh>
      ))}
    </group>
  );
}

function HoverTracker({
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
      const pointerPosition = {
        x: latestClientX - rect.left,
        y: latestClientY - rect.top,
      };

      pointer.x = (pointerPosition.x / rect.width) * 2 - 1;
      pointer.y = -(pointerPosition.y / rect.height) * 2 + 1;

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
}

function TowerScene({
  currentFrame,
  hoveredApartmentId,
  allowHover,
  onApartmentHover,
}: {
  currentFrame: number;
  hoveredApartmentId: string | null;
  allowHover: boolean;
  onApartmentHover: (
    apartmentId: string | null,
    pointerPosition: PointerPosition | null,
  ) => void;
}) {
  const { scene } = useGLTF(MODEL_PATH);
  const preparedModel = useMemo(() => prepareTowerScene(scene), [scene]);
  const cameraTargetY = preparedModel.scaledHeight * 0.52;
  const rotationY = getFrameRotation(currentFrame);

  return (
    <>
      <PerspectiveCamera
        makeDefault
        far={120}
        fov={34}
        near={0.1}
        position={BASE_CAMERA_POSITION}
        onUpdate={(camera) => {
          camera.lookAt(
            BASE_MODEL_OFFSET[0],
            cameraTargetY + BASE_MODEL_OFFSET[1],
            BASE_MODEL_OFFSET[2],
          );
        }}
      />

      <ambientLight intensity={1.75} />
      <directionalLight color="#fff7d8" intensity={2.85} position={[12, 16, 8]} />
      <directionalLight color="#d9ecff" intensity={1.2} position={[-10, 10, -10]} />
      <group
        position={BASE_MODEL_OFFSET}
        rotation={[0, rotationY, 0]}
        scale={preparedModel.scale}
      >
        <group position={preparedModel.offset}>
          <primitive object={preparedModel.scene} />
          <HoverOverlay
            apartments={preparedModel.apartments}
            hoveredApartmentId={hoveredApartmentId}
          />
        </group>
      </group>

      <HoverTracker
        allowHover={allowHover}
        onHoverChange={onApartmentHover}
        pickableMeshes={preparedModel.pickableMeshes}
      />
    </>
  );
}

type MasterPlanFrameHoverStageProps = {
  apartments: InventoryApartment[];
  currentFrame: number;
  inventoryError: string | null;
  inventoryState: InventoryLoadState;
  onSetFrame: (frame: number) => void;
  selectedTower: TowerType | null;
};

export default function MasterPlanFrameHoverStage({
  apartments,
  currentFrame,
  inventoryError,
  inventoryState,
  onSetFrame,
  selectedTower,
}: MasterPlanFrameHoverStageProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const snapAnimationFrameRef = useRef<number | null>(null);
  const snapAnimationLastTickRef = useRef(0);
  const hoveredApartmentIdRef = useRef<string | null>(null);
  const [hoveredApartmentId, setHoveredApartmentId] = useState<string | null>(
    null,
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
  const [supportsPreciseHover, setSupportsPreciseHover] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const safeFrame = wrapFrame(currentFrame);
  const frameSrc = `/frames/frame_${String(safeFrame).padStart(5, "0")}.jpg`;

  const stopSnapAnimation = () => {
    if (snapAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(snapAnimationFrameRef.current);
      snapAnimationFrameRef.current = null;
    }
    snapAnimationLastTickRef.current = 0;
    setIsSnapping(false);
  };

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
    const framesToPreload = [
      safeFrame,
      wrapFrame(safeFrame + 1),
      wrapFrame(safeFrame - 1),
      wrapFrame(safeFrame + 2),
      wrapFrame(safeFrame - 2),
    ];

    framesToPreload.forEach((frame) => {
      const image = new window.Image();
      image.src = `/frames/frame_${String(frame).padStart(5, "0")}.jpg`;
    });
  }, [safeFrame]);

  useEffect(() => {
    return () => {
      if (snapAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(snapAnimationFrameRef.current);
      }
    };
  }, []);

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
        setIsDragging(true);
        stopSnapAnimation();
        hoveredApartmentIdRef.current = null;
        setHoveredApartmentId(null);
      }

      const frameDelta = Math.round(deltaX / DRAG_PIXELS_PER_FRAME);

      if (frameDelta === 0) {
        return;
      }

      const nextFrame = wrapFrame(dragState.startFrame + frameDelta);

      if (dragState.lastFrame === nextFrame) {
        return;
      }

      dragState.lastFrame = nextFrame;
      event.preventDefault();
      onSetFrame(nextFrame);
    };

    const handlePointerEnd = (event: PointerEvent) => {
      const dragState = dragStateRef.current;

      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }

      dragStateRef.current = null;
      setIsDragging(false);

      const releaseFrame = dragState.didDrag ? dragState.lastFrame : safeFrame;
      const snappedFrame = getNearestSnapFrame(releaseFrame);

      if (wrapFrame(releaseFrame) === wrapFrame(snappedFrame)) {
        stopSnapAnimation();
        onSetFrame(snappedFrame);
        return;
      }

      stopSnapAnimation();
      setIsSnapping(true);

      const stepDirection = getShortestSnapStep(releaseFrame, snappedFrame);

      const animateSnap = (timestamp: number) => {
        if (snapAnimationLastTickRef.current === 0) {
          snapAnimationLastTickRef.current = timestamp;
        }

        const elapsed = timestamp - snapAnimationLastTickRef.current;

        if (elapsed >= SNAP_ANIMATION_FRAME_MS) {
          snapAnimationLastTickRef.current = timestamp;
          const nextFrame = wrapFrame(dragState.lastFrame + stepDirection);
          dragState.lastFrame = nextFrame;
          onSetFrame(nextFrame);

          if (nextFrame === wrapFrame(snappedFrame)) {
            stopSnapAnimation();
            return;
          }
        }

        snapAnimationFrameRef.current = window.requestAnimationFrame(animateSnap);
      };

      snapAnimationFrameRef.current = window.requestAnimationFrame(animateSnap);
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
  }, [onSetFrame, safeFrame]);

  const allowHover =
    supportsPreciseHover &&
    !prefersReducedMotion &&
    !isDragging &&
    !isSnapping &&
    isSnapFrame(safeFrame);
  const activeHoveredApartmentId = allowHover ? hoveredApartmentId : null;
  const hoveredApartment = formatApartmentLabel(
    activeHoveredApartmentId,
    selectedTower,
  );
  const hoveredInventoryApartment = findInventoryApartment(
    apartments,
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

  const updateTooltipPosition = (pointerPosition: PointerPosition | null) => {
    if (!pointerPosition || !sectionRef.current || !tooltipRef.current) {
      return;
    }

    const rect = sectionRef.current.getBoundingClientRect();
    const tooltipWidth = 180;
    const tooltipHeight = 62;
    const offsetX = 16;
    const offsetY = 16;

    const nextLeft = Math.min(
      Math.max(pointerPosition.x + offsetX, 12),
      Math.max(rect.width - tooltipWidth - 12, 12),
    );
    const nextTop = Math.min(
      Math.max(pointerPosition.y + offsetY, 12),
      Math.max(rect.height - tooltipHeight - 12, 12),
    );

    tooltipRef.current.style.left = `${nextLeft}px`;
    tooltipRef.current.style.top = `${nextTop}px`;
  };

  return (
    <section
      ref={sectionRef}
      className="absolute inset-0 overflow-hidden bg-black"
    >
      <img
        src={frameSrc}
        alt={`Master plan frame ${safeFrame}`}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />

      <div className="absolute inset-0">
        <div
          onPointerDownCapture={(event) => {
            if (event.pointerType !== "touch" && event.button !== 0) {
              return;
            }

            stopSnapAnimation();
            dragStateRef.current = {
              didDrag: false,
              lastFrame: safeFrame,
              pointerId: event.pointerId,
              startFrame: safeFrame,
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
            stopSnapAnimation();
            hoveredApartmentIdRef.current = null;
            setHoveredApartmentId(null);
          }}
          className={`h-full w-full touch-none select-none ${
            allowHover && activeHoveredApartmentId
              ? "cursor-pointer"
              : isDragging
                ? "cursor-ew-resize"
                : "cursor-[grab] active:cursor-[grabbing]"
          }`}
        >
          <Canvas
            dpr={1}
            frameloop="demand"
            performance={{ min: 0.8 }}
            gl={{
              alpha: true,
              antialias: false,
              powerPreference: "high-performance",
            }}
          >
            <Suspense fallback={<LoadingState />}>
              <TowerScene
                allowHover={allowHover}
                currentFrame={safeFrame}
                hoveredApartmentId={activeHoveredApartmentId}
                onApartmentHover={(apartmentId, pointerPosition) => {
                  if (!allowHover) {
                    return;
                  }

                  updateTooltipPosition(pointerPosition);

                  if (hoveredApartmentIdRef.current === apartmentId) {
                    return;
                  }

                  hoveredApartmentIdRef.current = apartmentId;
                  setHoveredApartmentId(apartmentId);
                }}
              />
            </Suspense>
          </Canvas>
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

useGLTF.preload(MODEL_PATH);
