import AdminDashboard from "@/components/admin/AdminDashboard";
import { getInventoryAdminRows } from "@/lib/inventory";
import { buildPageMetadata } from "@/lib/metadata";
import type { InventoryAdminRow } from "@/types/inventory";

export const dynamic = "force-dynamic";
export const metadata = buildPageMetadata({
  title: "Inventory Dashboard",
  description:
    "Protected inventory administration dashboard for Trifecta Veranza.",
  robots: {
    index: false,
    follow: false,
  },
});

export default async function AdminPage() {
  let inventory: InventoryAdminRow[] = [];

  try {
    inventory = await getInventoryAdminRows();
  } catch {
    inventory = [];
  }

  return <AdminDashboard initialInventory={inventory} />;
}
