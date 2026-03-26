import MasterPlanLayout from "@/components/MasterPlanLayout";
import { getInventoryApartments } from "@/lib/inventory";

export default async function MasterPlanPage() {
  const initialApartments = await getInventoryApartments();

  return (
    <div className="relative min-h-dvh bg-zinc-50 dark:bg-black">
      <div className="">
        <MasterPlanLayout initialApartments={initialApartments} />
      </div>
    </div>
  );
}
