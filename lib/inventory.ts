import { connectToDatabase } from "@/lib/mongodb";
import type { InventoryDocument } from "@/models/Inventory";
import type {
  InventoryAdminRow,
  InventoryApartment,
  InventoryFacing,
  InventoryStatus,
  TowerType,
} from "@/types/inventory";

type InventoryRawDocument = Partial<InventoryDocument> & {
  _id: { toString(): string };
  tower?: string;
  floor?: string | number;
  unit?: string;
  type?: string;
  facing?: string;
  area?: string | number;
  rooms?: string;
  status?: InventoryStatus | "Booked" | string;
};

function normalizeTower(value?: string): TowerType {
  return value === "Tower B" ? "Tower B" : "Tower A";
}

function normalizeFacing(value?: string): InventoryFacing {
  if (value === "North" || value === "South" || value === "East" || value === "West") {
    return value;
  }

  return "East";
}

export function normalizeStatus(
  value?: InventoryStatus | "Booked" | string,
): InventoryStatus {
  if (value === "Reserved") return "Reserved";
  if (value === "Sold" || value === "Booked") return "Sold";
  return "Available";
}

function parseBhk(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseArea(value: string | number) {
  const parsed =
    typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseFloorValue(value: string | number) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (value.toUpperCase() === "G") return 0;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function estimatePriceLakhs(areaSqft: number, bhk: number) {
  const rateByBhk = bhk >= 3 ? 0.074 : bhk === 2 ? 0.066 : 0.061;
  return Math.max(45, Math.round(areaSqft * rateByBhk));
}

export function mapInventoryDocToApartment(
  doc: InventoryRawDocument,
): InventoryApartment {
  const flatNumber = doc.Flat_Number || doc.unit || "";
  const tower = doc.Tower || doc.tower;
  const bhkLabel = doc.BHK || doc.type || "";
  const floorLabel = String(doc.Floor ?? doc.floor ?? "");
  const facing = doc.Facing || doc.facing;
  const area = doc.Super_Built_Up_Area_sqft ?? doc.area ?? 0;
  const roomDimensions = doc.Room_Dimensions || doc.rooms || "";
  const areaSqft = parseArea(area);
  const bhk = parseBhk(bhkLabel);

  return {
    id: doc._id.toString(),
    title: flatNumber ? flatNumber.toUpperCase() : "UNNAMED",
    flatNumber,
    tower: normalizeTower(tower),
    bhk,
    priceLakhs: estimatePriceLakhs(areaSqft, bhk),
    areaSqft,
    floor: parseFloorValue(floorLabel),
    floorLabel,
    facing: normalizeFacing(facing),
    status: normalizeStatus(doc.status),
    roomDimensions,
  };
}

export function mapInventoryDocToAdminRow(
  doc: InventoryRawDocument,
): InventoryAdminRow {
  const flatNumber = doc.Flat_Number || doc.unit || "";
  const tower = doc.Tower || doc.tower;
  const bhk = doc.BHK || doc.type || "";
  const floor = String(doc.Floor ?? doc.floor ?? "");
  const facing = doc.Facing || doc.facing;
  const area = doc.Super_Built_Up_Area_sqft ?? doc.area ?? 0;
  const roomDimensions = doc.Room_Dimensions || doc.rooms || "";

  return {
    id: doc._id.toString(),
    tower: normalizeTower(tower),
    floor,
    flatNumber,
    bhk,
    facing: normalizeFacing(facing),
    areaSqft: parseArea(area),
    roomDimensions,
    status: normalizeStatus(doc.status),
  };
}

export async function getInventoryApartments() {
  const connection = await connectToDatabase();
  const inventoryDocs = await connection.connection.db!
    .collection("inventory")
    .find({})
    .toArray();

  return inventoryDocs
    .map((doc) => mapInventoryDocToApartment(doc as InventoryRawDocument))
    .filter((doc) => doc.flatNumber)
    .sort((left, right) => {
      if (left.tower !== right.tower) {
        return left.tower.localeCompare(right.tower);
      }

      if (left.floor !== right.floor) {
        return left.floor - right.floor;
      }

      return left.flatNumber.localeCompare(right.flatNumber);
    });
}

export async function getInventoryAdminRows() {
  const connection = await connectToDatabase();
  const inventoryDocs = await connection.connection.db!
    .collection("inventory")
    .find({})
    .toArray();

  return inventoryDocs
    .map((doc) => mapInventoryDocToAdminRow(doc as InventoryRawDocument))
    .filter((doc) => doc.flatNumber)
    .sort((left, right) => {
      if (left.tower !== right.tower) {
        return left.tower.localeCompare(right.tower);
      }

      const leftFloor = parseFloorValue(left.floor);
      const rightFloor = parseFloorValue(right.floor);
      if (leftFloor !== rightFloor) {
        return leftFloor - rightFloor;
      }

      return left.flatNumber.localeCompare(right.flatNumber);
    });
}
