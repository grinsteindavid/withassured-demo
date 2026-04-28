import { NextResponse } from "next/server";
import { setDefaultPaymentMethod } from "@/lib/payments";
import { withRoleParams } from "@/lib/route-guard";

export const POST = withRoleParams(
  async (_request, params, user) => {
    const id = (await params).id as string;
    const success = await setDefaultPaymentMethod(user.orgId, id);

    if (!success) {
      return NextResponse.json({ error: "Payment method not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  },
  ["ADMIN"],
);
