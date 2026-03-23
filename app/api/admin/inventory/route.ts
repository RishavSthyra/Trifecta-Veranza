import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getInventoryAdminRows } from "@/lib/inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const inventory = await getInventoryAdminRows();
    return NextResponse.json({ inventory });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load admin inventory.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
