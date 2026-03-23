import { NextResponse } from "next/server";
import { getInventoryApartments } from "@/lib/inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const apartments = await getInventoryApartments();
    return NextResponse.json({ apartments });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load inventory.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
