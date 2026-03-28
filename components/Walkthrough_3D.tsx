"use client";

import NextImage from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import navData from "@/data/nav.json";
import {
  AbstractMesh,
  Color3,
  Color4,
  DynamicTexture,
  Effect,
  Engine,
  HemisphericLight,
  Material,
  Matrix,
  Mesh,
  MeshBuilder,
  Quaternion,
  Ray,
  Scene,
  SceneLoader,
  ShaderMaterial,
  StandardMaterial,
  Texture,
  UniversalCamera,
  Vector3,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";

type ApartmentTourProps = {
  modelUrl: string;
  panoBasePath?: string;
  thumbnailBasePath?: string;
  className?: string;
};

type NavPoint = {
  id: string;
  x: number;
  y: number;
  z: number;
  pitch: number;
  yaw: number;
  roll: number;
  frame: number;
  image_filename: string;
  facing_axis?: string;
  forward_vector?: { x: number; y: number; z: number };
  right_vector?: { x: number; y: number; z: number };
  left_vector?: { x: number; y: number; z: number };
};

type MappedNavPoint = {
  nav: NavPoint;
  baseWorldPosition: Vector3;
  worldPosition: Vector3;
  projectionPosition: Vector3;
  worldForward: Vector3;
  worldRight: Vector3;
  worldUp: Vector3;
};

type RoomTab = {
  id: string;
  label: string;
  image: string;
};

type PanoMeta = {
  width: number;
  height: number;
  cols: number;
  rows: number;
  actualCols?: number;
  actualRows?: number;
  tileSize: number;
  preview: string;
  tileFormat?: string;
  tileUrl?: string;
  tiles?: Array<{
    col: number;
    row: number;
    file: string;
  }>;
};

type DebugInfo = {
  cameraWorld: { x: number; y: number; z: number };
  cameraNav: { x: number; y: number; z: number };
  hoverPointWorld: null | { x: number; y: number; z: number };
  hoverPointNav: null | { x: number; y: number; z: number };
  hoverNormal: null | { x: number; y: number; z: number };
  activeNavId: string;
  activeNavRaw: null | { x: number; y: number; z: number };
  activeNavMapped: null | { x: number; y: number; z: number };
  activeNavWorldForward: null | { x: number; y: number; z: number };
  activeNavWorldRight: null | { x: number; y: number; z: number };
  activeNavWorldUp: null | { x: number; y: number; z: number };
};

type NavMarkerVisual = {
  point: MappedNavPoint;
  root: Mesh;
  fill: Mesh;
  outline: Mesh;
  fillMaterial: StandardMaterial;
  outlineMaterial: StandardMaterial;
  normal: Vector3;
};

type Bounds3 = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
};

const SOURCE_BOTTOM_LEFT = {
  x: 1899.143896,
  y: -7958.955338,
  z: 10799.999023,
};

const SOURCE_TOP_RIGHT = {
  x: 581.121048,
  y: -9052.578353,
  z: 11084.998992,
};

const SOURCE_COORDINATE_BOUNDS: Bounds3 = {
  minX: Math.min(SOURCE_BOTTOM_LEFT.x, SOURCE_TOP_RIGHT.x),
  maxX: Math.max(SOURCE_BOTTOM_LEFT.x, SOURCE_TOP_RIGHT.x),
  minY: Math.min(SOURCE_BOTTOM_LEFT.y, SOURCE_TOP_RIGHT.y),
  maxY: Math.max(SOURCE_BOTTOM_LEFT.y, SOURCE_TOP_RIGHT.y),
  minZ: Math.min(SOURCE_BOTTOM_LEFT.z, SOURCE_TOP_RIGHT.z),
  maxZ: Math.max(SOURCE_BOTTOM_LEFT.z, SOURCE_TOP_RIGHT.z),
};

const ROOM_LABELS: Record<string, string> = {
  LS_BP_panoPath_Interior_F0000: "Living Room",
  LS_BP_panoPath_Interior_F0001: "Bedroom 1",
  LS_BP_panoPath_Interior_F0002: "Bedroom 2",
  LS_BP_panoPath_Interior_F0003: "Bathroom 1",
  LS_BP_panoPath_Interior_F0004: "Bathroom 2",
  LS_BP_panoPath_Interior_F0005: "Bathroom 3",
  LS_BP_panoPath_Interior_F0006: "Bathroom 4",
  LS_BP_panoPath_Interior_F0007: "Kitchen",
  LS_BP_panoPath_Interior_F0008: "Maid Room",
  LS_BP_panoPath_Interior_F0009: "Master Bedroom",
  LS_BP_panoPath_Interior_F0010: "Dining Room",
  LS_BP_panoPath_Interior_F0011: "Hall 1",
  LS_BP_panoPath_Interior_F0012: "Hall 2",
  LS_BP_panoPath_Interior2_F0013: "Hall 3",
  LS_BP_panoPath_Interior2_F0014: "Passage 1",
  LS_BP_panoPath_Interior2_F0015: "Passage 2",
  LS_BP_panoPath_Interior2_F0016: "Passage 3",
  LS_BP_panoPath_Interior3_F0017: "Passage 4",
  LS_BP_panoPath_Interior3_F0018: "Passage 5",
  LS_BP_panoPath_Interior3_F0019: "Passage 6",
};

function panoIdFromFilename(filename: string) {
  return filename.replace(/\.[^.]+$/, "").replace(/^NewLS_/i, "LS_");
}

function formatFallbackRoomLabel(source: string) {
  const match = source.match(/F(\d{4})$/i);
  return match ? `Room ${match[1]}` : source;
}

function getRoomLabel(id: string, imageFilename: string) {
  const panoId = panoIdFromFilename(imageFilename);
  return (
    ROOM_LABELS[panoId] ??
    ROOM_LABELS[id] ??
    formatFallbackRoomLabel(panoId)
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

Effect.ShadersStore["panoProjectorVertexShader"] = `
precision highp float;

attribute vec3 position;
attribute vec3 normal;

uniform mat4 world;
uniform mat4 worldViewProjection;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;

void main(void) {
  vec4 worldPos = world * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  vWorldNormal = normalize(mat3(world) * normal);
  gl_Position = worldViewProjection * vec4(position, 1.0);
}
`;

Effect.ShadersStore["panoProjectorFragmentShader"] = `
precision highp float;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;

uniform vec3 panoPos;
uniform vec3 panoForward;
uniform vec3 panoRight;
uniform vec3 panoUp;
uniform sampler2D panoTexture;
uniform float opacity;
uniform float panoFlipU;

const float PI = 3.1415926535897932384626433832795;

void main(void) {
  vec3 dir = normalize(vWorldPos - panoPos);

  float x = dot(dir, panoRight);
  float y = dot(dir, panoUp);
  float z = dot(dir, panoForward);

  float yaw = atan(x, z);
  float pitch = asin(clamp(y, -1.0, 1.0));

  float u = fract(0.5 - yaw / (2.0 * PI));
  if (panoFlipU > 0.5) {
    u = fract(1.0 - u);
  }
  float v = clamp(0.5 - pitch / PI, 0.0, 1.0);

  vec4 panoColor = texture2D(panoTexture, vec2(u, v));

  if (panoColor.a < 0.001) {
    discard;
  }

  gl_FragColor = vec4(panoColor.rgb, opacity);
}
`;

export default function ApartmentTour({
  modelUrl,
  panoBasePath = "/panos/",
  thumbnailBasePath = "/panos/",
  className,
}: ApartmentTourProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const moveToNavRef = useRef<((id: string) => void) | null>(null);
  const transitionOverlayRef = useRef<HTMLDivElement | null>(null);

  const NAV_POINTS = useMemo(() => navData as NavPoint[], []);
  const START_NAV_ID = "BP_panoPath_Interior_F0010";

  const showProjectionRef = useRef(true);
  const activeRoomIdRef = useRef(START_NAV_ID);
  const refreshProjectionModeRef = useRef<(() => void) | null>(null);

  const tabs = useMemo<RoomTab[]>(
    () =>
      NAV_POINTS.map((item) => {
        const panoId = panoIdFromFilename(item.image_filename);
        return {
          id: item.id,
          label: getRoomLabel(item.id, item.image_filename),
          image: `${thumbnailBasePath}${panoId}/preview.jpg`,
        };
      }),
    [NAV_POINTS, thumbnailBasePath],
  );

  const [activeRoomId, setActiveRoomId] = useState<string>(START_NAV_ID);
  const [showProjection, setShowProjection] = useState(true);
  const [showDebug, setShowDebug] = useState(true);

  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    cameraWorld: { x: 0, y: 0, z: 0 },
    cameraNav: { x: 0, y: 0, z: 0 },
    hoverPointWorld: null,
    hoverPointNav: null,
    hoverNormal: null,
    activeNavId: START_NAV_ID,
    activeNavRaw: null,
    activeNavMapped: null,
    activeNavWorldForward: null,
    activeNavWorldRight: null,
    activeNavWorldUp: null,
  });

  useEffect(() => {
    showProjectionRef.current = showProjection;
    refreshProjectionModeRef.current?.();
  }, [showProjection]);

  useEffect(() => {
    activeRoomIdRef.current = activeRoomId;
  }, [activeRoomId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const POSITION_FLIP_X = true;
    const POSITION_FLIP_Y = false;
    const ORIENTATION_FLIP_X = POSITION_FLIP_X;
    const ORIENTATION_FLIP_Y = POSITION_FLIP_Y;
    const MAX_TEXTURE_CACHE = 4;
    const MAX_PROJECTED_PANO_WIDTH = 8192;
    const NAV_MARKER_RADIUS = 0.17;
    const NAV_MARKER_HEIGHT_OFFSET = 0.06;
    const MAX_VISIBLE_NAV_MARKERS = 4;
    const CLICK_MOVE_THRESHOLD_PX = 8;
    const NAV_TRANSITION_DURATION_MS = 650;
    const PANO_PROJECTION_Y_OFFSET = 0;
    const SHOW_DEBUG_COORDS = showDebug;
    const PANO_YAW_OFFSET_DEG = 0;
    const PANO_TEXTURE_FLIP_X = true;
    const PANO_LOCAL_OFFSET = {
      forward: -0.08,
      right: 0.02,
      up: 0.015,
    };

    const sourceBounds: Bounds3 = SOURCE_COORDINATE_BOUNDS;

    const CORNER_LABEL_HEIGHT = 0.45;
    const PANO_LABEL_HEIGHT = 0.28;

    const engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      adaptToDeviceRatio: true,
    });

    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.95, 0.95, 0.97, 1);
    scene.collisionsEnabled = false;

    const light = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
    light.intensity = 1.0;

    const camera = new UniversalCamera(
      "tourCamera",
      Vector3.Zero(),
      scene,
    );
    camera.minZ = 0.1;
    camera.maxZ = 500;
    camera.speed = 0;
    camera.inertia = 0.65;
    camera.angularSensibility = 2500;
    camera.applyGravity = false;
    camera.checkCollisions = false;
    camera.keysUp = [];
    camera.keysDown = [];
    camera.keysLeft = [];
    camera.keysRight = [];
    camera.attachControl(canvas, true);

    const hoverCursorRoot = new Mesh("hoverCursorRoot", scene);
    hoverCursorRoot.isPickable = false;
    hoverCursorRoot.rotationQuaternion = Quaternion.Identity();
    hoverCursorRoot.setEnabled(false);

    const hoverDisc = MeshBuilder.CreateDisc(
      "hoverDisc",
      { radius: 0.2, tessellation: 48 },
      scene,
    );
    hoverDisc.parent = hoverCursorRoot;
    hoverDisc.position.z = 0.002;
    hoverDisc.isPickable = false;

    // const hoverRing = MeshBuilder.CreateTorus(
    //   "hoverRing",
    //   { diameter: 0.4, thickness: 0.01, tessellation: 64 },
    //   scene,
    // );
    // hoverRing.parent = hoverCursorRoot;
    // hoverRing.isPickable = false;

    // const hoverCore = MeshBuilder.CreateSphere(
    //   "hoverCore",
    //   { diameter: 0.12, segments: 16 },
    //   scene,
    // );
    // hoverCore.parent = hoverCursorRoot;
    // hoverCore.position.z = 0.03;
    // hoverCore.isPickable = false;

    const discMat = new StandardMaterial("hoverDiscMat", scene);
    discMat.diffuseColor = new Color3(1, 1, 1);
    discMat.emissiveColor = new Color3(1, 1, 1);
    discMat.alpha = 0.12;
    discMat.backFaceCulling = false;
    hoverDisc.material = discMat;

    const ringMat = new StandardMaterial("hoverRingMat", scene);
    ringMat.diffuseColor = new Color3(1, 1, 1);
    ringMat.emissiveColor = new Color3(1, 1, 1);
    ringMat.alpha = 0.95;
    ringMat.backFaceCulling = false;
    // hoverRing.material = ringMat;

    const coreMat = new StandardMaterial("hoverCoreMat", scene);
    coreMat.diffuseColor = new Color3(1, 1, 1);
    coreMat.emissiveColor = new Color3(1, 1, 1);
    coreMat.alpha = 0.95;
    // hoverCore.material = coreMat;

    let disposed = false;
    let sceneMin = new Vector3(-10, 0, -10);
    let sceneMax = new Vector3(10, 5, 10);

    const panoTextures = new Map<string, DynamicTexture>();
    const panoTexturePromises = new Map<string, Promise<DynamicTexture>>();
    const textureUseOrder: string[] = [];

    const modelMeshes: AbstractMesh[] = [];
    const originalMaterials = new Map<AbstractMesh, Material | null>();
    const projectionMaterials = new Map<AbstractMesh, ShaderMaterial>();

    const debugPlanes: Mesh[] = [];
    const debugTextures: DynamicTexture[] = [];
    const debugMarkers: Mesh[] = [];
    const navMarkerVisuals: NavMarkerVisual[] = [];
    const navMarkerMeshLookup = new Map<number, NavMarkerVisual>();

    let mappedNavPoints: MappedNavPoint[] = [];
    let hoveredNavMarkerId: string | null = null;
    let pointerDownCanvasPos: { x: number; y: number } | null = null;
    let navTransitionRunId = 0;
    let navMoveRequestId = 0;

    const touchTexture = (id: string) => {
      const idx = textureUseOrder.indexOf(id);
      if (idx >= 0) textureUseOrder.splice(idx, 1);
      textureUseOrder.push(id);
    };

    const evictOldTextures = (keepIds: string[]) => {
      while (textureUseOrder.length > MAX_TEXTURE_CACHE) {
        const oldest = textureUseOrder[0];
        if (!oldest || keepIds.includes(oldest)) {
          textureUseOrder.shift();
          continue;
        }

        const tex = panoTextures.get(oldest);
        if (tex) tex.dispose();
        panoTextures.delete(oldest);
        textureUseOrder.shift();
      }
    };

    const fmt3 = (n: number) => n.toFixed(3);
    const shortNavId = (id: string) => id.split("_").pop() ?? id;

    const mapRange = (
      value: number,
      inputMin: number,
      inputMax: number,
      outputMin: number,
      outputMax: number,
      flip = false,
    ) => {
      const inputSpan = inputMax - inputMin || 1;
      const t = (value - inputMin) / inputSpan;
      const resolvedT = flip ? 1 - t : t;
      return outputMin + resolvedT * (outputMax - outputMin);
    };

    const inverseMapRange = (
      value: number,
      outputMin: number,
      outputMax: number,
      inputMin: number,
      inputMax: number,
      flip = false,
    ) => {
      const outputSpan = outputMax - outputMin || 1;
      const t = (value - outputMin) / outputSpan;
      const resolvedT = flip ? 1 - t : t;
      return inputMin + resolvedT * (inputMax - inputMin);
    };

    const sourceToWorldX = (value: number) =>
      mapRange(
        value,
        sourceBounds.minX,
        sourceBounds.maxX,
        sceneMin.x,
        sceneMax.x,
        POSITION_FLIP_X,
      );
    const sourceToWorldZ = (value: number) =>
      mapRange(
        value,
        sourceBounds.minY,
        sourceBounds.maxY,
        sceneMin.z,
        sceneMax.z,
        POSITION_FLIP_Y,
      );
    const sourceToWorldY = (value: number) =>
      mapRange(
        value,
        sourceBounds.minZ,
        sourceBounds.maxZ,
        sceneMin.y,
        sceneMax.y,
      );
    const worldToSourceX = (value: number) =>
      inverseMapRange(
        value,
        sceneMin.x,
        sceneMax.x,
        sourceBounds.minX,
        sourceBounds.maxX,
        POSITION_FLIP_X,
      );
    const worldToSourceY = (value: number) =>
      inverseMapRange(
        value,
        sceneMin.z,
        sceneMax.z,
        sourceBounds.minY,
        sourceBounds.maxY,
        POSITION_FLIP_Y,
      );
    const worldToSourceZ = (value: number) =>
      inverseMapRange(
        value,
        sceneMin.y,
        sceneMax.y,
        sourceBounds.minZ,
        sourceBounds.maxZ,
      );
    const hasOddAxisReflection =
      Number(ORIENTATION_FLIP_X) + Number(ORIENTATION_FLIP_Y) === 1;
    const applyYawOffset = (vector: Vector3) => {
      if (Math.abs(PANO_YAW_OFFSET_DEG) < 0.0001) {
        return vector.normalize();
      }

      return Vector3.TransformCoordinates(
        vector,
        Matrix.RotationY((PANO_YAW_OFFSET_DEG * Math.PI) / 180),
      ).normalize();
    };

    const navToWorldPosition = (nav: NavPoint) => {
      return new Vector3(
        sourceToWorldX(nav.x),
        sourceToWorldY(nav.z),
        sourceToWorldZ(nav.y),
      );
    };

    const worldToNavSpace = (world: Vector3) => {
      return {
        x: worldToSourceX(world.x),
        y: worldToSourceY(world.z),
        z: worldToSourceZ(world.y),
      };
    };

    const mapForwardVectorToWorld = (nav: NavPoint) => {
      if (nav.forward_vector) {
        const fx = ORIENTATION_FLIP_X
          ? -nav.forward_vector.x
          : nav.forward_vector.x;
        const fy = nav.forward_vector.z;
        const fz = ORIENTATION_FLIP_Y
          ? -nav.forward_vector.y
          : nav.forward_vector.y;

        const forward = new Vector3(fx, fy, fz);
        if (forward.lengthSquared() > 0.0001) {
          return applyYawOffset(forward);
        }
      }

      const yawRad = (nav.yaw * Math.PI) / 180;
      const pitchRad = (nav.pitch * Math.PI) / 180;

      const nx = Math.cos(pitchRad) * Math.cos(yawRad);
      const ny = Math.cos(pitchRad) * Math.sin(yawRad);
      const nz = Math.sin(pitchRad);

      return applyYawOffset(
        new Vector3(
        ORIENTATION_FLIP_X ? -nx : nx,
        nz,
        ORIENTATION_FLIP_Y ? -ny : ny,
        ),
      );
    };

    const buildBasisFromNav = (nav: NavPoint, forward: Vector3) => {
      if (nav.right_vector) {
        let right = applyYawOffset(
          new Vector3(
            ORIENTATION_FLIP_X
              ? -nav.right_vector.x
              : nav.right_vector.x,
            nav.right_vector.z,
            ORIENTATION_FLIP_Y
              ? -nav.right_vector.y
              : nav.right_vector.y,
          ),
        );

        // Force an orthonormal projector basis so the pano does not look
        // stretched/zoomed when nav vectors are slightly imperfect.
        right = right.subtract(forward.scale(Vector3.Dot(right, forward)));
        if (right.lengthSquared() < 0.0001) {
          right = Vector3.Cross(forward, Vector3.Up());
          if (right.lengthSquared() < 0.0001) {
            right = Vector3.Cross(forward, new Vector3(0, 0, 1));
          }
        }
        right.normalize();

        const up = hasOddAxisReflection
          ? Vector3.Cross(forward, right).normalize()
          : Vector3.Cross(right, forward).normalize();
        return { right, up };
      }

      const upCandidate =
        Math.abs(Vector3.Dot(forward, Vector3.Up())) > 0.98
          ? new Vector3(0, 0, 1)
          : Vector3.Up();

      const right = hasOddAxisReflection
        ? Vector3.Cross(upCandidate, forward).normalize()
        : Vector3.Cross(forward, upCandidate).normalize();
      const up = hasOddAxisReflection
        ? Vector3.Cross(forward, right).normalize()
        : Vector3.Cross(right, forward).normalize();
      return { right, up };
    };

    const disposeDebugOverlays = () => {
      while (debugPlanes.length > 0) debugPlanes.pop()?.dispose();
      while (debugTextures.length > 0) debugTextures.pop()?.dispose();
      while (debugMarkers.length > 0) debugMarkers.pop()?.dispose();
    };

    const createTextPlane = (
      name: string,
      text: string,
      position: Vector3,
      scale = 1.0,
      background = "rgba(0,0,0,0.72)",
    ) => {
      const plane = MeshBuilder.CreatePlane(
        name,
        {
          width: 3.2 * scale,
          height: 1.15 * scale,
        },
        scene,
      );
      plane.position.copyFrom(position);
      plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
      plane.isPickable = false;

      const tex = new DynamicTexture(
        `${name}-tex`,
        { width: 1024, height: 360 },
        scene,
        true,
      );
      tex.hasAlpha = true;

      const ctx = tex.getContext() as CanvasRenderingContext2D;
      ctx.clearRect(0, 0, 1024, 360);
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, 1024, 360);

      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, 1020, 356);

      const lines = text.split("\n");
      ctx.fillStyle = "white";
      ctx.textBaseline = "top";

      ctx.font = "bold 40px monospace";
      if (lines[0]) ctx.fillText(lines[0], 28, 20);

      ctx.font = "32px monospace";
      for (let i = 1; i < lines.length; i++) {
        ctx.fillText(lines[i], 28, 20 + i * 56);
      }

      tex.update();

      const mat = new StandardMaterial(`${name}-mat`, scene);
      mat.diffuseTexture = tex;
      mat.emissiveTexture = tex;
      mat.opacityTexture = tex;
      mat.backFaceCulling = false;
      mat.disableLighting = true;
      plane.material = mat;

      debugPlanes.push(plane);
      debugTextures.push(tex);
      return plane;
    };

    const createMarkerSphere = (
      name: string,
      position: Vector3,
      color: Color3,
      diameter: number,
    ) => {
      const sphere = MeshBuilder.CreateSphere(
        name,
        { diameter, segments: 12 },
        scene,
      );
      sphere.position.copyFrom(position);
      sphere.isPickable = false;

      const mat = new StandardMaterial(`${name}-mat`, scene);
      mat.emissiveColor = color;
      mat.disableLighting = true;
      sphere.material = mat;

      debugMarkers.push(sphere);
      return sphere;
    };

    const buildCornerDebugLabels = () => {
      const corners = [
        { name: "MIN_MIN_MIN", p: new Vector3(sceneMin.x, sceneMin.y, sceneMin.z) },
        { name: "MAX_MIN_MIN", p: new Vector3(sceneMax.x, sceneMin.y, sceneMin.z) },
        { name: "MIN_MIN_MAX", p: new Vector3(sceneMin.x, sceneMin.y, sceneMax.z) },
        { name: "MAX_MIN_MAX", p: new Vector3(sceneMax.x, sceneMin.y, sceneMax.z) },
        { name: "MIN_MAX_MIN", p: new Vector3(sceneMin.x, sceneMax.y, sceneMin.z) },
        { name: "MAX_MAX_MIN", p: new Vector3(sceneMax.x, sceneMax.y, sceneMin.z) },
        { name: "MIN_MAX_MAX", p: new Vector3(sceneMin.x, sceneMax.y, sceneMax.z) },
        { name: "MAX_MAX_MAX", p: new Vector3(sceneMax.x, sceneMax.y, sceneMax.z) },
      ];

      for (const corner of corners) {
        createMarkerSphere(
          `cornerMarker-${corner.name}`,
          corner.p,
          new Color3(1, 0.7, 0.1),
          0.12,
        );

        const nav = worldToNavSpace(corner.p);
        createTextPlane(
          `cornerLabel-${corner.name}`,
          [
            `${corner.name}`,
            `W ${fmt3(corner.p.x)}, ${fmt3(corner.p.y)}, ${fmt3(corner.p.z)}`,
            `N ${fmt3(nav.x)}, ${fmt3(nav.y)}, ${fmt3(nav.z)}`,
          ].join("\n"),
          corner.p.add(new Vector3(0, CORNER_LABEL_HEIGHT, 0)),
          0.75,
        );
      }
    };

    const buildPanoDebugMarkers = () => {
      for (const point of mappedNavPoints) {
        const markerPos = point.worldPosition.clone();

        createMarkerSphere(
          `panoMarker-${point.nav.id}`,
          markerPos,
          point.nav.id === activeRoomIdRef.current
            ? new Color3(0.2, 1, 0.2)
            : new Color3(1, 0.2, 0.2),
          point.nav.id === activeRoomIdRef.current ? 0.18 : 0.12,
        );

        const nav = point.nav;
        createTextPlane(
          `panoLabel-${point.nav.id}`,
          [
            `${shortNavId(nav.id)} ${getRoomLabel(nav.id, nav.image_filename)}`.trim(),
            `W ${fmt3(markerPos.x)}, ${fmt3(markerPos.y)}, ${fmt3(markerPos.z)}`,
            `N ${fmt3(nav.x)}, ${fmt3(nav.y)}, ${fmt3(nav.z)}`,
          ].join("\n"),
          markerPos.add(new Vector3(0, PANO_LABEL_HEIGHT, 0)),
          0.52,
          point.nav.id === activeRoomIdRef.current
            ? "rgba(0,70,0,0.78)"
            : "rgba(70,0,0,0.72)",
        );
      }
    };

    const buildActiveBasisDebug = () => {
      const activePoint = mappedNavPoints.find(
        (point) => point.nav.id === activeRoomIdRef.current,
      );
      if (!activePoint) return;

      const origin = activePoint.worldPosition.clone();
      const lineLength = 1.2;

      createMarkerSphere(
        `activeBasis-origin-${activePoint.nav.id}`,
        origin,
        new Color3(1, 1, 1),
        0.14,
      );

      const basisLines = [
        {
          name: "forward",
          color: new Color3(1, 0.25, 0.25),
          dir: activePoint.worldForward,
        },
        {
          name: "right",
          color: new Color3(0.25, 1, 0.35),
          dir: activePoint.worldRight,
        },
        {
          name: "up",
          color: new Color3(0.2, 0.55, 1),
          dir: activePoint.worldUp,
        },
      ];

      for (const basis of basisLines) {
        const line = MeshBuilder.CreateLines(
          `activeBasis-${basis.name}-${activePoint.nav.id}`,
          {
            points: [
              origin,
              origin.add(basis.dir.normalize().scale(lineLength)),
            ],
          },
          scene,
        );
        line.color = basis.color;
        line.isPickable = false;
        debugMarkers.push(line);
      }
    };

    const rebuildAllCoordinateOverlays = () => {
      disposeDebugOverlays();
      if (!SHOW_DEBUG_COORDS) return;
      buildCornerDebugLabels();
      buildPanoDebugMarkers();
      buildActiveBasisDebug();
    };

    const buildTileList = (panoId: string, meta: PanoMeta) => {
      if (meta.tiles && meta.tiles.length > 0) {
        return meta.tiles.map((t) => ({
          col: t.col,
          row: t.row,
          url: `${panoBasePath}${panoId}/tiles/${t.file}`,
        }));
      }

      const cols = meta.actualCols ?? meta.cols;
      const rows = meta.actualRows ?? meta.rows;
      const tileTemplate =
        meta.tileUrl ?? `tiles/tile_{col}_{row}.${meta.tileFormat ?? "jpg"}`;
      const list: Array<{ col: number; row: number; url: string }> = [];
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          list.push({
            col,
            row,
            url: `${panoBasePath}${panoId}/${tileTemplate
              .replace("{col}", String(col))
              .replace("{row}", String(row))}`,
          });
        }
      }
      return list;
    };

    const getProjectedPanoSize = (meta: PanoMeta) => {
      const gpuMaxTextureSize = engine.getCaps().maxTextureSize || meta.width;
      const maxWidth = Math.min(
        meta.width,
        gpuMaxTextureSize,
        MAX_PROJECTED_PANO_WIDTH,
      );
      const scale = maxWidth / meta.width;

      return {
        width: Math.max(1, Math.round(meta.width * scale)),
        height: Math.max(1, Math.round(meta.height * scale)),
        scaleX: Math.max(1, Math.round(meta.width * scale)) / meta.width,
        scaleY: Math.max(1, Math.round(meta.height * scale)) / meta.height,
      };
    };

    let lastCursorNormal = Vector3.Forward();

    const quaternionFromSurfaceNormal = (normal: Vector3) => {
      const zAxis = normal.normalize();

      const helperUp =
        Math.abs(Vector3.Dot(zAxis, Vector3.Up())) > 0.98
          ? Vector3.Right()
          : Vector3.Up();

      const xAxis = Vector3.Cross(helperUp, zAxis).normalize();
      const yAxis = Vector3.Cross(zAxis, xAxis).normalize();

      const m = Matrix.FromValues(
        xAxis.x, xAxis.y, xAxis.z, 0,
        yAxis.x, yAxis.y, yAxis.z, 0,
        zAxis.x, zAxis.y, zAxis.z, 0,
        0, 0, 0, 1,
      );

      const q = new Quaternion();
      Quaternion.FromRotationMatrixToRef(m, q);
      return q;
    };

    const isModelMesh = (mesh?: AbstractMesh | null) => {
      if (!mesh) return false;
      return modelMeshes.includes(mesh);
    };

    const isNavMarkerMesh = (mesh?: AbstractMesh | null) => {
      if (!mesh) return false;
      return navMarkerMeshLookup.has(mesh.uniqueId);
    };

    const getActiveMappedNavPoint = () => {
      return (
        mappedNavPoints.find((point) => point.nav.id === activeRoomIdRef.current) ??
        null
      );
    };

    const projectPointToModelSurface = (point: Vector3) => {
      const rayStart = point.add(new Vector3(0, 0.2, 0));
      const rayLength = Math.max(6, rayStart.y - sceneMin.y + 2);
      const ray = new Ray(
        rayStart,
        Vector3.Down(),
        rayLength,
      );
      const picks = scene.multiPickWithRay(
        ray,
        (mesh) => isModelMesh(mesh as AbstractMesh),
      ) ?? [];

      const floorCandidate = picks
        .filter((pick) => pick?.hit && !!pick.pickedPoint)
        .map((pick) => ({
          pick,
          point: pick.pickedPoint!,
          normal: pick.getNormal(true)?.normalize() ?? Vector3.Up(),
        }))
        .filter(
          (entry) =>
            entry.point.y <= rayStart.y + 0.01 && entry.normal.y >= 0.35,
        )
        .sort((a, b) => a.point.y - b.point.y)[0];

      if (floorCandidate) {
        return {
          position: floorCandidate.point
            .clone()
            .add(floorCandidate.normal.scale(NAV_MARKER_HEIGHT_OFFSET)),
          normal: floorCandidate.normal,
        };
      }

      return {
        position: new Vector3(
          point.x,
          sceneMin.y + NAV_MARKER_HEIGHT_OFFSET,
          point.z,
        ),
        normal: Vector3.Up(),
      };
    };

    const shouldRenderNavMarker = (point: MappedNavPoint, index: number) => {
      return index % 2 === 0 || point.nav.id === activeRoomIdRef.current;
    };

    const isMarkerOccludedFromCamera = (point: Vector3) => {
      const origin = camera.position.clone();
      const direction = point.subtract(origin);
      const distance = direction.length();

      if (distance < 0.001) {
        return false;
      }

      direction.scaleInPlace(1 / distance);

      const pick = scene.pickWithRay(
        new Ray(origin, direction, distance - 0.08),
        (mesh) => isModelMesh(mesh as AbstractMesh),
        true,
      );

      return !!pick?.hit;
    };

    const getVisibleNavMarkerIds = () => {
      const activeId = activeRoomIdRef.current;
      const activePoint = getActiveMappedNavPoint();
      if (!activePoint) {
        return new Set<string>();
      }

      const nearestIds = mappedNavPoints
        .filter((point, index) => {
          if (point.nav.id === activeId) return false;
          return shouldRenderNavMarker(point, index);
        })
        .map((point) => ({
          point,
          distance: Vector3.Distance(activePoint.worldPosition, point.worldPosition),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, MAX_VISIBLE_NAV_MARKERS)
        .map(({ point }) => point.nav.id);

      return new Set<string>(nearestIds);
    };

    const createNavMarkerVisual = (point: MappedNavPoint) => {
      const { position, normal } = projectPointToModelSurface(
        point.baseWorldPosition,
      );
      const outlineRadius = NAV_MARKER_RADIUS;
      const fillRadius = outlineRadius;
      const root = new Mesh(`navMarkerRoot-${point.nav.id}`, scene);
      root.isPickable = false;
      root.rotationQuaternion = quaternionFromSurfaceNormal(normal);
      root.position.copyFrom(position);

      const outline = MeshBuilder.CreateDisc(
        `navMarkerOutline-${point.nav.id}`,
        { radius: outlineRadius, tessellation: 64 },
        scene,
      );
      outline.parent = root;
      outline.position.z = 0.0012;
      outline.isPickable = true;
      outline.alwaysSelectAsActiveMesh = true;

      const outlineMaterial = new StandardMaterial(
        `navMarkerOutlineMat-${point.nav.id}`,
        scene,
      );
      outlineMaterial.diffuseColor = new Color3(1, 1, 1);
      outlineMaterial.emissiveColor = new Color3(0.18, 0.18, 0.18);
      outlineMaterial.alpha = 0.3;
      outlineMaterial.backFaceCulling = false;
      outlineMaterial.disableLighting = true;
      outline.material = outlineMaterial;

      const fill = MeshBuilder.CreateDisc(
        `navMarkerFill-${point.nav.id}`,
        { radius: fillRadius, tessellation: 56 },
        scene,
      );
      fill.parent = root;
      fill.position.z = 0.0026;
      fill.isPickable = true;
      fill.alwaysSelectAsActiveMesh = true;

      const fillMaterial = new StandardMaterial(
        `navMarkerFillMat-${point.nav.id}`,
        scene,
      );
      fillMaterial.diffuseColor = new Color3(1, 1, 1);
      fillMaterial.emissiveColor = new Color3(0.18, 0.18, 0.18);
      fillMaterial.alpha = 0.3;
      fillMaterial.backFaceCulling = false;
      fillMaterial.disableLighting = true;
      fill.material = fillMaterial;

      const visual: NavMarkerVisual = {
        point,
        root,
        fill,
        outline,
        fillMaterial,
        outlineMaterial,
        normal,
      };

      navMarkerVisuals.push(visual);
      navMarkerMeshLookup.set(fill.uniqueId, visual);
      navMarkerMeshLookup.set(outline.uniqueId, visual);
      return visual;
    };

    const disposeNavMarkers = () => {
      navMarkerMeshLookup.clear();

      while (navMarkerVisuals.length > 0) {
        const visual = navMarkerVisuals.pop();
        visual?.fillMaterial.dispose();
        visual?.outlineMaterial.dispose();
        visual?.root.dispose(false);
      }

      hoveredNavMarkerId = null;
    };

    const syncNavMarkerVisuals = () => {
      const visibleIds = getVisibleNavMarkerIds();

      for (const visual of navMarkerVisuals) {
        const isActive = visual.point.nav.id === activeRoomIdRef.current;
        const isHovered = visual.point.nav.id === hoveredNavMarkerId;
        const scale = isActive ? 1.18 : isHovered ? 1.1 : 1;
        const isVisible =
          visibleIds.has(visual.point.nav.id) &&
          !isMarkerOccludedFromCamera(visual.root.position);

        visual.root.setEnabled(isVisible);
        if (!isVisible) {
          continue;
        }

        visual.root.scaling.setAll(scale);

        if (isActive) {
          visual.fillMaterial.diffuseColor.copyFromFloats(1, 1, 1);
          visual.fillMaterial.emissiveColor.copyFromFloats(0.18, 0.18, 0.18);
          visual.fillMaterial.alpha = 0.3;
          visual.outlineMaterial.diffuseColor.copyFromFloats(1, 1, 1);
          visual.outlineMaterial.emissiveColor.copyFromFloats(0.18, 0.18, 0.18);
          visual.outlineMaterial.alpha = 0.3;
        } else if (isHovered) {
          visual.fillMaterial.diffuseColor.copyFromFloats(1, 1, 1);
          visual.fillMaterial.emissiveColor.copyFromFloats(0.18, 0.18, 0.18);
          visual.fillMaterial.alpha = 0.3;
          visual.outlineMaterial.diffuseColor.copyFromFloats(1, 1, 1);
          visual.outlineMaterial.emissiveColor.copyFromFloats(0.18, 0.18, 0.18);
          visual.outlineMaterial.alpha = 0.3;
        } else {
          visual.fillMaterial.diffuseColor.copyFromFloats(1, 1, 1);
          visual.fillMaterial.emissiveColor.copyFromFloats(0.18, 0.18, 0.18);
          visual.fillMaterial.alpha = 0.3;
          visual.outlineMaterial.diffuseColor.copyFromFloats(1, 1, 1);
          visual.outlineMaterial.emissiveColor.copyFromFloats(0.18, 0.18, 0.18);
          visual.outlineMaterial.alpha = 0.3;
        }
      }
    };

    const setTransitionOverlayOpacity = (value: number) => {
      const overlay = transitionOverlayRef.current;
      if (!overlay) return;
      overlay.style.opacity = String(Math.max(0, Math.min(1, value)));
    };

    const rebuildNavMarkers = () => {
      disposeNavMarkers();
      mappedNavPoints.forEach((point, index) => {
        if (!shouldRenderNavMarker(point, index)) return;
        createNavMarkerVisual(point);
      });
      syncNavMarkerVisuals();
    };

    const getHoveredNavMarkerAtPointer = (pointerX: number, pointerY: number) => {
      const pick = scene.pick(
        pointerX,
        pointerY,
        (mesh) => isNavMarkerMesh(mesh as AbstractMesh),
        false,
        camera,
      );

      if (!pick?.hit || !pick.pickedMesh) {
        return null;
      }

      return navMarkerMeshLookup.get(pick.pickedMesh.uniqueId) ?? null;
    };

    const buildMappedNavPoints = (): MappedNavPoint[] => {
      return NAV_POINTS.map((nav) => {
        const forward = mapForwardVectorToWorld(nav);
        const { right, up } = buildBasisFromNav(nav, forward);
        const baseWorldPos = navToWorldPosition(nav);
        const worldPos = baseWorldPos
          .add(forward.scale(PANO_LOCAL_OFFSET.forward))
          .add(right.scale(PANO_LOCAL_OFFSET.right))
          .add(up.scale(PANO_LOCAL_OFFSET.up));
        const projectionPosition = worldPos.add(
          new Vector3(0, PANO_PROJECTION_Y_OFFSET, 0),
        );

        return {
          nav,
          baseWorldPosition: baseWorldPos,
          worldPosition: worldPos,
          projectionPosition,
          worldForward: forward,
          worldRight: right,
          worldUp: up,
        };
      });
    };

    const getDirectionalNavTarget = (pickedPoint: Vector3) => {
      const activePoint = getActiveMappedNavPoint();
      if (!activePoint) return null;

      let desiredDirection = pickedPoint.subtract(activePoint.worldPosition);
      desiredDirection.y = 0;

      if (desiredDirection.lengthSquared() < 0.01) {
        desiredDirection = camera.getForwardRay(1).direction.clone();
        desiredDirection.y = 0;
      }

      if (desiredDirection.lengthSquared() < 0.0001) {
        return null;
      }

      desiredDirection.normalize();

      let bestMatch: {
        point: MappedNavPoint;
        forwardDistance: number;
        lateralDistance: number;
      } | null = null;

      for (const point of mappedNavPoints) {
        if (point.nav.id === activePoint.nav.id) continue;

        const delta = point.worldPosition.subtract(activePoint.worldPosition);
        delta.y = 0;

        const forwardDistance = Vector3.Dot(delta, desiredDirection);
        if (forwardDistance <= 0.2) continue;

        const lateralVector = delta.subtract(
          desiredDirection.scale(forwardDistance),
        );
        const lateralDistance = lateralVector.length();
        const maxAllowedLateral = Math.max(0.9, forwardDistance * 0.45);

        if (lateralDistance > maxAllowedLateral) continue;

        if (
          !bestMatch ||
          forwardDistance < bestMatch.forwardDistance - 0.01 ||
          (
            Math.abs(forwardDistance - bestMatch.forwardDistance) <= 0.01 &&
            lateralDistance < bestMatch.lateralDistance
          )
        ) {
          bestMatch = {
            point,
            forwardDistance,
            lateralDistance,
          };
        }
      }

      return bestMatch?.point ?? null;
    };

    const updateHoverCursor = () => {
      const hoveredMarker = getHoveredNavMarkerAtPointer(
        scene.pointerX,
        scene.pointerY,
      );
      const nextHoveredMarkerId = hoveredMarker?.point.nav.id ?? null;

      if (hoveredNavMarkerId !== nextHoveredMarkerId) {
        hoveredNavMarkerId = nextHoveredMarkerId;
        syncNavMarkerVisuals();
      }

      const pick = scene.pick(
        scene.pointerX,
        scene.pointerY,
        (mesh) => isModelMesh(mesh as AbstractMesh),
        false,
        camera,
      );

      const cameraNav = worldToNavSpace(camera.position);

      if (hoveredMarker) {
        lastCursorNormal = Vector3.Lerp(
          lastCursorNormal,
          hoveredMarker.normal,
          0.35,
        ).normalize();

        hoverCursorRoot.position.copyFrom(hoveredMarker.root.position);
        hoverCursorRoot.rotationQuaternion =
          hoveredMarker.root.rotationQuaternion?.clone() ??
          quaternionFromSurfaceNormal(lastCursorNormal);
        hoverCursorRoot.setEnabled(true);
        canvas.style.cursor = "pointer";

        setDebugInfo((prev) => ({
          ...prev,
          cameraWorld: {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z,
          },
          cameraNav: {
            x: cameraNav.x,
            y: cameraNav.y,
            z: cameraNav.z,
          },
          hoverPointWorld: {
            x: hoveredMarker.root.position.x,
            y: hoveredMarker.root.position.y,
            z: hoveredMarker.root.position.z,
          },
          hoverPointNav: worldToNavSpace(hoveredMarker.root.position),
          hoverNormal: {
            x: hoveredMarker.normal.x,
            y: hoveredMarker.normal.y,
            z: hoveredMarker.normal.z,
          },
        }));
        return;
      }

      if (!pick?.hit || !pick.pickedPoint || !pick.pickedMesh) {
        hoverCursorRoot.setEnabled(false);
        lastCursorNormal = Vector3.Forward();
        canvas.style.cursor = "grab";

        setDebugInfo((prev) => ({
          ...prev,
          cameraWorld: {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z,
          },
          cameraNav: {
            x: cameraNav.x,
            y: cameraNav.y,
            z: cameraNav.z,
          },
          hoverPointWorld: null,
          hoverPointNav: null,
          hoverNormal: null,
        }));
        return;
      }

      const normal = pick.getNormal(true);
      if (!normal) {
        hoverCursorRoot.setEnabled(false);
        lastCursorNormal = Vector3.Forward();
        canvas.style.cursor = "grab";

        setDebugInfo((prev) => ({
          ...prev,
          cameraWorld: {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z,
          },
          cameraNav: {
            x: cameraNav.x,
            y: cameraNav.y,
            z: cameraNav.z,
          },
          hoverPointWorld: null,
          hoverPointNav: null,
          hoverNormal: null,
        }));
        return;
      }

      const n = normal.normalize();
      lastCursorNormal = Vector3.Lerp(lastCursorNormal, n, 0.35).normalize();
      canvas.style.cursor = "grab";

      const pos = pick.pickedPoint.add(lastCursorNormal.scale(0.03));
      hoverCursorRoot.position.copyFrom(pos);
      hoverCursorRoot.rotationQuaternion =
        quaternionFromSurfaceNormal(lastCursorNormal);
      hoverCursorRoot.setEnabled(true);

      const hoverNav = worldToNavSpace(pick.pickedPoint);

      setDebugInfo((prev) => ({
        ...prev,
        cameraWorld: {
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z,
        },
        cameraNav: {
          x: cameraNav.x,
          y: cameraNav.y,
          z: cameraNav.z,
        },
        hoverPointWorld: {
          x: pick.pickedPoint!.x,
          y: pick.pickedPoint!.y,
          z: pick.pickedPoint!.z,
        },
        hoverPointNav: {
          x: hoverNav.x,
          y: hoverNav.y,
          z: hoverNav.z,
        },
        hoverNormal: {
          x: lastCursorNormal.x,
          y: lastCursorNormal.y,
          z: lastCursorNormal.z,
        },
      }));
    };

    const shouldProjectOnMesh = (mesh: AbstractMesh) => {
      const name = (mesh.name || "").toLowerCase();

      if (
        name.includes("collision") ||
        name.includes("helper") ||
        name.includes("proxy") ||
        name.includes("trigger")
      ) {
        return false;
      }

      return true;
    };

    const getOrCreateProjectionMaterial = (mesh: AbstractMesh) => {
      let mat = projectionMaterials.get(mesh);
      if (mat) return mat;

      mat = new ShaderMaterial(
        `panoProjector-${mesh.uniqueId}`,
        scene,
        { vertex: "panoProjector", fragment: "panoProjector" },
        {
          attributes: ["position", "normal"],
          uniforms: [
            "world",
            "worldViewProjection",
            "panoPos",
            "panoForward",
            "panoRight",
            "panoUp",
            "opacity",
            "panoFlipU",
          ],
          samplers: ["panoTexture"],
        },
      );

      mat.backFaceCulling = false;
      mat.alphaMode = Engine.ALPHA_DISABLE;
      mat.setFloat("opacity", 1.0);
      mat.setFloat("panoFlipU", PANO_TEXTURE_FLIP_X ? 1.0 : 0.0);

      projectionMaterials.set(mesh, mat);
      return mat;
    };

    const applyProjectionToMeshes = (
      texture: Texture,
      navPoint: MappedNavPoint,
    ) => {
      for (const mesh of modelMeshes) {
        if (!shouldProjectOnMesh(mesh)) {
          const original = originalMaterials.get(mesh);
          if (original !== undefined) mesh.material = original;
          continue;
        }

        const mat = getOrCreateProjectionMaterial(mesh);
        mat.setTexture("panoTexture", texture);
        mat.setVector3("panoPos", navPoint.projectionPosition);
        mat.setVector3("panoForward", navPoint.worldForward);
        mat.setVector3("panoRight", navPoint.worldRight);
        mat.setVector3("panoUp", navPoint.worldUp);
        mesh.material = mat;
      }
    };

    const restoreOriginalMaterials = () => {
      for (const mesh of modelMeshes) {
        const original = originalMaterials.get(mesh);
        if (original !== undefined) {
          mesh.material = original;
        }
      }
    };

    const setProjectionOpacity = (value: number) => {
      const clamped = Math.max(0, Math.min(1, value));
      for (const material of projectionMaterials.values()) {
        material.setFloat("opacity", clamped);
      }
    };

    const easeInOutCubic = (t: number) => {
      return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const animateMoveBetweenNavPoints = async (
      fromPoint: MappedNavPoint | null,
      toPoint: MappedNavPoint,
      nextTexture: Texture | null,
    ) => {
      if (!fromPoint) {
        if (nextTexture && showProjectionRef.current) {
          applyProjectionToMeshes(nextTexture, toPoint);
          setProjectionOpacity(1);
        }
        camera.position.copyFrom(toPoint.worldPosition);
        camera.cameraDirection.set(0, 0, 0);
        camera.setTarget(toPoint.worldPosition.add(toPoint.worldForward));
        setTransitionOverlayOpacity(0);
        return;
      }

      const transitionId = ++navTransitionRunId;
      const startPos = camera.position.clone();
      const startTarget = camera.getTarget().clone();
      const startForward = startTarget
        .subtract(startPos)
        .normalize();
      if (startForward.lengthSquared() < 0.0001) {
        startForward.copyFrom(fromPoint.worldForward);
      }
      const endPos = toPoint.worldPosition.clone();
      const endForward = toPoint.worldForward.clone();
      const travelDistance = Vector3.Distance(startPos, endPos);
      const overshoot = Math.min(1.1, Math.max(0.18, travelDistance * 0.16));
      const travelDirection = endPos.subtract(startPos).normalize();
      if (travelDirection.lengthSquared() < 0.0001) {
        travelDirection.copyFrom(endForward);
      }
      const midPos = startPos.add(travelDirection.scale(overshoot));
      let switchedProjection = false;

      await new Promise<void>((resolve) => {
        const startTime = performance.now();

        const step = (now: number) => {
          if (disposed || transitionId !== navTransitionRunId) {
            resolve();
            return;
          }

          const rawProgress = Math.min(
            1,
            (now - startTime) / NAV_TRANSITION_DURATION_MS,
          );
          const eased = easeInOutCubic(rawProgress);
          const firstHalf = Math.min(1, eased / 0.52);
          const secondHalf = Math.max(0, (eased - 0.52) / 0.48);

          const animatedPos =
            eased < 0.52
              ? Vector3.Lerp(startPos, midPos, firstHalf)
              : Vector3.Lerp(midPos, endPos, secondHalf);
          const animatedForward = Vector3.Lerp(
            startForward,
            endForward,
            eased,
          ).normalize();

          camera.position.copyFrom(animatedPos);
          camera.cameraDirection.set(0, 0, 0);
          camera.setTarget(animatedPos.add(animatedForward));

          const overlayOpacity = Math.sin(rawProgress * Math.PI) * 0.34;
          setTransitionOverlayOpacity(overlayOpacity);

          if (!switchedProjection && rawProgress >= 0.48) {
            if (nextTexture && showProjectionRef.current) {
              applyProjectionToMeshes(nextTexture, toPoint);
              setProjectionOpacity(0.78);
            }
            switchedProjection = true;
          }

          if (showProjectionRef.current) {
            const tailOpacity = switchedProjection
              ? 0.78 + secondHalf * 0.22
              : 1 - firstHalf * 0.22;
            setProjectionOpacity(tailOpacity);
          }

          if (rawProgress >= 1) {
            camera.position.copyFrom(endPos);
            camera.cameraDirection.set(0, 0, 0);
            camera.setTarget(endPos.add(endForward));
            setProjectionOpacity(1);
            setTransitionOverlayOpacity(0);
            resolve();
            return;
          }

          requestAnimationFrame(step);
        };

        requestAnimationFrame(step);
      });
    };

    const loadPanoTextureFromTiles = async (imageFilename: string) => {
      const panoId = panoIdFromFilename(imageFilename);

      if (panoTextures.has(panoId)) {
        touchTexture(panoId);
        return panoTextures.get(panoId)!;
      }

      if (panoTexturePromises.has(panoId)) {
        return panoTexturePromises.get(panoId)!;
      }

      const promise = (async () => {
        const metaUrl = `${panoBasePath}${panoId}/meta.json`;
        const metaRes = await fetch(metaUrl);

        if (!metaRes.ok) {
          throw new Error(`Failed to load pano meta: ${metaUrl}`);
        }

        const meta = (await metaRes.json()) as PanoMeta;
        const projectedSize = getProjectedPanoSize(meta);

        const drawCanvas = document.createElement("canvas");
        drawCanvas.width = projectedSize.width;
        drawCanvas.height = projectedSize.height;

        const ctx = drawCanvas.getContext("2d");
        if (!ctx) {
          throw new Error("Could not create 2D canvas context");
        }

        ctx.imageSmoothingEnabled = true;

        const previewUrl = `${panoBasePath}${panoId}/${meta.preview}`;
        const previewImg = await loadImage(previewUrl);
        ctx.drawImage(previewImg, 0, 0, projectedSize.width, projectedSize.height);

        if (
          projectedSize.width !== meta.width ||
          projectedSize.height !== meta.height
        ) {
          console.info(
            `[PANO ${panoId}] Downscaling projection texture from ${meta.width}x${meta.height} to ${projectedSize.width}x${projectedSize.height} to stay within GPU limits.`,
          );
        }

        const dynamicTexture = new DynamicTexture(
          `pano-dynamic-${panoId}`,
          drawCanvas,
          scene,
          false,
        );
        dynamicTexture.wrapU = Texture.WRAP_ADDRESSMODE;
        dynamicTexture.wrapV = Texture.CLAMP_ADDRESSMODE;
        dynamicTexture.update(false);

        panoTextures.set(panoId, dynamicTexture);
        touchTexture(panoId);

        const tiles = buildTileList(panoId, meta);
        const missingTiles: string[] = [];
        const concurrency = 8;

        const runChunk = async (chunk: typeof tiles) => {
          const results = await Promise.allSettled(
            chunk.map(async ({ col, row, url }) => {
              const img = await loadImage(url);

              const sourceLeft = col * meta.tileSize;
              const sourceTop = row * meta.tileSize;
              const sourceW = Math.min(meta.tileSize, meta.width - sourceLeft);
              const sourceH = Math.min(meta.tileSize, meta.height - sourceTop);
              const left = Math.round(sourceLeft * projectedSize.scaleX);
              const top = Math.round(sourceTop * projectedSize.scaleY);
              const drawW = Math.max(1, Math.round(sourceW * projectedSize.scaleX));
              const drawH = Math.max(1, Math.round(sourceH * projectedSize.scaleY));

              if (drawW > 0 && drawH > 0) {
                ctx.drawImage(
                  img,
                  0,
                  0,
                  img.width,
                  img.height,
                  left,
                  top,
                  drawW,
                  drawH,
                );
              }
            }),
          );

          results.forEach((r, i) => {
            if (r.status === "rejected") {
              missingTiles.push(chunk[i].url);
            }
          });

          dynamicTexture.update(false);
        };

        void (async () => {
          for (let i = 0; i < tiles.length; i += concurrency) {
            await runChunk(tiles.slice(i, i + concurrency));
          }

          dynamicTexture.update(false);

          if (missingTiles.length > 0) {
            console.warn(
              `[PANO ${panoId}] Missing tiles (${missingTiles.length}):`,
              missingTiles,
            );
          }
        })().catch((err) => {
          console.warn(`Tile stitching warning for ${panoId}`, err);
        });

        return dynamicTexture;
      })();

      panoTexturePromises.set(panoId, promise);

      try {
        return await promise;
      } finally {
        panoTexturePromises.delete(panoId);
      }
    };

    const preloadNearestPanos = async (currentId: string) => {
      const current = NAV_POINTS.find((n) => n.id === currentId);
      if (!current) return;

      const nearest = NAV_POINTS.filter((n) => n.id !== current.id)
        .map((n: NavPoint) => {
          const dx = n.x - current.x;
          const dy = n.y - current.y;
          return { id: n.id, d2: dx * dx + dy * dy, image: n.image_filename };
        })
        .sort((a, b) => a.d2 - b.d2)
        .slice(0, 2);

      for (const item of nearest) {
        void loadPanoTextureFromTiles(item.image);
      }
    };

    const moveToNavPoint = async (
      navId: string,
      options?: { animate?: boolean },
    ) => {
      const navPoint = mappedNavPoints.find((p) => p.nav.id === navId);
      if (!navPoint) return;
      const moveRequestId = ++navMoveRequestId;

      try {
        const panoId = panoIdFromFilename(navPoint.nav.image_filename);
        const currentPoint = getActiveMappedNavPoint();
        const shouldAnimate =
          options?.animate ?? (currentPoint != null && currentPoint.nav.id !== navId);
        let texture: Texture | null = null;

        if (showProjectionRef.current) {
          texture = await loadPanoTextureFromTiles(
            navPoint.nav.image_filename,
          );
          touchTexture(panoId);
          evictOldTextures([panoId]);
          void preloadNearestPanos(navPoint.nav.id);
        } else {
          restoreOriginalMaterials();
        }

        if (shouldAnimate) {
          await animateMoveBetweenNavPoints(currentPoint, navPoint, texture);
        } else {
          await animateMoveBetweenNavPoints(null, navPoint, texture);
        }

        if (moveRequestId !== navMoveRequestId) {
          return;
        }

        const cameraPos = navPoint.worldPosition.clone();

        setActiveRoomId(navPoint.nav.id);
        activeRoomIdRef.current = navPoint.nav.id;
        rebuildNavMarkers();
        syncNavMarkerVisuals();

        rebuildAllCoordinateOverlays();

        setDebugInfo((prev) => ({
          ...prev,
          activeNavId: navPoint.nav.id,
          activeNavRaw: {
            x: navPoint.nav.x,
            y: navPoint.nav.y,
            z: navPoint.nav.z,
          },
          activeNavMapped: worldToNavSpace(navPoint.worldPosition),
          activeNavWorldForward: {
            x: navPoint.worldForward.x,
            y: navPoint.worldForward.y,
            z: navPoint.worldForward.z,
          },
          activeNavWorldRight: {
            x: navPoint.worldRight.x,
            y: navPoint.worldRight.y,
            z: navPoint.worldRight.z,
          },
          activeNavWorldUp: {
            x: navPoint.worldUp.x,
            y: navPoint.worldUp.y,
            z: navPoint.worldUp.z,
          },
          cameraWorld: {
            x: cameraPos.x,
            y: cameraPos.y,
            z: cameraPos.z,
          },
          cameraNav: worldToNavSpace(cameraPos),
        }));
      } catch (error) {
        if (moveRequestId !== navMoveRequestId) {
          return;
        }
        setTransitionOverlayOpacity(0);
        setProjectionOpacity(1);
        console.error("Failed to move to pano/nav point:", error);
      }
    };

    const handleSceneClick = async (pointerX: number, pointerY: number) => {
      const markerVisual = getHoveredNavMarkerAtPointer(pointerX, pointerY);
      if (markerVisual) {
        await moveToNavPoint(markerVisual.point.nav.id);
        return;
      }

      const modelPick = scene.pick(
        pointerX,
        pointerY,
        (mesh) => isModelMesh(mesh as AbstractMesh),
        false,
        camera,
      );

      if (!modelPick?.hit || !modelPick.pickedPoint) {
        return;
      }

      const targetPoint = getDirectionalNavTarget(modelPick.pickedPoint);
      if (targetPoint) {
        await moveToNavPoint(targetPoint.nav.id);
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      pointerDownCanvasPos = {
        x: event.offsetX,
        y: event.offsetY,
      };
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (!pointerDownCanvasPos) return;

      const dx = event.offsetX - pointerDownCanvasPos.x;
      const dy = event.offsetY - pointerDownCanvasPos.y;
      pointerDownCanvasPos = null;

      if (Math.hypot(dx, dy) > CLICK_MOVE_THRESHOLD_PX) {
        return;
      }

      void handleSceneClick(event.offsetX, event.offsetY);
    };

    const handlePointerLeave = () => {
      pointerDownCanvasPos = null;

      if (hoveredNavMarkerId !== null) {
        hoveredNavMarkerId = null;
        syncNavMarkerVisuals();
      }

      hoverCursorRoot.setEnabled(false);
      canvas.style.cursor = "grab";
    };

    moveToNavRef.current = moveToNavPoint;

    const captureModelBounds = (visibleMeshes: AbstractMesh[]) => {
      let rawMin = visibleMeshes[0].getHierarchyBoundingVectors().min.clone();
      let rawMax = visibleMeshes[0].getHierarchyBoundingVectors().max.clone();

      for (const mesh of visibleMeshes) {
        const bounds = mesh.getHierarchyBoundingVectors();
        rawMin = Vector3.Minimize(rawMin, bounds.min);
        rawMax = Vector3.Maximize(rawMax, bounds.max);
      }

      sceneMin = new Vector3(
        rawMin.x,
        rawMin.y,
        rawMin.z,
      );

      sceneMax = new Vector3(
        rawMax.x,
        rawMax.y,
        rawMax.z,
      );

    };

    const refreshProjectionMode = async () => {
      const currentNavId = activeRoomIdRef.current;
      const navPoint = mappedNavPoints.find((p) => p.nav.id === currentNavId);
      if (!navPoint) return;

      if (!showProjectionRef.current) {
        restoreOriginalMaterials();
        return;
      }

      try {
        const texture = await loadPanoTextureFromTiles(
          navPoint.nav.image_filename,
        );
        applyProjectionToMeshes(texture, navPoint);
      } catch (error) {
        console.error("Failed to refresh projection mode:", error);
      }
    };

    const loadModel = async () => {
      try {
        const fileName = modelUrl.split("/").pop() ?? "";
        const rootUrl = modelUrl.slice(0, modelUrl.length - fileName.length);

        const result = await SceneLoader.ImportMeshAsync(
          "",
          rootUrl,
          fileName,
          scene,
        );

        const allMeshes = result.meshes.filter(
          (m) => m && m.name !== "__root__",
        ) as AbstractMesh[];

        if (allMeshes.length === 0) return;

        allMeshes.forEach((mesh) => {
          mesh.isPickable = true;
          mesh.checkCollisions = false;
          mesh.alwaysSelectAsActiveMesh = true;
          modelMeshes.push(mesh);
          originalMaterials.set(mesh, mesh.material ?? null);
        });

        const visibleMeshes = allMeshes.filter((m) => !!m.getBoundingInfo);
        if (visibleMeshes.length === 0) return;

        captureModelBounds(visibleMeshes);

        mappedNavPoints = buildMappedNavPoints();
        rebuildNavMarkers();
        rebuildAllCoordinateOverlays();

        await moveToNavPoint(START_NAV_ID, { animate: false });
      } catch (error) {
        console.error("Failed to load apartment tour:", error);
      }
    };

    void loadModel();

    refreshProjectionModeRef.current = () => {
      void refreshProjectionMode();
    };

    engine.runRenderLoop(() => {
      if (disposed) return;
      updateHoverCursor();
      syncNavMarkerVisuals();
      scene.render();
    });

    const handleResize = () => engine.resize();
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointerleave", handlePointerLeave);
    window.addEventListener("resize", handleResize);

    return () => {
      disposed = true;
      moveToNavRef.current = null;
      setTransitionOverlayOpacity(0);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("resize", handleResize);

      disposeDebugOverlays();
      disposeNavMarkers();

      panoTextures.forEach((t) => t.dispose());
      projectionMaterials.forEach((m) => m.dispose());

      for (const mesh of modelMeshes) {
        const original = originalMaterials.get(mesh);
        if (original !== undefined) {
          mesh.material = original;
        }
      }

      camera.detachControl();
      scene.dispose();
      engine.dispose();
    };
  }, [NAV_POINTS, START_NAV_ID, modelUrl, panoBasePath, showDebug]);

  const fmtUi = (n: number | null | undefined) =>
    typeof n === "number" ? n.toFixed(3) : "--";

  const activeNavIsOutsideSourceBounds =
    debugInfo.activeNavRaw != null &&
    (debugInfo.activeNavRaw.x < SOURCE_COORDINATE_BOUNDS.minX ||
      debugInfo.activeNavRaw.x > SOURCE_COORDINATE_BOUNDS.maxX ||
      debugInfo.activeNavRaw.y < SOURCE_COORDINATE_BOUNDS.minY ||
      debugInfo.activeNavRaw.y > SOURCE_COORDINATE_BOUNDS.maxY ||
      debugInfo.activeNavRaw.z < SOURCE_COORDINATE_BOUNDS.minZ ||
      debugInfo.activeNavRaw.z > SOURCE_COORDINATE_BOUNDS.maxZ);

  return (
    <div className={`relative h-full w-full ${className ?? ""}`}>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          cursor: "grab",
        }}
      />
      <div
        ref={transitionOverlayRef}
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 0,
          background:
            "radial-gradient(circle at center, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 20%, rgba(18,10,6,0.36) 55%, rgba(8,4,3,0.6) 100%)",
        }}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-5 pb-5 pt-8">
        <div className="pointer-events-auto mx-auto max-w-[1400px]">
          <h2 className="mb-4 text-2xl font-bold text-white">Interior</h2>

          <div className="mb-4 flex items-center gap-3">
            <button
              onClick={() => setShowProjection((prev) => !prev)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                showProjection
                  ? "bg-white/20 text-white hover:bg-white/30"
                  : "bg-yellow-400 text-black hover:bg-yellow-300"
              }`}
            >
              {showProjection ? "Show GLB Only" : "Show Pano Projection"}
            </button>

            <div className="text-sm text-white/80">
              Switch between the raw GLB and the stitched pano projection.
            </div>

            <button
              onClick={() => setShowDebug((prev) => !prev)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                showDebug
                  ? "bg-emerald-400 text-black hover:bg-emerald-300"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {showDebug ? "Hide Debug" : "Show Debug"}
            </button>
          </div>

          {showDebug ? (
            <div className="mb-4 grid gap-3 rounded-2xl border border-white/15 bg-black/35 p-4 text-xs text-white/85 backdrop-blur">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="font-semibold text-white">
                  Active: {debugInfo.activeNavId}
                </span>
                <span
                  className={
                    activeNavIsOutsideSourceBounds
                      ? "text-red-300"
                      : "text-emerald-300"
                  }
                >
                  {activeNavIsOutsideSourceBounds
                    ? "Outside source bounds"
                    : "Inside source bounds"}
                </span>
                <span className="text-white/60">
                  Source Z range: {fmtUi(SOURCE_COORDINATE_BOUNDS.minZ)} to{" "}
                  {fmtUi(SOURCE_COORDINATE_BOUNDS.maxZ)}
                </span>
              </div>

              <div className="grid gap-1 md:grid-cols-2">
                <div>
                  Raw nav:
                  {" "}
                  x {fmtUi(debugInfo.activeNavRaw?.x)}, y{" "}
                  {fmtUi(debugInfo.activeNavRaw?.y)}, z{" "}
                  {fmtUi(debugInfo.activeNavRaw?.z)}
                </div>
                <div>
                  Inverse-mapped nav:
                  {" "}
                  x {fmtUi(debugInfo.activeNavMapped?.x)}, y{" "}
                  {fmtUi(debugInfo.activeNavMapped?.y)}, z{" "}
                  {fmtUi(debugInfo.activeNavMapped?.z)}
                </div>
                <div>
                  Camera world:
                  {" "}
                  x {fmtUi(debugInfo.cameraWorld.x)}, y{" "}
                  {fmtUi(debugInfo.cameraWorld.y)}, z{" "}
                  {fmtUi(debugInfo.cameraWorld.z)}
                </div>
                <div>
                  Camera nav:
                  {" "}
                  x {fmtUi(debugInfo.cameraNav.x)}, y{" "}
                  {fmtUi(debugInfo.cameraNav.y)}, z{" "}
                  {fmtUi(debugInfo.cameraNav.z)}
                </div>
                <div>
                  Forward:
                  {" "}
                  x {fmtUi(debugInfo.activeNavWorldForward?.x)}, y{" "}
                  {fmtUi(debugInfo.activeNavWorldForward?.y)}, z{" "}
                  {fmtUi(debugInfo.activeNavWorldForward?.z)}
                </div>
                <div>
                  Right:
                  {" "}
                  x {fmtUi(debugInfo.activeNavWorldRight?.x)}, y{" "}
                  {fmtUi(debugInfo.activeNavWorldRight?.y)}, z{" "}
                  {fmtUi(debugInfo.activeNavWorldRight?.z)}
                </div>
                <div>
                  Up:
                  {" "}
                  x {fmtUi(debugInfo.activeNavWorldUp?.x)}, y{" "}
                  {fmtUi(debugInfo.activeNavWorldUp?.y)}, z{" "}
                  {fmtUi(debugInfo.activeNavWorldUp?.z)}
                </div>
                <div>
                  Hover nav:
                  {" "}
                  x {fmtUi(debugInfo.hoverPointNav?.x)}, y{" "}
                  {fmtUi(debugInfo.hoverPointNav?.y)}, z{" "}
                  {fmtUi(debugInfo.hoverPointNav?.z)}
                </div>
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto custom-scrollbar">
            <div className="flex gap-3 pb-2">
              {tabs.map((tab) => {
                const active = tab.id === activeRoomId;

                return (
                  <button
                    key={tab.id}
                    onClick={() => moveToNavRef.current?.(tab.id)}
                    className={`min-w-[110px] shrink-0 rounded-2xl border p-1 text-white transition ${
                      active
                        ? "border-white bg-white/15"
                        : "border-white/20 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="relative mb-2 h-[64px] w-[100px] overflow-hidden rounded-xl bg-black/20">
                      <NextImage
                        src={tab.image}
                        alt={tab.label}
                        fill
                        sizes="100px"
                        className="object-cover"
                      />
                    </div>
                    <div className="truncate text-center text-sm font-medium">
                      {tab.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
