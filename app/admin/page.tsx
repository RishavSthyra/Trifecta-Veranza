import AdminDashboard from "@/components/admin/AdminDashboard";
import { getInventoryAdminRows } from "@/lib/inventory";
import type { InventoryAdminRow } from "@/types/inventory";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  let inventory: InventoryAdminRow[] = [];

  try {
    inventory = await getInventoryAdminRows();
  } catch {
    inventory = [];
  }

  return <AdminDashboard initialInventory={inventory} />;
}
