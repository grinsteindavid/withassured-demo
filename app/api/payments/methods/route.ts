import { NextResponse } from "next/server";
import { listPaymentMethods, addPaymentMethod } from "@/lib/payments";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const methods = await listPaymentMethods(user.orgId);
  return NextResponse.json(methods);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { type, last4, expiryMonth, expiryYear, brand, setDefault } = body;

  if (!type || !last4 || !expiryMonth || !expiryYear) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const method = await addPaymentMethod(user.orgId, {
      type,
      last4,
      expiryMonth: parseInt(expiryMonth),
      expiryYear: parseInt(expiryYear),
      brand,
      setDefault,
    });
    return NextResponse.json(method, { status: 201 });
  } catch (_error) {
    return NextResponse.json({ error: "Failed to add payment method" }, { status: 500 });
  }
}
