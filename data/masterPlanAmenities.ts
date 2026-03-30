import rawAmenities from "./AminetiesCoordinates.json";

export type MasterPlanAmenityCoordinate = {
  x: number;
  y: number;
  z: number;
};

export type MasterPlanAmenity = {
  id: string;
  label: string;
  coordinate: MasterPlanAmenityCoordinate;
};

function formatAmenityLabel(label: string) {
  return label
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function createAmenityId(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const masterPlanAmenities = Object.entries(
  rawAmenities as Record<string, MasterPlanAmenityCoordinate>,
).map(([label, coordinate]) => ({
  coordinate,
  id: createAmenityId(label),
  label: formatAmenityLabel(label),
})) satisfies MasterPlanAmenity[];
