import { NextResponse } from "next/server";
import { setDefaultPaymentMethod } from "@/lib/payments";
import { getSessionUser } from "@/lib/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const success = await setDefaultPaymentMethod(user.orgId, id);

  if (!success) {
    return NextResponse.json({ error: "Payment method not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
