import { buildPageMetadata } from "@/lib/metadata";
import MasterPlanLayout from "@/components/MasterPlanLayout";
import { getInventoryApartments } from "@/lib/inventory";
import type { InventoryApartment } from "@/types/inventory";
import { unstable_cache } from "next/cache";

export const metadata = buildPageMetadata({
  title: "Master Plan",
  description:
    "Explore the Trifecta Veranza master plan with interactive hotspot navigation, apartment discovery, and tower-level filtering.",
  keywords: [
    "Trifecta Veranza master plan",
    "interactive master plan",
    "apartment explorer",
    "tower layout",
  ],
});

export const revalidate = 30;

const getCachedInventoryApartments = unstable_cache(
  getInventoryApartments,
  ["master-plan-inventory"],
  {
    revalidate: 30,
    tags: ["inventory"],
  },
);

export default async function MasterPlanPage() {
  let initialApartments: InventoryApartment[] = [];

  try {
    initialApartments = await getCachedInventoryApartments();
  } catch {
    console.error("Failed to load master plan inventory.");
  }

  return (
    <div className="relative app-shell bg-black">
      <div className="">
        <MasterPlanLayout initialApartments={initialApartments} />
      </div>
    </div>
  );
}
