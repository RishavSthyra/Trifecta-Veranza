import amenityCoordinates from "@/data/AminetiesCoordinates.json";

type AmenityCoordinate = {
  x: number;
  y: number;
  z: number;
};

type ExteriorAmenityDefinition = {
  id: string;
  name: string;
  coordinateKey: string;
  image: string;
  description: string;
  nodeIds: string[];
};

export type ExteriorAmenity = {
  id: string;
  name: string;
  image: string;
  description: string;
  nodeIds: string[];
  primaryNodeId: string;
  coordinate: AmenityCoordinate;
  summary: string;
};

const coordinateMap = amenityCoordinates as Record<string, AmenityCoordinate>;

function getAmenityCoordinate(key: string) {
  const coordinate = coordinateMap[key];

  if (!coordinate) {
    throw new Error(`Missing amenity coordinate for "${key}"`);
  }

  return coordinate;
}

function createSummary(nodeIds: string[]) {
  return `${nodeIds.length} pano ${nodeIds.length === 1 ? "stop" : "stops"}`;
}

const AMENITY_IMAGE_PLACEHOLDER_URL =
  "https://cdn.sthyra.com/images/amenities-compressed/preview/Amphi%20Theatre.avif";

const amenityDefinitions: ExteriorAmenityDefinition[] = [
  {
    id: "zen-garden",
    name: "Zen Garden",
    coordinateKey: "Zen Garden",
    image: "https://cdn.sthyra.com/images/Untitled-1.png",
    description:
      "A quiet meditative retreat with sculpted greens, calming textures, and reflective corners for peaceful pauses.",
    nodeIds: [
      "BP_panoPath_Exterior0_F0155",
      "BP_panoPath_Exterior0_F0156",
      "BP_panoPath_Exterior0_F0157",
    ],
  },
  {
    id: "basketball-volleyball-court",
    name: "Basketball & Volleyball Court",
    coordinateKey: "BasketBall&Volleyball court",
    image: "https://cdn.sthyra.com/images/Untitled-1.png",
    description:
      "An active multi-sport zone designed for fast games, energetic practice sessions, and lively community play.",
    nodeIds: [
      "BP_panoPath_Exterior21_F0072",
      "BP_panoPath_Exterior21_F0073",
      "BP_panoPath_Exterior21_F0074",
      "BP_panoPath_Exterior21_F0075",
      "BP_panoPath_Exterior22_F0076",
      "BP_panoPath_Exterior22_F0077",
      "BP_panoPath_Exterior22_F0078",
      "BP_panoPath_Exterior36_F0120",
    ],
  },
  {
    id: "futsal-tennis-court",
    name: "Futsal / Tennis Court",
    coordinateKey: "Fustal Court/Tennis Court",
    image: "",
    description:
      "A versatile court setting built for competitive matches, focused drills, and all-day outdoor recreation.",
    nodeIds: [
      "BP_panoPath_Exterior19_F0064",
      "BP_panoPath_Exterior19_F0065",
      "BP_panoPath_Exterior19_F0066",
      "BP_panoPath_Exterior19_F0067",
      "BP_panoPath_Exterior36_F0123",
    ],
  },
  {
    id: "mini-cricket-stadium",
    name: "Mini Cricket Stadium",
    coordinateKey: "Mini-Cricket Stadium",
    image: "",
    description:
      "A dedicated cricket arena offering open sightlines, practice-friendly space, and a spirited match-day atmosphere.",
    nodeIds: [
      "BP_panoPath_Exterior20_F0068",
      "BP_panoPath_Exterior20_F0069",
      "BP_panoPath_Exterior20_F0070",
      "BP_panoPath_Exterior20_F0071",
    ],
  },
  {
    id: "hammock-garden",
    name: "Hammock Garden",
    coordinateKey: "HammockGarden",
    image: "",
    description:
      "A breezy relaxation grove with shaded lounging spots, soft landscaping, and a slow, restful garden mood.",
    nodeIds: [
      "BP_panoPath_Exterior17_F0142",
      "BP_panoPath_Exterior17_F0143",
      "BP_panoPath_Exterior29_F0089",
      "BP_panoPath_Exterior29_F0090",
    ],
  },
  {
    id: "skating-ring",
    name: "Skating Ring",
    coordinateKey: "SkatingRing",
    image: "",
    description:
      "A smooth, playful loop created for skating fun, active evenings, and confident movement practice.",
    nodeIds: [
      "BP_panoPath_Exterior18_F0062",
      "BP_panoPath_Exterior18_F0063",
      "BP_panoPath_Exterior36_F0121",
      "BP_panoPath_Exterior36_F0122",
    ],
  },
  {
    id: "outdoor-gym",
    name: "Outdoor Gym",
    coordinateKey: "Outdoor GYM",
    image: "",
    description:
      "An open-air fitness corner blending strength stations, fresh air workouts, and energizing everyday routines.",
    nodeIds: [
      "BP_panoPath_Exterior15_F0056",
      "BP_panoPath_Exterior15_F0058",
      "BP_panoPath_Exterior16_F0060",
      "BP_panoPath_Exterior16_F0061",
      "BP_panoPath_Exterior36_F0124",
    ],
  },
  {
    id: "rock-garden",
    name: "Rock Garden",
    coordinateKey: "RockGarden",
    image: "",
    description:
      "A sculpted landscape pocket featuring textured stonework, layered planting, and a grounded natural character.",
    nodeIds: [
      "BP_panoPath_Exterior15_F0057",
      "BP_panoPath_Exterior15_F0059",
    ],
  },
  {
    id: "amphi-theatre",
    name: "Amphi Theatre",
    coordinateKey: "AmphiTheater",
    image: "",
    description:
      "A stepped gathering venue crafted for performances, celebrations, screenings, and memorable community moments.",
    nodeIds: [
      "BP_panoPath_Exterior12_F0047",
      "BP_panoPath_Exterior12_F0048",
      "BP_panoPath_Exterior12_F0049",
      "BP_panoPath_Exterior13_F0050",
      "BP_panoPath_Exterior13_F0051",
      "BP_panoPath_Exterior13_F0052",
      "BP_panoPath_Exterior13_F0053",
      "BP_panoPath_Exterior11_F0043",
      "BP_panoPath_Exterior11_F0044",
      "BP_panoPath_Exterior11_F0045",
    ],
  },
  {
    id: "calisthenics-sand-pit",
    name: "Calisthenics Sand Pit",
    coordinateKey: "Calisthenics Sand pit",
    image: "",
    description:
      "A training-focused activity zone with soft ground, bodyweight movement space, and bold outdoor energy.",
    nodeIds: ["BP_panoPath_Exterior14_F0054"],
  },
  {
    id: "wide-cycling-track",
    name: "Wide Cycling Track",
    coordinateKey: "Wide Cycling Track",
    image: "",
    description:
      "A broad circulation spine ideal for cycling laps, active movement, and easy scenic rides.",
    nodeIds: [
      "BP_panoPath_Exterior14_F0054",
      "BP_panoPath_Exterior11_F0046",
      "BP_panoPath_Exterior2_F0170",
    ],
  },
  {
    id: "outdoor-party-lawn",
    name: "Outdoor Party Lawn",
    coordinateKey: "Outdoor Party Lawn",
    image: "",
    description:
      "A celebration-ready green expanse suited for social gatherings, open events, and festive evenings.",
    nodeIds: [
      "BP_panoPath_Exterior10_F0039",
      "BP_panoPath_Exterior10_F0040",
      "BP_panoPath_Exterior10_F0041",
    ],
  },
  {
    id: "childrens-play-area",
    name: "Children's Play Area",
    coordinateKey: "Children's Play Area",
    image: "",
    description:
      "A lively kids' zone with playful features, safe circulation, and room for imaginative outdoor fun.",
    nodeIds: [
      "BP_panoPath_Exterior11_F0042",
      "BP_panoPath_Exterior2_1_F0163",
    ],
  },
  {
    id: "butterfly-garden",
    name: "Butterfly Garden",
    coordinateKey: "ButterflyGarden",
    image: "",
    description:
      "A colorful garden trail inviting butterflies, gentle walks, and a softer connection with nature.",
    nodeIds: [
      "BP_panoPath_Exterior2_1_F0158",
      "BP_panoPath_Exterior2_1_F0159",
      "BP_panoPath_Exterior2_1_F0160",
      "BP_panoPath_Exterior2_1_F0161",
    ],
  },
  {
    id: "flower-garden",
    name: "Flower Garden",
    coordinateKey: "FlowerGarden",
    image: "",
    description:
      "A vibrant bloom-filled setting designed for visual delight, leisurely strolls, and seasonal color.",
    nodeIds: [
      "BP_panoPath_Exterior2_1_F0161",
      "BP_panoPath_Exterior2_1_F0162",
    ],
  },
  {
    id: "play-lawn",
    name: "Play Lawn",
    coordinateKey: "PlayLawn",
    image: "",
    description:
      "A relaxed open lawn for informal games, stretching out, and everyday family recreation.",
    nodeIds: [
      "BP_panoPath_Exterior36_F0113",
      "BP_panoPath_Exterior36_F0114",
    ],
  },
  {
    id: "traditional-play-zone",
    name: "Traditional Play Zone",
    coordinateKey: "TraditionalGameZone",
    image: "",
    description:
      "A nostalgic activity area celebrating classic games, social play, and timeless outdoor interaction.",
    nodeIds: [
      "BP_panoPath_Exterior36_F0115",
      "BP_panoPath_Exterior36_F0116",
    ],
  },
  {
    id: "frisbee-lawn",
    name: "Frisbee Lawn",
    coordinateKey: "Frisbee Lawn",
    image: "",
    description:
      "A free-flowing lawn created for frisbee sessions, quick movement, and lighthearted outdoor activity.",
    nodeIds: [
      "BP_panoPath_Exterior36_F0117",
      "BP_panoPath_Exterior36_F0118",
      "BP_panoPath_Exterior36_F0119",
    ],
  },
  {
    id: "camp-fire",
    name: "Camp Fire",
    coordinateKey: "CampFire",
    image: "",
    description:
      "A cozy social setting built for evening gatherings, warm conversations, and intimate outdoor ambience.",
    nodeIds: [
      "BP_panoPath_Exterior34_F0103",
      "BP_panoPath_Exterior34_F0104",
    ],
  },
  {
    id: "clubhouse",
    name: "Clubhouse",
    coordinateKey: "Culbhouse",
    image: "",
    description:
      "A central lifestyle destination offering shared leisure spaces, refined interiors, and everyday convenience.",
    nodeIds: [
      "BP_panoPath_Exterior35_F0105",
      "BP_panoPath_Exterior35_F0106",
      "BP_panoPath_Exterior35_F0107",
    ],
  },
  {
    id: "g-plus-3-clubhouse",
    name: "G+3 Clubhouse",
    coordinateKey: "G+3 ClubHouse",
    image: "",
    description:
      "A larger clubhouse experience with elevated amenities, layered activity zones, and a grander social feel.",
    nodeIds: [
      "BP_panoPath_Exterior35_F0105",
      "BP_panoPath_Exterior35_F0106",
      "BP_panoPath_Exterior35_F0107",
    ],
  },
  {
    id: "bird-path",
    name: "Bird Path",
    coordinateKey: "BirdPath",
    image: "",
    description:
      "A nature-led walking route combining greenery, gentle movement, and peaceful birdwatching moments.",
    nodeIds: [
      "BP_panoPath_Exterior30_F0095",
      "BP_panoPath_Exterior31_F0098",
      "BP_panoPath_Exterior29_F0093",
      "BP_panoPath_Exterior29_F0094",
    ],
  },
  {
    id: "miyawaki-forest",
    name: "Miyawaki Forest",
    coordinateKey: "MiyaWaki_Forest",
    image: "",
    description:
      "A dense urban forest pocket bringing biodiversity, cooler surroundings, and a rich immersive landscape.",
    nodeIds: [
      "BP_panoPath_Exterior32_F0099",
      "BP_panoPath_Exterior32_F0100",
      "BP_panoPath_Exterior33_F0101",
      "BP_panoPath_Exterior33_F0102",
    ],
  },
  {
    id: "tennikoit-court",
    name: "Tennikoit Court",
    coordinateKey: "Tennikoit Court",
    image: "",
    description:
      "A dedicated game court tailored for quick rallies, friendly matches, and active leisure time.",
    nodeIds: [
      "BP_panoPath_Exterior27_F0082",
      "BP_panoPath_Exterior28_F0083",
      "BP_panoPath_Exterior28_F0084",
    ],
  },
  {
    id: "picnic-lawn",
    name: "Picnic Lawn",
    coordinateKey: "PicnicLawn",
    image: "",
    description:
      "A casual green retreat made for laid-back picnics, family time, and easy open-air relaxation.",
    nodeIds: [
      "BP_panoPath_Exterior29_F0091",
      "BP_panoPath_Exterior29_F0092",
    ],
  },
  {
    id: "pickle-ball-court",
    name: "Pickle Ball Court",
    coordinateKey: "PickleBallcourt",
    image: "",
    description:
      "A compact, high-energy court ideal for quick games, social competition, and skill-building sessions.",
    nodeIds: [
      "BP_panoPath_Exterior23_F0079",
      "BP_panoPath_Exterior24_F0080",
    ],
  },
];

export const EXTERIOR_AMENITY_IMAGE_LINKS = [
  { id: "zen-garden", image: "https://cdn.sthyra.com/images/amenities-compressed/preview/Zen%20garden.avif" },
  { id: "basketball-volleyball-court", image: AMENITY_IMAGE_PLACEHOLDER_URL },
  { id: "futsal-tennis-court", image: "https://cdn.sthyra.com/images/amenities-compressed/preview/Tenis%20Court.avif" },
  { id: "mini-cricket-stadium", image: "https://cdn.sthyra.com/images/amenities-compressed/preview/Mini%20Cricket%20Stadium.avif" },
  { id: "hammock-garden", image: "https://cdn.sthyra.com/images/amenities-compressed/preview/Hamlock%20Garden.avif" },
  { id: "skating-ring", image: AMENITY_IMAGE_PLACEHOLDER_URL },
  { id: "outdoor-gym", image: "https://cdn.sthyra.com/images/amenities-compressed/preview/Outdoor%20Gym.avif" },
  { id: "rock-garden", image: AMENITY_IMAGE_PLACEHOLDER_URL },
  { id: "amphi-theatre", image: "https://cdn.sthyra.com/images/amenities-compressed/preview/Amphi%20Theatre.avif" },
  { id: "calisthenics-sand-pit", image: AMENITY_IMAGE_PLACEHOLDER_URL },
  { id: "wide-cycling-track", image: "https://cdn.sthyra.com/images/amenities-compressed/preview/Wide%20Cycling%20Track.avif" },
  { id: "outdoor-party-lawn", image: "https://cdn.sthyra.com/images/amenities-compressed/preview/Outdoor%20Party%20Lawn.avif" },
  { id: "childrens-play-area", image: "https://cdn.sthyra.com/images/amenities-compressed/preview/Children%20Play%20Area.avif" },
  { id: "butterfly-garden", image: AMENITY_IMAGE_PLACEHOLDER_URL },
  { id: "flower-garden", image: AMENITY_IMAGE_PLACEHOLDER_URL },
  { id: "play-lawn", image: "https://cdn.sthyra.com/images/amenities-compressed/preview/Play%20Lawn.avif" },
  { id: "traditional-play-zone", image: AMENITY_IMAGE_PLACEHOLDER_URL },
  { id: "frisbee-lawn", image: AMENITY_IMAGE_PLACEHOLDER_URL },
  { id: "camp-fire", image: "https://cdn.sthyra.com/images/amenities-compressed/preview/CampFire.avif" },
  { id: "clubhouse", image: AMENITY_IMAGE_PLACEHOLDER_URL },
  { id: "g-plus-3-clubhouse", image: AMENITY_IMAGE_PLACEHOLDER_URL },
  { id: "bird-path", image: AMENITY_IMAGE_PLACEHOLDER_URL },
  { id: "miyawaki-forest", image: AMENITY_IMAGE_PLACEHOLDER_URL },
  { id: "tennikoit-court", image: AMENITY_IMAGE_PLACEHOLDER_URL },
  { id: "picnic-lawn", image: "https://cdn.sthyra.com/images/amenities-compressed/preview/Picnic%20Lawn.avif" },
  { id: "pickle-ball-court", image: AMENITY_IMAGE_PLACEHOLDER_URL },
] as const;

const amenityImageMap = new Map<string, string>(
  EXTERIOR_AMENITY_IMAGE_LINKS.map((entry) => [entry.id, entry.image]),
);

export const EXTERIOR_MINIMAP_IMAGE_URL =
  "https://cdn.sthyra.com/images/Final_5.avif";

export const EXTERIOR_MINIMAP_BOUNDS = {
  bottomLeft: {
    x: -16008,
    y: 7020,
  },
  topRight: {
    x: 10615,
    y: -9635,
  },
} as const;

export const EXTERIOR_MINIMAP_IMAGE_LAYOUT = {
  width: 2879,
  height: 1680,
} as const;

export const exteriorAmenities: ExteriorAmenity[] = amenityDefinitions.map(
  (amenity) => ({
    ...amenity,
    image: amenityImageMap.get(amenity.id) ?? amenity.image ?? AMENITY_IMAGE_PLACEHOLDER_URL,
    primaryNodeId: amenity.nodeIds[0],
    coordinate: getAmenityCoordinate(amenity.coordinateKey),
    summary: createSummary(amenity.nodeIds),
  }),
);
