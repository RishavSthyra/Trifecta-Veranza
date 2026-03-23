import { NextResponse } from "next/server";
import {
  getAdminSessionCookie,
  isValidAdminCredentials,
} from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
    };

    if (
      !body.username ||
      !body.password ||
      !isValidAdminCredentials(body.username, body.password)
    ) {
      return NextResponse.json(
        { message: "Invalid username or password." },
        { status: 401 },
      );
    }

    const response = NextResponse.json({ message: "Login successful." });
    response.cookies.set(getAdminSessionCookie());
    return response;
  } catch {
    return NextResponse.json({ message: "Unable to login." }, { status: 500 });
  }
}
