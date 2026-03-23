import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import Inventory from "@/models/Inventory";
import { normalizeStatus } from "@/lib/inventory";
import type { InventoryStatus } from "@/types/inventory";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;

  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Invalid inventory id." }, { status: 400 });
  }

  try {
    const body = (await request.json()) as { status?: InventoryStatus | string };
    const status = normalizeStatus(body.status);

    await connectToDatabase();

    const updated = await Inventory.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true },
    ).lean();

    if (!updated) {
      return NextResponse.json(
        { message: "Inventory item not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: "Inventory status updated.",
      status,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update inventory status.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
