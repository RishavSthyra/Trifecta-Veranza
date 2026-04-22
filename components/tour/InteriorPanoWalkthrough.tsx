"use client";

import { Viewer, events as viewerEvents, type Position } from "@photo-sphere-viewer/core";
import "@photo-sphere-viewer/core/index.css";
import { EquirectangularTilesAdapter } from "@photo-sphere-viewer/equirectangular-tiles-adapter";
import { GyroscopePlugin } from '@photo-sphere-viewer/gyroscope-plugin';
import { MarkersPlugin, type MarkerConfig } from "@photo-sphere-viewer/markers-plugin";
import "@photo-sphere-viewer/markers-plugin/index.css";
import {
  VirtualTourPlugin,
  events as virtualTourEvents,
  type VirtualTourNode,
} from "@photo-sphere-viewer/virtual-tour-plugin";
import "@photo-sphere-viewer/virtual-tour-plugin/index.css";
import { Cormorant_Garamond, DM_Sans, Manrope } from "next/font/google";
import NextImage from "next/image";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
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
import {
  getWalkthroughMode,
} from "@/lib/walkthrough";

const editorialFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const uiFont = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const wallLabelFont = DM_Sans({
  subsets: ["latin"],
  weight: ["500", "700"],
});

const FURNISHED_PANO_BASE_URL = "https://cdn.sthyra.com/interior-pano-trifecta-new/";
const BARE_SHELL_PANO_BASE_URL =
  "https://cdn.sthyra.com/bareshell-pano-trifecta-new/";
const DEFAULT_ZOOM = 10;
const MIN_PITCH = -Math.PI / 2 + 0.08;
const MAX_PITCH = Math.PI / 2 - 0.08;
const INTERIOR_SPHERE_RESOLUTION = 128;
const INTERIOR_SLOW_SPHERE_RESOLUTION = 96;
const INTERIOR_MIN_FOV = 36;
const INTERIOR_MAX_FOV = 74;
const ENTRANCE_FRAME_ID = "F0000";

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

type MenuRoomItem = RoomTab & {
  isActive: boolean;
};

type ViewerBindings = {
  viewer: Viewer;
  virtualTour: VirtualTourPlugin;
};

type NetworkInformationLike = {
  effectiveType?: string;
  saveData?: boolean;
  addEventListener?: (type: "change", listener: () => void) => void;
  removeEventListener?: (type: "change", listener: () => void) => void;
};

const INTERIOR_DIMENSION_ROOM_NAMES = [
  "Living",
  "Dinning",
  "Kitchen",
  "Utility",
  "M.Bedroom",
  "M.Toilet",
  "Bedroom 02",
  "Bedroom 03",
  "C.Toilet",
] as const;

type InteriorDimensionRoomName = (typeof INTERIOR_DIMENSION_ROOM_NAMES)[number];

type InteriorDimensionMarkerDefinition = {
  markerId: string;
  roomNumber: string;
  roomName: string;
  dimensions: string;
};

type InteriorDimensionMarkerPosition = {
  yaw: number;
  pitch: number;
};

type InteriorDimensionMarkerRotation =
  | number
  | {
      yaw?: number;
      pitch?: number;
      roll?: number;
    };

type InteriorDimensionMarkerOverride = InteriorDimensionMarkerPosition & {
  roomNumber?: string;
  roomName?: string;
  dimensions?: string;
  size?: number;
  offsetY?: number;
  rotation?: InteriorDimensionMarkerRotation;
};

const INTERIOR_ROOM_DIMENSIONS: Record<InteriorDimensionRoomName, Omit<InteriorDimensionMarkerDefinition, "markerId">> = {
  Living: {
    roomNumber: "01",
    roomName: "Living",
    dimensions: `14'7" x 10'10"`,
  },
  Dinning: {
    roomNumber: "02",
    roomName: "Dinning",
    dimensions: `11'3" x 9'0"`,
  },
  Kitchen: {
    roomNumber: "03",
    roomName: "Kitchen",
    dimensions: `13'7" x 7'0"`,
  },
  Utility: {
    roomNumber: "04",
    roomName: "Utility",
    dimensions: `5'3" x 5'0"`,
  },
  "M.Bedroom": {
    roomNumber: "05",
    roomName: "M.Bedroom",
    dimensions: `12'6" x 11'0"`,
  },
  "M.Toilet": {
    roomNumber: "06",
    roomName: "M.Toilet",
    dimensions: `5'0" x 8'0"`,
  },
  "Bedroom 02": {
    roomNumber: "07",
    roomName: "Bedroom 02",
    dimensions: `10'0" x 11'4"`,
  },
  "Bedroom 03": {
    roomNumber: "08",
    roomName: "Bedroom 03",
    dimensions: `12'0" x 9'0"`,
  },
  "C.Toilet": {
    roomNumber: "09",
    roomName: "C.Toilet",
    dimensions: `8'0" x 5'0"`,
  },
};

const SECONDARY_DIMENSION_ROOM_BY_ROOM: Record<
  InteriorDimensionRoomName,
  InteriorDimensionRoomName
> = {
  Living: "Dinning",
  Dinning: "Kitchen",
  Kitchen: "Utility",
  Utility: "Kitchen",
  "M.Bedroom": "M.Toilet",
  "M.Toilet": "M.Bedroom",
  "Bedroom 02": "C.Toilet",
  "Bedroom 03": "C.Toilet",
  "C.Toilet": "Bedroom 03",
};

const INTERIOR_DIMENSION_MARKER_OVERRIDES: Record<
  string,
  InteriorDimensionMarkerOverride[]
> = {
  LS_BP_panoPath_Interior4_F0013: [
    { yaw: 4.5, pitch: -0.08, roomNumber: "01", roomName: "Living", dimensions: `14'7" x 10'10"` },
    { yaw: 4.72, pitch: -0.02, roomNumber: "02", roomName: "Dinning", dimensions: `11'3" x 9'0"` },
  ],
  LS_BP_panoPath_Interior_F0001: [
    { yaw: 1.5, pitch: -0.08, roomNumber: "01", roomName: "Living", dimensions: `14'7" x 10'10"` },
    { yaw: 0.65, rotation:{roll: 0, yaw :50, pitch : 0}, pitch: -0.1, roomNumber: "02",  size: 0.6, roomName: "Dining", dimensions: `11'3" x 9'0"` },
  ],
  LS_BP_panoPath_Interior_F0002: [
    { yaw: 1.75, pitch: -0.08, roomNumber: "01", rotation:{roll: 0, yaw :-20, pitch : 0}, roomName: "Living", size:1, dimensions: `14'7" x 10'10"` },
    { yaw: 0.60, pitch: -0.1, rotation:{roll: 0, yaw :40, pitch : 0}, roomNumber: "02",  size:1, roomName: "Dining", dimensions: `11'3" x 9'0"` },
    { yaw: 4.1, pitch: -0.5, rotation:{roll: -10, yaw :-60, pitch : 90}, roomNumber: "03",  size: 1, roomName: "Kitchen", dimensions: `11'3" x 9'0"` },
  ],
  LS_BP_panoPath_Interior3_F0010: [
    { yaw: 4.1, pitch: -0.08, roomNumber: "01", rotation:{roll: 0, yaw :-45, pitch : 0}, roomName: "Living", size:0.8, dimensions: `14'7" x 10'10"` },
    { yaw: 3.2, pitch: -0.1, rotation:{roll: 0, yaw :0, pitch : 0}, roomNumber: "02",  size:1.3, roomName: "Dining", dimensions: `11'3" x 9'0"` },
    { yaw: 3.67, pitch: -0.4, rotation:{roll: -15, yaw :-10, pitch : 90}, roomNumber: "03",  size: 0.7, roomName: "C.Toilet", dimensions: `5'0"x8'0"` },
  ],
  LS_BP_panoPath_Interior3_F0011: [
    { yaw: 3.1, pitch: -0.04, roomNumber: "01", rotation:{roll: 0, yaw :5, pitch : 0}, roomName: "M.Bedroom", size:0.8, dimensions: `16'2"x11'0"` },
    { yaw: 4.7, pitch: -0.08, rotation:{roll: 0, yaw :0, pitch : 0}, roomNumber: "02",  size:0.8, roomName: "Dining", dimensions: `` },
    { yaw: 6.7, pitch: 5.1, rotation:{roll: -12, yaw :-10, pitch : 94}, roomNumber: "03",  size: 0.9, roomName: "M.Toilet", dimensions: `5'0"x8'0"` },
  ],
  LS_BP_panoPath_Interior4_F0012: [
    { yaw: 4.7, pitch: -0.04, roomNumber: "01", rotation:{roll: 0, yaw :0, pitch : 0}, roomName: "M.Bedroom", size:1, dimensions: `16'2"x11'0"` },
    // { yaw: 6.7, pitch: -0.08, rotation:{roll: 0, yaw :0, pitch : 0}, roomNumber: "02",  size:0.8, roomName: "Dining", dimensions: `` },
    { yaw: 7.7, pitch: 5.3, rotation:{roll: 20, yaw :-10, pitch : 94}, roomNumber: "03",  size: 0.9, roomName: "M.Toilet", dimensions: `5'0"x8'0"` },
  ],
};

const ROOM_NAME_OVERRIDES: Record<string, string> = {
  LS_BP_panoPath_Interior_F0001: "Living",
  LS_BP_panoPath_Interior_F0005: "Living",
  LS_BP_panoPath_Interior_F0006: "C.Toilet",
  LS_BP_panoPath_Interior2_F0007: "Living",
  LS_BP_panoPath_Interior2_F0008: "Living",
  LS_BP_panoPath_Interior3_F0009: "Dinning",
  LS_BP_panoPath_Interior3_F0010: "Dinning",
  LS_BP_panoPath_Interior3_F0011: "Living",
  LS_BP_panoPath_Interior4_F0012: "Living",
  LS_BP_panoPath_Interior4_F0013: "Living", 
  LS_BP_panoPath_Interior5_F0014: "Bedroom 03",
  LS_BP_panoPath_Interior5_F0015: "Bedroom 03",
  LS_BP_panoPath_Interior5_F0016: "C.Toilet",
  LS_BP_panoPath_Interior6_F0017: "Living",
  LS_BP_panoPath_Interior6_F0018: "Kitchen",
  LS_BP_panoPath_F0001: "Living",
  LS_BP_panoPath_F0005: "Living",
  LS_BP_panoPath_F0006: "C.Toilet",
  LS_BP_panoPath_F0007: "Kitchen",
  LS_BP_panoPath_F0008: "Utility",
  LS_BP_panoPath_F0009: "M.Bedroom",
  LS_BP_panoPath_F0010: "Dinning",
  LS_BP_panoPath6_F0018: "Living",
  LS_BP_panoPath6_F0019: "M.Toilet",
  LS_BP_panoPath7_F0022: "Kitchen",
  LS_BP_panoPath7_F0021: "Kitchen",
  LS_BP_panoPath7_F0020: "Dinning",
  LS_BP_panoPath2_F0008: "Dinning",
  LS_BP_panoPath2_F0007: "Living",
  LS_BP_panoPath4_F0014: "Living",
  LS_BP_panoPath4_F0015: "Living",
  LS_BP_panoPath3_F0013: "C.Toilet",
  LS_BP_panoPath2_F0009: "Living",
  LS_BP_panoPath2_F0010: "Living",
  LS_BP_panoPath2_F0011: "Living",
  LS_BP_panoPath5_F0017: "M.Toilet",
  LS_BP_panoPath5_F0016: "Living",
};

function normalizeRoomLabelForDisplay(label: string, panoId: string) {
  const explicitLabel = ROOM_NAME_OVERRIDES[panoId];
  if (explicitLabel) {
    return explicitLabel;
  }

  const normalizedLabel = label.trim().toLowerCase();

  if (!normalizedLabel) {
    return label;
  }

  if (normalizedLabel.includes("drawing room") || normalizedLabel.includes("living room")) {
    return "Living";
  }

  if (normalizedLabel.includes("dining room")) {
    return "Dinning";
  }

  if (normalizedLabel.includes("kitchen")) {
    return "Kitchen";
  }

  if (normalizedLabel.includes("maid room") || normalizedLabel.includes("utility")) {
    return "Utility";
  }

  if (normalizedLabel.includes("master bedroom")) {
    return "M.Bedroom";
  }

  if (normalizedLabel.includes("childrens room")) {
    return "Bedroom 03";
  }

  if (normalizedLabel.includes("bedroom 02")) {
    return "Bedroom 02";
  }

  if (normalizedLabel.includes("bedroom 03")) {
    return "Bedroom 03";
  }

  if (normalizedLabel.includes("bathroom") || normalizedLabel.includes("washroom")) {
    return "C.Toilet";
  }

  return label;
}

function getDimensionRoomName(label: string): InteriorDimensionRoomName | null {
  return INTERIOR_DIMENSION_ROOM_NAMES.includes(label as InteriorDimensionRoomName)
    ? (label as InteriorDimensionRoomName)
    : null;
}

function getInteriorDimensionMarkerDefinitions(
  node: ExteriorTourNode | undefined,
  isBareShellMode: boolean,
  markerOverrides?: InteriorDimensionMarkerOverride[],
) {
  if (!node || isBareShellMode) {
    return [] as InteriorDimensionMarkerDefinition[];
  }

  const panoId = imageFilenameToPanoId(node.imageFilename);
  const primaryRoomName = getDimensionRoomName(getRoomLabel(node.imageFilename));

  if (!primaryRoomName) {
    return [] as InteriorDimensionMarkerDefinition[];
  }

  const secondaryRoomName = SECONDARY_DIMENSION_ROOM_BY_ROOM[primaryRoomName];
  const roomNames = [primaryRoomName, secondaryRoomName];
  const totalMarkers = Math.max(roomNames.length, markerOverrides?.length ?? 0);

  return Array.from({ length: totalMarkers }, (_, index) => {
    const override = markerOverrides?.[index];
    const fallbackRoomName = override?.roomName ?? roomNames[roomNames.length - 1] ?? primaryRoomName;
    const baseRoomDefinition = getDimensionRoomName(fallbackRoomName)
      ? INTERIOR_ROOM_DIMENSIONS[fallbackRoomName as InteriorDimensionRoomName]
      : undefined;

    return {
      markerId: `${panoId}-dimension-marker-${index + 1}`,
      roomNumber: override?.roomNumber ?? baseRoomDefinition?.roomNumber ?? String(index + 1).padStart(2, "0"),
      roomName: override?.roomName ?? baseRoomDefinition?.roomName ?? `Marker ${index + 1}`,
      dimensions: override?.dimensions ?? baseRoomDefinition?.dimensions ?? "",
    };
  });
}

function buildInteriorDimensionMarkerElement(
  marker: InteriorDimensionMarkerDefinition,
  variant: "primary" | "secondary",
  offsetY = 0,
  size = 1,
) {
  const root = document.createElement("div");
  root.className = `interior-dimension-marker interior-dimension-marker--${variant} relative block [transform-style:preserve-3d]`;
  root.style.transform = `translate3d(0, ${offsetY}px, 0)`;

  const label = document.createElement("div");
  label.className = `${wallLabelFont.className} interior-dimension-marker__wall-text inline-flex min-w-[320px] w-max flex-col items-start gap-3 whitespace-nowrap`;
  label.style.transform = `scale(${size})`;
  label.style.transformOrigin = "left center";

  const eyebrow = document.createElement("span");
  eyebrow.className = "interior-dimension-marker__eyebrow block text-[18px] font-bold uppercase tracking-[0.32em] leading-none text-white/50";
  eyebrow.textContent = marker.roomNumber;

  const title = document.createElement("span");
  title.className = "interior-dimension-marker__title block text-[76px] font-bold leading-[0.84] tracking-[-0.05em] text-white/92 [text-shadow:0_1px_1px_rgba(0,0,0,0.22),0_12px_28px_rgba(0,0,0,0.18)]";
  title.textContent = marker.roomName;

  const dimension = document.createElement("span");
  dimension.className = "interior-dimension-marker__size block pt-1 text-[30px] font-medium leading-[1.08] tracking-[0.03em] text-white/60";
  dimension.textContent = marker.dimensions;

  label.appendChild(eyebrow);
  label.appendChild(title);
  label.appendChild(dimension);
  root.appendChild(label);

  return root;
}

function normalizeMarkerRotation(rotation: InteriorDimensionMarkerRotation | undefined) {
  if (typeof rotation === "number") {
    return {
      roll: `${rotation}deg`,
    };
  }

  return {
    yaw: rotation?.yaw !== undefined ? `${rotation.yaw}deg` : undefined,
    pitch: rotation?.pitch !== undefined ? `${rotation.pitch}deg` : undefined,
    roll: rotation?.roll !== undefined ? `${rotation.roll}deg` : undefined,
  };
}

function getInteriorDimensionMarkers(
  node: ExteriorTourNode | undefined,
  isBareShellMode: boolean,
  isDimensionsVisible: boolean,
  anchorYaw: number,
): MarkerConfig[] {
  if (!node || isBareShellMode || !isDimensionsVisible) {
    return [];
  }

  const panoId = imageFilenameToPanoId(node.imageFilename);
  const markerOverrides = INTERIOR_DIMENSION_MARKER_OVERRIDES[panoId];
  const markers = getInteriorDimensionMarkerDefinitions(
    node,
    isBareShellMode,
    markerOverrides,
  );
  const fallbackPositions: InteriorDimensionMarkerPosition[] = [
      { yaw: wrapAngleRad(anchorYaw - 0.22), pitch: -0.08 },
      { yaw: wrapAngleRad(anchorYaw + 0.2), pitch: -0.02 },
    ];

  return markers.map((marker, index) => {
      const rotation = normalizeMarkerRotation(markerOverrides?.[index]?.rotation);

      return {
      id: marker.markerId,
      position:
        markerOverrides?.[index]
          ? {
              yaw: markerOverrides[index].yaw,
              pitch: markerOverrides[index].pitch,
            }
          : fallbackPositions[index] ?? fallbackPositions[fallbackPositions.length - 1],
      elementLayer: buildInteriorDimensionMarkerElement(
        {
          ...marker,
          roomNumber: marker.roomNumber,
          roomName: marker.roomName,
          dimensions: marker.dimensions,
        },
        "primary",
        markerOverrides?.[index]?.offsetY ?? 0,
        markerOverrides?.[index]?.size ?? 1,
      ),
      className: "overflow-visible",
      rotation: {
        yaw: rotation.yaw,
        pitch: rotation.pitch,
        roll: rotation.roll,
      },
      hideList: true,
      zIndex: 40,
      size: {
        width: index % 2 === 0 ? 420 : 380,
        height: index % 2 === 0 ? 240 : 220,
      },
      data: {
        roomName: marker.roomName,
        type: "room-dimension",
      },
    };
    });
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
  const baseLabel = ROOM_LABELS[panoId] ?? panoId.match(/F(\d{4})$/i)?.[0] ?? panoId;
  return normalizeRoomLabelForDisplay(baseLabel, panoId);
}

function getImportantRoomLabel(label: string) {
  const normalizedLabel = label.trim().toLowerCase();

  if (!normalizedLabel) {
    return null;
  }

  if (normalizedLabel === "entrance") {
    return "Entrance";
  }

  if (normalizedLabel === "living") {
    return "Living";
  }

  if (normalizedLabel === "dinning") {
    return "Dinning";
  }

  if (normalizedLabel === "kitchen") {
    return "Kitchen";
  }

  if (normalizedLabel === "utility") {
    return "Utility";
  }

  if (normalizedLabel === "m.bedroom") {
    return "M.Bedroom";
  }

  if (normalizedLabel === "m.toilet") {
    return "M.Toilet";
  }

  if (normalizedLabel === "bedroom 02") {
    return "Bedroom 02";
  }

  if (normalizedLabel === "bedroom 03") {
    return "Bedroom 03";
  }

  if (normalizedLabel === "c.toilet") {
    return "C.Toilet";
  }

  if (normalizedLabel.includes("passage") || /^hall\b/.test(normalizedLabel)) {
    return null;
  }

  if (normalizedLabel.endsWith("entrance")) {
    return null;
  }

  if (normalizedLabel.includes("kitchen")) {
    return "Kitchen";
  }

  if (normalizedLabel.includes("master bedroom")) {
    return "M.Bedroom";
  }

  if (normalizedLabel.includes("childrens room")) {
    return "Bedroom 03";
  }

  if (normalizedLabel.includes("maid room")) {
    return "Utility";
  }

  if (normalizedLabel.includes("drawing room")) {
    return "Living";
  }

  if (normalizedLabel.includes("dining room")) {
    return "Dinning";
  }

  if (normalizedLabel.includes("living room")) {
    return "Living";
  }

  if (
    normalizedLabel.includes("bathroom") ||
    normalizedLabel.includes("washroom")
  ) {
    return "C.Toilet";
  }

  return null;
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
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedBareShellMode = getWalkthroughMode(searchParams) === "bare-shell";
  const [isBareShellMode, setIsBareShellMode] = useState(requestedBareShellMode);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDimensionsVisible, setIsDimensionsVisible] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [viewYaw, setViewYaw] = useState(0);
  const [activeNodeId, setActiveNodeId] = useState(initialNodeId ?? "");
  const [availablePanoFolders, setAvailablePanoFolders] = useState<Record<string, string>>({});
  const [availableNodeIds, setAvailableNodeIds] = useState<Set<string> | null>(null);
  const [preferredFrame, setPreferredFrame] = useState<string | null>(null);
  const [isSlowNetwork, setIsSlowNetwork] = useState(false);
  const [isMobileTouchViewport, setIsMobileTouchViewport] = useState(false);
  const viewerHostRef = useRef<HTMLDivElement | null>(null);
  const bindingsRef = useRef<ViewerBindings | null>(null);
  const activeNodeIdRef = useRef(activeNodeId);
  const currentNodeIdRef = useRef("");
  const isDimensionsVisibleRef = useRef(isDimensionsVisible);
  const cacheRef = useRef(new Map<string, ResolvedPano>());

  const allNodes = useMemo(
    () => ((isBareShellMode ? bareShellNavData : furnishedNavData) as ExteriorPanoNodeSource[]),
    [isBareShellMode],
  );
  const panoBaseUrl = isBareShellMode ? BARE_SHELL_PANO_BASE_URL : FURNISHED_PANO_BASE_URL;
  const assetStore = useMemo(() => new PanoAssetStore(panoBaseUrl), [panoBaseUrl]);
  const interiorViewerMoveSpeed = isMobileTouchViewport ? 3.6 : 2;
  const interiorViewerMoveInertia = isMobileTouchViewport ? 0.82 : 0.92;
  const interiorNodeTransitionSpeed = isMobileTouchViewport ? 560 : 650;

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
  const activePanoId = activeNode ? imageFilenameToPanoId(activeNode.imageFilename) : "";
  const activeRoomLabel = activeNode ? getRoomLabel(activeNode.imageFilename) : "";
  const activeDimensionMarkerDefinitions = useMemo(
    () =>
      getInteriorDimensionMarkerDefinitions(
        activeNode,
        isBareShellMode,
        activePanoId ? INTERIOR_DIMENSION_MARKER_OVERRIDES[activePanoId] : undefined,
      ),
    [activeNode, activePanoId, isBareShellMode],
  );
  const navigationTargets = useMemo(
    () => getViewRelativeNavigationTargets(graph, activeNode, viewYaw),
    [activeNode, graph, viewYaw],
  );
  const menuRooms = useMemo<MenuRoomItem[]>(() => {
    const seenLabels = new Set<string>();

    return graph.nodes.reduce<MenuRoomItem[]>((items, node) => {
      const importantLabel = getImportantRoomLabel(getRoomLabel(node.imageFilename));

      if (!importantLabel || seenLabels.has(importantLabel)) {
        return items;
      }

      seenLabels.add(importantLabel);

      const panoId = getResolvedPanoFolderId(
        node.id,
        node.imageFilename,
        availablePanoFolders,
        isBareShellMode,
      );

      items.push({
        id: node.id,
        image: `${panoBaseUrl}${panoId}/${getDefaultPreviewFile()}`,
        isActive: node.id === currentNodeId,
        label: importantLabel,
      });

      return items;
    }, []);
  }, [
    availablePanoFolders,
    currentNodeId,
    graph.nodes,
    isBareShellMode,
    panoBaseUrl,
  ]);

  const updateModeInUrl = useCallback(
    (nextMode: boolean) => {
      const nextParams = new URLSearchParams(searchParams.toString());

      if (nextMode) {
        nextParams.set("mode", "bare-shell");
      } else {
        nextParams.delete("mode");
      }

      const query = nextParams.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const applyModeChange = useCallback((nextMode: boolean) => {
    if (nextMode === isBareShellMode) {
      return;
    }

    setPreferredFrame(ENTRANCE_FRAME_ID);
    setActiveNodeId("");
    setViewYaw(0);
    setIsMenuOpen(false);
    setIsTransitioning(true);
    setAvailablePanoFolders({});
    setAvailableNodeIds(null);
    setIsBareShellMode(nextMode);
  }, [isBareShellMode]);

  const handleModeToggle = useCallback(() => {
    const nextMode = !isBareShellMode;
    applyModeChange(nextMode);
    updateModeInUrl(nextMode);
  }, [applyModeChange, isBareShellMode, updateModeInUrl]);

  const handleDimensionsToggle = useCallback(() => {
    setIsDimensionsVisible((current) => !current);
  }, []);

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

  const syncNodeMarkers = useCallback(
    (viewer: Viewer, nodeId: string, anchorYaw = viewer.getPosition().yaw) => {
      const markersPlugin = viewer.getPlugin<MarkersPlugin>(MarkersPlugin);

      if (!markersPlugin) {
        return;
      }

      markersPlugin.setMarkers(
        getInteriorDimensionMarkers(
          graph.byId[nodeId],
          isBareShellMode,
          isDimensionsVisibleRef.current,
          anchorYaw,
        ),
      );
    },
    [graph.byId, isBareShellMode],
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
        speed: interiorNodeTransitionSpeed,
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
  }, [buildTourNode, graph.byId, interiorNodeTransitionSpeed, isTransitioning]);

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
    if (requestedBareShellMode !== isBareShellMode) {
      const timer = globalThis.setTimeout(() => {
        applyModeChange(requestedBareShellMode);
      }, 0);

      return () => {
        globalThis.clearTimeout(timer);
      };
    }
  }, [applyModeChange, isBareShellMode, requestedBareShellMode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mobileViewportMedia = window.matchMedia("(max-width: 767px)");
    const coarsePointerMedia = window.matchMedia("(pointer: coarse)");
    const anyCoarsePointerMedia = window.matchMedia("(any-pointer: coarse)");

    const syncMobileTouchViewport = () => {
      setIsMobileTouchViewport(
        mobileViewportMedia.matches &&
          (coarsePointerMedia.matches || anyCoarsePointerMedia.matches),
      );
    };

    syncMobileTouchViewport();
    mobileViewportMedia.addEventListener("change", syncMobileTouchViewport);
    coarsePointerMedia.addEventListener("change", syncMobileTouchViewport);
    anyCoarsePointerMedia.addEventListener("change", syncMobileTouchViewport);

    return () => {
      mobileViewportMedia.removeEventListener("change", syncMobileTouchViewport);
      coarsePointerMedia.removeEventListener("change", syncMobileTouchViewport);
      anyCoarsePointerMedia.removeEventListener(
        "change",
        syncMobileTouchViewport,
      );
    };
  }, []);

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
    isDimensionsVisibleRef.current = isDimensionsVisible;
  }, [isDimensionsVisible]);

  useEffect(() => {
    cacheRef.current.clear();
  }, [availablePanoFolders, isBareShellMode, panoBaseUrl]);

  useEffect(() => {
    const bindings = bindingsRef.current;

    if (!bindings || !currentNodeId) {
      return;
    }

    syncNodeMarkers(bindings.viewer, currentNodeId);
  }, [currentNodeId, isDimensionsVisible, isBareShellMode, syncNodeMarkers]);

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
        moveSpeed: interiorViewerMoveSpeed,
        moveInertia: interiorViewerMoveInertia,
        rendererParameters: {
          antialias: true,
          powerPreference: "high-performance",
        },
        plugins: [
          MarkersPlugin,
          GyroscopePlugin,
        //    AutorotatePlugin.withConfig({
        //     autorotatePitch: '5deg',
        //     autostartDelay: 9000,
        // }),
          VirtualTourPlugin.withConfig({
            positionMode: "manual",
            renderMode: "3d",
            nodes: tourNodes,
            startNodeId,
            preload: !isSlowNetwork,
            transitionOptions: {
              effect: "fade",
              showLoader: false,
              speed: interiorNodeTransitionSpeed,
              rotation: true,
            },
            linksOnCompass: false,
          }),
        ],
      });

      const virtualTour = viewer.getPlugin<VirtualTourPlugin>(VirtualTourPlugin);
      const handleNodeChanged = ({ node }: { node: VirtualTourNode }) => {
        syncNodeMarkers(viewer, node.id);
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
      syncNodeMarkers(viewer, startNodeId);
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
  }, [
    assetStore,
    buildTourNode,
    graph.nodes,
    interiorNodeTransitionSpeed,
    interiorViewerMoveInertia,
    interiorViewerMoveSpeed,
    isSlowNetwork,
    panoBaseUrl,
    resolvePano,
    syncNodeMarkers,
  ]);

  if (availableNodeIds === null) {
    return (
      <div className="flex h-full items-center justify-center rounded-[2rem] border border-white/10 bg-black/30 text-white/70">
        Loading Walkthrough. Please Wait
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
      {/* {walkthroughContext.flatNumber ? (
        <div className="pointer-events-none absolute inset-x-4 top-4 z-30 flex justify-center sm:top-5">
          <div className={`${uiFont.className} rounded-[1.35rem] border border-white/16 bg-[rgba(14,20,27,0.58)] px-4 py-3 text-center text-white shadow-[0_18px_40px_rgba(0,0,0,0.22)] backdrop-blur-2xl`}>
            <div className="text-[10px] uppercase tracking-[0.26em] text-white/56">
              Requested Residence
            </div>
            <div className="mt-1 text-sm font-semibold tracking-[0.04em] text-white">
              Flat {walkthroughContext.flatNumber}
              {walkthroughContext.tower ? ` • ${walkthroughContext.tower}` : ""}
              {walkthroughContext.floorLabel
                ? ` • Floor ${walkthroughContext.floorLabel}`
                : ""}
              {walkthroughContext.bhk ? ` • ${walkthroughContext.bhk} BHK` : ""}
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/45">
              Representative walkthrough
            </div>
          </div>
        </div>
      ) : null} */}

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
          <button
            type="button"
            onClick={handleModeToggle}
            className={`${uiFont.className} mt-3 flex w-full items-center justify-center gap-2 rounded-[1.25rem] border border-white/22 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(171,188,196,0.06))] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-white shadow-[0_16px_32px_rgba(0,0,0,0.2)] backdrop-blur-2xl transition hover:border-white/34 hover:bg-white/12`}
          >
            {isBareShellMode ? <Sofa className="h-4 w-4" /> : <BedDouble className="h-4 w-4" />}
            {isBareShellMode ? "View Furnished" : "View Bare Shell"}
          </button>

          <button
            type="button"
            onClick={handleDimensionsToggle}
            className={`${uiFont.className} mt-3 flex w-full items-center justify-center rounded-[1.25rem] border px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] shadow-[0_16px_32px_rgba(0,0,0,0.2)] backdrop-blur-2xl transition ${
              isDimensionsVisible
                ? "border-[#ecd1a0]/40 bg-[linear-gradient(180deg,rgba(255,244,224,0.22),rgba(206,175,120,0.12))] text-[#fff3da] hover:border-[#f3dbb0]/54 hover:bg-[linear-gradient(180deg,rgba(255,244,224,0.26),rgba(206,175,120,0.16))]"
                : "border-white/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(171,188,196,0.05))] text-white hover:border-white/30 hover:bg-white/12"
            }`}
          >
            {isDimensionsVisible ? "Hide Dimensions" : "Show Dimensions"}
          </button>

          <div className={`${uiFont.className} mt-3 rounded-[1.2rem] border border-white/16 bg-[linear-gradient(180deg,rgba(9,13,19,0.42),rgba(9,13,19,0.28))] px-3 py-2.5 text-white/82 shadow-[0_14px_28px_rgba(0,0,0,0.18)] backdrop-blur-2xl`}>
            <div className="text-[9px] font-semibold uppercase tracking-[0.28em] text-white/42">
              Pano Devtool
            </div>
            <div className="mt-2 text-[12px] font-semibold leading-4 text-white">
              {activeRoomLabel || "Unknown Room"}
            </div>
            <div className="mt-1 break-all text-[10px] leading-4 text-white/58">
              {activePanoId || "No pano selected"}
            </div>
            <div className="mt-2 text-[10px] uppercase tracking-[0.22em] text-white/46">
              Dimensions {isDimensionsVisible ? "on" : "off"} • {activeDimensionMarkerDefinitions.length} markers • Yaw {Math.round((viewYaw * 180) / Math.PI)}°
            </div>
          </div>
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

          <div className="relative flex h-full w-full flex-col border-r border-white/14 bg-[linear-gradient(180deg,rgba(144,155,164,0.16)_0%,rgba(116,127,136,0.1)_100%)] p-4 text-white shadow-[0_24px_64px_rgba(0,0,0,0.16)] backdrop-blur-[24px] transition duration-300 sm:w-[28rem] xl:mb-6 xl:ml-6 xl:mt-24 xl:h-[min(58dvh,calc(100dvh-8rem))] xl:w-[24rem] xl:overflow-hidden xl:rounded-[2rem] xl:border xl:border-white/18 xl:bg-[linear-gradient(180deg,rgba(165,176,184,0.18)_0%,rgba(120,134,142,0.12)_100%)] 2xl:h-[min(60dvh,calc(100dvh-8rem))]">
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
              <div className="mx-auto w-full max-w-[16rem] rounded-[1.45rem] sm:max-w-[18rem]">
                <button
                  type="button"
                  onClick={handleModeToggle}
                  className={`${uiFont.className} mt-3 flex w-full items-center justify-center gap-2 rounded-[1.15rem] border border-white/22 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(171,188,196,0.06))] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-white shadow-[0_14px_28px_rgba(0,0,0,0.16)] backdrop-blur-2xl transition hover:border-white/34 hover:bg-white/12`}
                >
                  {isBareShellMode ? <Sofa className="h-4 w-4" /> : <BedDouble className="h-4 w-4" />}
                  {isBareShellMode ? "View Furnished" : "View Bare Shell"}
                </button>

                <button
                  type="button"
                  onClick={handleDimensionsToggle}
                  className={`${uiFont.className} mt-3 flex w-full items-center justify-center rounded-[1.15rem] border px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] shadow-[0_14px_28px_rgba(0,0,0,0.16)] backdrop-blur-2xl transition ${
                    isDimensionsVisible
                      ? "border-[#ecd1a0]/40 bg-[linear-gradient(180deg,rgba(255,244,224,0.22),rgba(206,175,120,0.12))] text-[#fff3da] hover:border-[#f3dbb0]/54 hover:bg-[linear-gradient(180deg,rgba(255,244,224,0.26),rgba(206,175,120,0.16))]"
                      : "border-white/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(171,188,196,0.05))] text-white hover:border-white/30 hover:bg-white/12"
                  }`}
                >
                  {isDimensionsVisible ? "Hide Dimensions" : "Show Dimensions"}
                </button>
              </div>
            </div>

            <div className="mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-2">
              {menuRooms.map((room) => {
                const isActive = room.id === currentNodeId;
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setPreferredFrame(null);
                      void goToNode(room.id);
                    }}
                    className={`group flex w-full items-center gap-3 rounded-[1.4rem] border p-2.5 text-left shadow-[0_12px_30px_rgba(0,0,0,0.1)] transition ${
                      isActive
                        ? "border-[#7fd9d5]/34 bg-[linear-gradient(135deg,rgba(175,223,223,0.16),rgba(88,122,131,0.12))]"
                        : "border-white/14 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(181,197,204,0.05))] hover:border-white/22 hover:bg-white/10"
                    }`}
                  >
                    <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-[1rem] border border-white/18 bg-white/8">
                      <NextImage
                        src={room.image}
                        alt={room.label}
                        fill
                        sizes="96px"
                        className="object-cover object-center transition duration-300 group-hover:scale-[1.03]"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-semibold text-white">{room.label}</div>
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
