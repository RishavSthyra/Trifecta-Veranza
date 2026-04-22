import amenityCoordinates from "@/data/AminetiesCoordinates.json";
import exteriorNodes from "@/data/trifecta_pano_walkthrough_data_Exterior1.json";
import type { ExteriorPanoNodeSource } from "@/lib/exterior-tour/types";

type AmenityCoordinate = {
  x: number;
  y: number;
  z: number;
};

type ExteriorAmenityStartingPanoInput = {
  name: string;
  yaw?: number;
  pitch?: number;
  roll?: number;
  facingAxis?: string;
  angle?: number;
  viewYaw?: number;
  viewPitch?: number;
  viewZoom?: number;
};

export type ExteriorAmenityStartingPano = {
  name: string;
  nodeId: string;
  yaw: number;
  pitch: number;
  roll: number;
  facingAxis?: string;
  angle: number;
  viewYaw: number;
  viewPitch: number;
  viewZoom?: number;
};

type ExteriorAmenityDefinition = {
  id: string;
  name: string;
  coordinateKey?: string;
  image?: string;
  description: string;
  nodeIds: string[];
  primaryNodeId?: string;
  startingPano?: ExteriorAmenityStartingPanoInput;
};

export type ExteriorAmenity = {
  id: string;
  name: string;
  image: string;
  description: string;
  nodeIds: string[];
  primaryNodeId: string;
  startingPano: ExteriorAmenityStartingPano;
  coordinate: AmenityCoordinate;
  summary: string;
};

const coordinateMap = amenityCoordinates as Record<string, AmenityCoordinate>;
const exteriorNodeSources = exteriorNodes as ExteriorPanoNodeSource[];

function isIgnoredPanoId(value: string) {
  return /\.0000(?:\.[^/.]+)?$/i.test(value);
}

function normalizePanoNodeId(panoId: string) {
  const withoutExtension = panoId.replace(/\.[^.]+$/, "");

  if (isIgnoredPanoId(withoutExtension)) {
    return null;
  }

  return withoutExtension.replace(/^LS_/, "");
}

function pano(panoId: string) {
  const nodeId = normalizePanoNodeId(panoId);

  if (!nodeId) {
    throw new Error(`Ignored exterior pano "${panoId}"`);
  }

  return nodeId;
}

function range(prefix: string, start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, index) =>
    pano(`${prefix}${String(start + index).padStart(4, "0")}`),
  );
}

const exteriorNodeCoordinateMap = new Map<string, AmenityCoordinate>(
  exteriorNodeSources
    .filter(
      (node) =>
        !isIgnoredPanoId(node.id) && !isIgnoredPanoId(node.image_filename),
    )
    .map((node) => [
      node.id,
      {
        x: node.x,
        y: node.y,
        z: node.z,
      },
    ]),
);

const exteriorNodeSourceMap = new Map<string, ExteriorPanoNodeSource>(
  exteriorNodeSources.map((node) => [node.id, node]),
);

const availableNodeIds = new Set(exteriorNodeCoordinateMap.keys());

function startingPano(
  name: string,
  options: Omit<ExteriorAmenityStartingPanoInput, "name"> = {},
): ExteriorAmenityStartingPanoInput {
  return {
    name,
    ...options,
  };
}

function ids(...groups: Array<string | string[]>) {
  const resolved: string[] = [];

  for (const id of groups.flat()) {
    const nodeId = normalizePanoNodeId(id);

    if (!nodeId || !availableNodeIds.has(nodeId) || resolved.includes(nodeId)) {
      continue;
    }

    resolved.push(nodeId);
  }

  return resolved;
}

function getAmenityCoordinate(
  amenity: ExteriorAmenityDefinition,
  primaryNodeId: string,
) {
  if (amenity.coordinateKey) {
    const coordinate = coordinateMap[amenity.coordinateKey];

    if (coordinate) {
      return coordinate;
    }
  }

  const nodeCoordinate = exteriorNodeCoordinateMap.get(primaryNodeId);

  if (!nodeCoordinate) {
    throw new Error(`Missing amenity coordinate for "${amenity.name}"`);
  }

  return nodeCoordinate;
}

function createSummary(nodeIds: string[]) {
  return `${nodeIds.length} pano ${nodeIds.length === 1 ? "stop" : "stops"}`;
}

export const AMENITY_IMAGE_PLACEHOLDER_URL =
  "https://cdn.sthyra.com/images/amenities-compressed/preview/Amphi%20Theatre.avif";
const EXTERIOR_PANO_CDN_BASE = "https://cdn.sthyra.com/exterior-panos-trifecta";

const amenityDefinitions: ExteriorAmenityDefinition[] = [
  {
    id: "entrance",
    name: "Entrance",
    description:
      "The main arrival sequence into the community, starting at the exterior entry approach.",
    primaryNodeId: pano("LS_BP_panoPath_Exterior_GateEntry_F0001"),
    startingPano: startingPano("LS_BP_panoPath_Exterior_GateEntry_F0001", {
      yaw: -0.0669,
      pitch: 0.4123,
      angle: -1.231,
      viewPitch: 0.714,
    }),
    nodeIds: ids(
      range("LS_BP_panoPath_Exterior_Entry_F", 168, 175),
      pano("LS_BP_panoPath_Exterior2_F0161"),
    ),
  },
  {
    id: "cycle-track",
    name: "Cycle Track",
    coordinateKey: "Wide Cycling Track",
    description:
      "A connected cycling route running through the exterior movement spine and garden edges.",
startingPano: startingPano("LS_BP_panoPath_Exterior_Entry_F0180", {
  yaw: -18.9624,
  pitch: -1.3364,
  angle: -18.9624,
  viewPitch: -1.3364,
}),

    nodeIds: ids(
      range("LS_BP_panoPath_Exterior_Entry_F", 176, 178),
      pano("LS_BP_panoPath_Exterior_Entry_F0180"),
      pano("LS_BP_panoPath_Exterior_Entry_F0200"),
      range("LS_BP_panoPath_Exterior_TowerA_Walk_F", 108, 110),
      pano("LS_BP_panoPath_Exterior_TowerA_Walk_F0118"),
      pano("LS_BP_panoPath_Exterior_TowerA_Walk_F0128"),
      pano("LS_BP_panoPath_Exterior2_F0162"),
      pano("LS_BP_panoPath_Exterior2_F0167"),
      range("LS_BP_panoPath_Exterior41_F", 141, 144),
    ),
  },
  {
    id: "general",
    name: "General",
    description:
      "Shared exterior context stops that connect the broader landscape and tower-side routes.",
    startingPano: startingPano("LS_BP_panoPath_Exterior_Transformers_F0133"),
    nodeIds: ids(
      pano("LS_BP_panoPath_Exterior_Transformers_F0133"),
      range("LS_BP_panoPath_Exterior2_F", 162, 166),
      pano("LS_BP_panoPath_Exterior4_F0013"),
      pano("LS_BP_panoPath_Exterior4_F0014"),
      pano("LS_BP_panoPath_Exterior11_F0042"),
      range("LS_BP_panoPath_Exterior35_F", 104, 107),
    ),
  },
  {
    id: "business-lounge",
    name: "Business Lounge",
    coordinateKey: "Bussiness Lounge",
    description:
      "A composed lounge-side exterior pocket connected to the entry and clubhouse edge.",
    startingPano: startingPano("LS_BP_panoPath_Exterior6_F0020", {
  yaw: -104.8365,
  pitch: -7.1619,
  angle: -104.8365,
  viewPitch: -7.1619,
}),

    nodeIds: ids(
      pano("LS_BP_panoPath_Exterior_Entry_F0179"),
      range("LS_BP_panoPath_Exterior6_F", 19, 21),
    ),
  },
  {
    id: "camp-fire",
    name: "Camp Fire",
    coordinateKey: "CampFire",
    image:
      "https://cdn.sthyra.com/images/amenities-compressed/preview/CampFire.avif",
    description:
      "A warm outdoor gathering setting for evening conversations and relaxed community moments.",
    startingPano: startingPano("LS_BP_panoPath_Exterior34_F0101", {
  yaw: 127.0665,
  pitch: -0.0022,
  angle: 127.0665,
  viewPitch: -0.0022,
}),

    nodeIds: ids(
      pano("LS_BP_panoPath_Exterior_Entry_F0181"),
      pano("LS_BP_panoPath_Exterior0_F0152"),
      range("LS_BP_panoPath_Exterior6_F", 22, 23),
      range("LS_BP_panoPath_Exterior34_F", 101, 102),
      range("LS_BP_panoPath_Exterior38_F", 150, 151),
    ),
  },
  {
    id: "zen-garden",
    name: "Zen Garden",
    coordinateKey: "Zen Garden",
    image:
      "https://cdn.sthyra.com/images/amenities-compressed/preview/Zen%20garden.avif",
    description:
      "A quiet garden sequence with meditative planting, soft paths, and calm pause points.",
    startingPano: startingPano("LS_BP_panoPath_Exterior6_F0024", {
  yaw: -45.4812,
  pitch: -9.8624,
  angle: -45.4812,
  viewPitch: -9.8624,
}),

    nodeIds: ids(
      range("LS_BP_panoPath_Exterior_Entry_F", 182, 183),
      range("LS_BP_panoPath_Exterior0_F", 152, 154),
      range("LS_BP_panoPath_Exterior6_F", 24, 25),
    ),
  },
  {
    id: "meditation-deck",
    name: "Meditation Deck",
    description:
      "A calm deck zone placed along the deeper garden route for slower, quieter use.",
    startingPano: startingPano("LS_BP_panoPath_Exterior_Entry_F0186", {
  yaw: -97.7822,
  pitch: -7.9389,
  angle: -97.7822,
  viewPitch: -7.9389,
}),

    nodeIds: ids(
      range("LS_BP_panoPath_Exterior_Entry_F", 183, 185),
      pano("LS_BP_panoPath_Exterior6_F0026"),
      range("LS_BP_panoPath_Exterior41_F", 141, 143),
      range("LS_BP_panoPath_Exterior42_F", 145, 146),
    ),
  },
  {
    id: "pergola-pathway",
    name: "Pergola Pathway",
    description:
      "A shaded pathway sequence linking the landscaped garden stops and seating edges.",
    startingPano: startingPano("LS_BP_panoPath_Exterior29_F0087"),
    nodeIds: ids(
      range("LS_BP_panoPath_Exterior_Entry_F", 186, 188),
      range("LS_BP_panoPath_Exterior29_F", 87, 88),
    ),
  },
  {
    id: "water-cascade",
    name: "Water Cascade",
    description:
      "A water-feature zone with connected entry path and garden-side viewing stops.",
    startingPano: startingPano("LS_BP_panoPath_Exterior17_F0139", {
  yaw: 56.4829,
  pitch: -6.5697,
  angle: 56.4829,
  viewPitch: -6.5697,
}),

    nodeIds: ids(
      range("LS_BP_panoPath_Exterior_Entry_F", 189, 191),
      range("LS_BP_panoPath_Exterior17_F", 139, 140),
      pano("LS_BP_panoPath_Exterior41_F0144"),
    ),
  },
  {
    id: "pergola-sitting",
    name: "Pergola Sitting",
    description:
      "A pergola seating pocket placed near the water cascade and garden circulation.",
    startingPano: startingPano("LS_BP_panoPath_Exterior_Entry_F0191", {
  yaw: 114.1592,
  pitch: -9.3486,
  angle: 114.1592,
  viewPitch: -9.3486,
}),

    nodeIds: ids(range("LS_BP_panoPath_Exterior_Entry_F", 189, 191)),
  },
  {
    id: "picnic-lawn",
    name: "Picnic Lawn",
    coordinateKey: "PicnicLawn",
    image:
      "https://cdn.sthyra.com/images/amenities-compressed/preview/Picnic%20Lawn.avif",
    description:
      "A relaxed lawn setting for casual picnics, family pauses, and open-air downtime.",
   startingPano: startingPano("LS_BP_panoPath_Exterior2_1_F0155", {
  yaw: -165.4287,
  pitch: 1.4535,
  angle: -165.4287,
  viewPitch: 1.4535,
}),
    nodeIds: ids(
      range("LS_BP_panoPath_Exterior_Entry_F", 192, 193),
      pano("LS_BP_panoPath_Exterior2_1_F0155"),
      pano("LS_BP_panoPath_Exterior2_1_F0157"),
    ),
  },
  {
    id: "butterfly-garden",
    name: "Butterfly Garden",
    coordinateKey: "ButterflyGarden",
    description:
      "A colorful planting zone with a gentle garden route and nature-focused pauses.",
startingPano: startingPano("LS_BP_panoPath_Exterior2_1_F0156", {
  yaw: -26.998,
  pitch: -2.4186,
  angle: -26.998,
  viewPitch: -2.4186,
}),
    nodeIds: ids(
      range("LS_BP_panoPath_Exterior_Entry_F", 194, 196),
      pano("LS_BP_panoPath_Exterior2_1_F0156"),
      pano("LS_BP_panoPath_Exterior2_1_F0158"),
      pano("LS_BP_panoPath_Exterior2_1_F0159"),
    ),
  },
  {
    id: "flower-garden",
    name: "Flower Garden",
    coordinateKey: "FlowerGarden",
    description:
      "A bloom-forward garden area with exterior approach views and nearby picnic-lawn context.",
    startingPano: startingPano("LS_BP_panoPath_Exterior2_1_F0158", {
  yaw: -25.155,
  pitch: -8.7503,
  angle: -25.155,
  viewPitch: -8.7503,
}),
    nodeIds: ids(
      range("LS_BP_panoPath_Exterior_Entry_F", 197, 198),
      pano("LS_BP_panoPath_Exterior2_1_F0157"),
    ),
  },
  {
    id: "children-park",
    name: "Children Park",
    coordinateKey: "Children's Play Area",
    image:
      "https://cdn.sthyra.com/images/amenities-compressed/preview/Children%20Play%20Area.avif",
    description:
      "A playful outdoor zone for children with connected approach and park-side pano stops.",
    startingPano: startingPano("LS_BP_panoPath_Exterior7_F0028", {
  yaw: -63.5707,
  pitch: -4.2737,
  angle: -63.5707,
  viewPitch: -4.2737,
}),
    nodeIds: ids(
      pano("LS_BP_panoPath_Exterior_Entry_F0199"),
      pano("LS_BP_panoPath_Exterior2_1_F0160"),
      range("LS_BP_panoPath_Exterior7_F", 27, 30),
    ),
  },
  {
    id: "outside",
    name: "Outside",
    description:
      "The outer gate-entry approach before the route moves into the main community landscape.",
    primaryNodeId: pano("LS_BP_panoPath_Exterior_GateEntry_F0000"),
    startingPano: startingPano("LS_BP_panoPath_Exterior_GateEntry_F0000", {
  yaw: -19.1407,
  pitch: 4.2086,
  angle: -19.1407,
  viewPitch: 4.2086,
}),
    nodeIds: ids(range("LS_BP_panoPath_Exterior_GateEntry_F", 0, 4)),
  },
  {
    id: "clubhouse",
    name: "Clubhouse",
    coordinateKey: "Culbhouse",
    description:
      "The clubhouse arrival side with gate-entry approach views and the clubhouse exterior stop.",
    startingPano: startingPano("LS_BP_panoPath_Exterior_Entry_F0168", {
  yaw: 88.691,
  pitch: 14.4664,
  angle: 88.691,
  viewPitch: 14.4664,
}),
    nodeIds: ids(
      range("LS_BP_panoPath_Exterior_GateEntry_F", 5, 8),
      pano("LS_BP_panoPath_Exterior35_F0103"),
    ),
  },
  {
    id: "play-lawn",
    name: "Play Lawn",
    coordinateKey: "PlayLawn",
    image:
      "https://cdn.sthyra.com/images/amenities-compressed/preview/Play%20Lawn.avif",
    description:
      "A broad active lawn sequence connected to the tower walk and surrounding play edges.",
    startingPano: startingPano("LS_BP_panoPath_Exterior_TowerA_Walk_F0112", {
  yaw: -74.4564,
  pitch: -5.3871,
  angle: -74.4564,
  viewPitch: -5.3871,
}),
    nodeIds: ids(
      range("LS_BP_panoPath_Exterior_TowerA_Walk_F", 111, 113),
      range("LS_BP_panoPath_Exterior29_F", 89, 92),
      range("LS_BP_panoPath_Exterior30_F", 93, 95),
      pano("LS_BP_panoPath_Exterior31_F0096"),
    ),
  },
  {
    id: "interactive-space",
    name: "Interactive Space",
    coordinateKey: "TraditionalGameZone",
    description:
      "A social activity area with tower-walk access and multiple interactive landscape stops.",
    startingPano: startingPano("LS_BP_panoPath_Exterior37_F0135", {
  yaw: 96.8175,
  pitch: -14.4577,
  angle: 96.8175,
  viewPitch: -14.4577,
}),
    nodeIds: ids(
      range("LS_BP_panoPath_Exterior_TowerA_Walk_F", 114, 115),
      range("LS_BP_panoPath_Exterior26_F", 85, 86),
      range("LS_BP_panoPath_Exterior37_F", 134, 136),
    ),
  },
  {
    id: "frisbee-lawn",
    name: "Frisbee Lawn",
    coordinateKey: "Frisbee Lawn",
    description:
      "A light active-lawn route for open play and frisbee-style movement.",
    startingPano: startingPano("LS_BP_panoPath_Exterior_TowerA_Walk_F0117", {
  yaw: -138.2476,
  pitch: -5.8637,
  angle: -138.2476,
  viewPitch: -5.8637,
}),
    nodeIds: ids(range("LS_BP_panoPath_Exterior_TowerA_Walk_F", 116, 117)),
  },
  {
    id: "basketball-volleyball-court",
    name: "Basketball & Volleyball Court",
    coordinateKey: "BasketBall&Volleyball court",
    description:
      "A multi-sport court zone covering the tower walk edge and court-side pano sequence.",
   startingPano: startingPano("LS_BP_panoPath_Exterior22_F0075", {
  yaw: 1.4141,
  pitch: -1.7339,
  angle: 1.4141,
  viewPitch: -1.7339,
}),
    nodeIds: ids(
      pano("LS_BP_panoPath_Exterior_TowerA_Walk_F0118"),
      range("LS_BP_panoPath_Exterior21_F", 70, 73),
      range("LS_BP_panoPath_Exterior22_F", 74, 76),
    ),
  },
  {
    id: "skating-ring",
    name: "Skating Ring",
    coordinateKey: "SkatingRing",
    description:
      "A smooth active loop for skating, connected to the tower walk movement route.",
   startingPano: startingPano("LS_BP_panoPath_Exterior18_F0061", {
  yaw: -7.4928,
  pitch: -6.0024,
  angle: -7.4928,
  viewPitch: -6.0024,
}),
    nodeIds: ids(
      range("LS_BP_panoPath_Exterior_TowerA_Walk_F", 119, 120),
      pano("LS_BP_panoPath_Exterior18_F0061"),
    ),
  },
  {
    id: "futsal-tennis-court",
    name: "Futsal Court / Tennis Court",
    coordinateKey: "Fustal Court/Tennis Court",
    image:
      "https://cdn.sthyra.com/images/amenities-compressed/preview/Tenis%20Court.avif",
    description:
      "A court cluster for futsal and tennis with adjoining sports-court pano stops.",
    startingPano: startingPano("LS_BP_panoPath_Exterior25_F0084", {
  yaw: 173.7533,
  pitch: -5.6811,
  angle: 173.7533,
  viewPitch: -5.6811,
}),
    nodeIds: ids(
      pano("LS_BP_panoPath_Exterior_TowerA_Walk_F0121"),
      range("LS_BP_panoPath_Exterior19_F", 62, 65),
      pano("LS_BP_panoPath_Exterior20_F0066"),
      range("LS_BP_panoPath_Exterior25_F", 83, 84),
    ),
  },
  {
    id: "outdoor-gym",
    name: "Outdoor Gym",
    coordinateKey: "Outdoor GYM",
    image:
      "https://cdn.sthyra.com/images/amenities-compressed/preview/Outdoor%20Gym.avif",
    description:
      "An open-air fitness area with tower walk access and dedicated gym-equipment stops.",
    startingPano: startingPano("LS_BP_panoPath_Exterior16_F0059", {
  yaw: 10.9564,
  pitch: -4.5815,
  angle: 10.9564,
  viewPitch: -4.5815,
}),
    nodeIds: ids(
      range("LS_BP_panoPath_Exterior_TowerA_Walk_F", 122, 123),
      range("LS_BP_panoPath_Exterior16_F", 59, 60),
    ),
  },
  {
    id: "rock-garden",
    name: "Rock Garden",
    coordinateKey: "RockGarden",
    description:
      "A textured landscape pocket with rock-garden views and a tower-walk connection.",
    startingPano: startingPano("LS_BP_panoPath_Exterior15_F0056", {
  yaw: -73.3967,
  pitch: -9.1896,
  angle: -73.3967,
  viewPitch: -9.1896,
}),
    nodeIds: ids(
      pano("LS_BP_panoPath_Exterior_TowerA_Walk_F0124"),
      range("LS_BP_panoPath_Exterior15_F", 55, 58),
    ),
  },
  {
    id: "calisthenics-sand-pit",
    name: "Calisthenics Sand-Pit",
    coordinateKey: "Calisthenics Sand pit",
    image:
      "https://cdn.sthyra.com/images/amenities-compressed/preview/Calisthanics%20Sand%20Pit.avif",
    description:
      "A bodyweight training and sand-pit activity area with a dedicated tower-walk start.",
    primaryNodeId: pano("LS_BP_panoPath_Exterior_TowerA_Walk_F0125"),
   startingPano: startingPano("LS_BP_panoPath_Exterior14_F0054", {
  yaw: 135.4006,
  pitch: -6.9678,
  angle: 135.4006,
  viewPitch: -6.9678,
}),
    nodeIds: ids(
      pano("LS_BP_panoPath_Exterior_TowerA_Walk_F0125"),
      pano("LS_BP_panoPath_Exterior_TowerA_Walk_F0127"),
      range("LS_BP_panoPath_Exterior14_F", 53, 54),
    ),
  },
  {
    id: "amphitheater",
    name: "Amphitheater",
    coordinateKey: "AmphiTheater",
    image:
      "https://cdn.sthyra.com/images/amenities-compressed/preview/Amphi%20Theatre.avif",
    description:
      "A performance and gathering zone spanning transformer-side and amphitheater seating stops.",
   startingPano: startingPano("LS_BP_panoPath_Exterior13_F0051", {
  yaw: 5.0274,
  pitch: -1.1413,
  angle: 5.0274,
  viewPitch: -1.1413,
}),
    nodeIds: ids(
      range("LS_BP_panoPath_Exterior_Transformers_F", 129, 132),
      range("LS_BP_panoPath_Exterior11_F", 43, 46),
      range("LS_BP_panoPath_Exterior12_F", 47, 49),
    ),
  },
  {
    id: "outdoor-party-lawn",
    name: "Outdoor Party Lawn",
    coordinateKey: "Outdoor Party Lawn",
    image:
      "https://cdn.sthyra.com/images/amenities-compressed/preview/Outdoor%20Party%20Lawn.avif",
    description:
      "A celebration lawn sequence with surrounding party-lawn and amphitheater-side context.",
    startingPano: startingPano("LS_BP_panoPath_Exterior9_F0036", {
  yaw: -3.5682,
  pitch: -3.2752,
  angle: -3.5682,
  viewPitch: -3.2752,
}),
    nodeIds: ids(
      range("LS_BP_panoPath_Exterior4_F", 9, 12),
      range("LS_BP_panoPath_Exterior9_F", 36, 38),
      range("LS_BP_panoPath_Exterior10_F", 39, 41),
      range("LS_BP_panoPath_Exterior13_F", 50, 52),
    ),
  },
  {
    id: "community-gathering",
    name: "Community Gathering",
    description:
      "A shared social route through gathering spaces, garden connections, and community edges.",
    startingPano: startingPano("LS_BP_panoPath_Exterior43_F0148"),
    nodeIds: ids(
      pano("LS_BP_panoPath_Exterior4_F0013"),
      range("LS_BP_panoPath_Exterior5_F", 14, 17),
      pano("LS_BP_panoPath_Exterior6_F0018"),
      range("LS_BP_panoPath_Exterior43_F", 147, 149),
    ),
  },
  {
    id: "swimming-pool",
    name: "Swimming Pool",
    coordinateKey: "SwimmingPool",
    description:
      "The poolside exterior sequence with main swimming-pool and supporting pool-view stops.",
   startingPano: startingPano("LS_BP_panoPath_Exterior8_F0033", {
  yaw: 36.876,
  pitch: 1.7308,
  angle: 36.876,
  viewPitch: 1.7308,
}),
    nodeIds: ids(
      range("LS_BP_panoPath_Exterior8_F", 31, 35),
      range("LS_BP_panoPath_Exterior40_F", 137, 138),
    ),
  },
  {
    id: "mini-cricket-stadium",
    name: "Mini Cricket Stadium",
    coordinateKey: "Mini-Cricket Stadium",
    image:
      "https://cdn.sthyra.com/images/amenities-compressed/preview/Mini%20Cricket%20Stadium.avif",
    description:
      "A compact cricket zone for practice, games, and active community play.",
    startingPano: startingPano("LS_BP_panoPath_Exterior20_F0069", {
  yaw: -123.1643,
  pitch: -5.4226,
  angle: -123.1643,
  viewPitch: -5.4226,
}),
    nodeIds: ids(range("LS_BP_panoPath_Exterior20_F", 67, 69)),
  },
  {
    id: "pickleball-court",
    name: "Pickleball Court",
    coordinateKey: "PickleBallcourt",
    description:
      "A dedicated pickleball court sequence with adjacent court-side viewpoints.",
    startingPano: startingPano("LS_BP_panoPath_Exterior24_F0078"),
    nodeIds: ids(
      pano("LS_BP_panoPath_Exterior23_F0077"),
      range("LS_BP_panoPath_Exterior24_F", 78, 79),
    ),
  },
  {
    id: "tennikoit-court",
    name: "Tennikoit Court",
    coordinateKey: "Tennikoit Court",
    description:
      "A tennikoit play area with court-side stops and surrounding outdoor activity context.",
    startingPano: startingPano("LS_BP_panoPath_Exterior28_F0081"),
    nodeIds: ids(
      pano("LS_BP_panoPath_Exterior27_F0080"),
      range("LS_BP_panoPath_Exterior28_F", 81, 82),
    ),
  },
  {
    id: "tree-house",
    name: "Tree House",
    description:
      "A playful tree-house zone with connected garden and tower-side exterior stops.",
    startingPano: startingPano("LS_BP_panoPath_Exterior33_F0100", {
  yaw: 163.2179,
  pitch: -5.1828,
  angle: 163.2179,
  viewPitch: -5.1828,
}),
    nodeIds: ids(
      range("LS_BP_panoPath_Exterior32_F", 97, 98),
      range("LS_BP_panoPath_Exterior33_F", 99, 100),
    ),
  },
];

function getAmenityPreviewImage(nodeId: string) {
  const source = exteriorNodeSources.find((node) => node.id === nodeId);
  const folderName = (source?.image_filename ?? `LS_${nodeId}`).replace(
    /\.[^.]+$/,
    "",
  );

  return `${EXTERIOR_PANO_CDN_BASE}/${folderName}/preview.jpg`;
}

function getAmenityPrimaryNodeId(amenity: ExteriorAmenityDefinition) {
  return amenity.primaryNodeId &&
    amenity.nodeIds.includes(amenity.primaryNodeId)
    ? amenity.primaryNodeId
    : amenity.nodeIds[0];
}

function resolveAmenityStartingPano(
  amenity: ExteriorAmenityDefinition,
  fallbackNodeId: string,
): ExteriorAmenityStartingPano {
  const input = amenity.startingPano ?? startingPano(fallbackNodeId);
  const nodeId = normalizePanoNodeId(input.name);

  if (!nodeId || !availableNodeIds.has(nodeId)) {
    throw new Error(
      `Missing starting pano "${input.name}" for "${amenity.name}"`,
    );
  }

  const source = exteriorNodeSourceMap.get(nodeId);
  const sourceYaw = source?.yaw ?? 0;
  const sourcePitch = source?.pitch ?? 0;
  const yaw = input.yaw ?? sourceYaw;
  const pitch = input.pitch ?? sourcePitch;
  const roll = input.roll ?? source?.roll ?? 0;
  const angle = input.angle ?? input.viewYaw ?? yaw;

  return {
    name: input.name,
    nodeId,
    yaw,
    pitch,
    roll,
    facingAxis: input.facingAxis ?? source?.facing_axis,
    angle,
    viewYaw: input.yaw ?? input.viewYaw ?? input.angle ?? sourceYaw,
    viewPitch: input.pitch ?? input.viewPitch ?? sourcePitch,
    viewZoom: input.viewZoom,
  };
}

export const EXTERIOR_AMENITY_IMAGE_LINKS = amenityDefinitions.map(
  (amenity) => {
    const fallbackPrimaryNodeId = getAmenityPrimaryNodeId(amenity);
    const primaryNodeId = fallbackPrimaryNodeId
      ? resolveAmenityStartingPano(amenity, fallbackPrimaryNodeId).nodeId
      : null;

    return {
      id: amenity.id,
      image:
        amenity.image ??
        (primaryNodeId
          ? getAmenityPreviewImage(primaryNodeId)
          : AMENITY_IMAGE_PLACEHOLDER_URL),
    };
  },
);

const amenityImageMap = new Map<string, string>(
  EXTERIOR_AMENITY_IMAGE_LINKS.filter(
    (entry) => entry.image && entry.image !== AMENITY_IMAGE_PLACEHOLDER_URL,
  ).map((entry) => [entry.id, entry.image]),
);

function resolveAmenityImage(
  amenity: ExteriorAmenityDefinition,
  primaryNodeId: string,
) {
  const linkedImage = amenityImageMap.get(amenity.id);

  if (linkedImage) {
    return linkedImage;
  }

  if (amenity.image && amenity.image !== AMENITY_IMAGE_PLACEHOLDER_URL) {
    return amenity.image;
  }

  return getAmenityPreviewImage(primaryNodeId);
}

export const EXTERIOR_MINIMAP_IMAGE_URL =
  "https://cdn.sthyra.com/images/Final_5.avif";

export const EXTERIOR_MINIMAP_BOUNDS = {
  bottomLeft: {
    x: -16008,
    y: 7020,
  },
  topRight: {
    x: 10615,
    y: -8635,
  },
} as const;

export const EXTERIOR_MINIMAP_IMAGE_LAYOUT = {
  width: 2879,
  height: 1680,
} as const;

export const exteriorAmenities: ExteriorAmenity[] = amenityDefinitions.map(
  (amenity) => {
    const fallbackPrimaryNodeId = getAmenityPrimaryNodeId(amenity);

    if (!fallbackPrimaryNodeId) {
      throw new Error(`Missing exterior pano nodes for "${amenity.name}"`);
    }

    const startingPano = resolveAmenityStartingPano(
      amenity,
      fallbackPrimaryNodeId,
    );
    const nodeIds = amenity.nodeIds.includes(startingPano.nodeId)
      ? amenity.nodeIds
      : [startingPano.nodeId, ...amenity.nodeIds];
    const primaryNodeId = startingPano.nodeId;

    return {
      ...amenity,
      image: resolveAmenityImage(amenity, primaryNodeId),
      primaryNodeId,
      startingPano,
      nodeIds,
      coordinate: getAmenityCoordinate(amenity, primaryNodeId),
      summary: createSummary(nodeIds),
    };
  },
);
