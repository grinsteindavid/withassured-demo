import { NextResponse } from "next/server";
import { listPaymentMethods, addPaymentMethod } from "@/lib/payments";
import { withRole } from "@/lib/route-guard";

export const GET = withRole(
  async (_request, user) => {
    const methods = await listPaymentMethods(user.orgId);
    return NextResponse.json(methods);
  },
  ["ADMIN"],
);

export const POST = withRole(
  async (request, user) => {
    const body = await request.json();
    const { type, last4, expiryMonth, expiryYear, brand, setDefault } = body;

    if (!type || !last4) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (type === "CARD" && (!expiryMonth || !expiryYear)) {
      return NextResponse.json({ error: "Card expiry is required" }, { status: 400 });
    }

    try {
      const method = await addPaymentMethod(user.orgId, {
        type,
        last4,
        expiryMonth: expiryMonth ? parseInt(expiryMonth) : 0,
        expiryYear: expiryYear ? parseInt(expiryYear) : 0,
        brand,
        setDefault,
      });
      return NextResponse.json(method, { status: 201 });
    } catch (_error) {
      return NextResponse.json({ error: "Failed to add payment method" }, { status: 500 });
    }
  },
  ["ADMIN"],
);
