import { NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";

export async function GET(request: Request) {
  const token = request.headers.get("cookie")?.match(/session=([^;]+)/)?.[1];

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await verifyJWT(token);

  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ userId: payload.sub, orgId: payload.orgId, role: payload.role });
}
