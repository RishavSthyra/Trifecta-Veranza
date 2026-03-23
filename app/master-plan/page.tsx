import MasterPlanLayout from "@/components/MasterPlanLayout";
import { getInventoryApartments } from "@/lib/inventory";
import type { InventoryApartment } from "@/types/inventory";

export const dynamic = "force-dynamic";

export default async function MasterPlanPage() {
  let initialApartments: InventoryApartment[] = [];

  try {
    initialApartments = await getInventoryApartments();
  } catch {
    initialApartments = [];
  }

  return (
    <div className="relative h-dvh overflow-hidden bg-zinc-50 dark:bg-black">
      <div className="">
        <MasterPlanLayout initialApartments={initialApartments} />
      </div>
    </div>
  );
}
