import { NextResponse } from "next/server";
import { removePaymentMethod } from "@/lib/payments";
import { withRoleParams } from "@/lib/route-guard";

export const DELETE = withRoleParams(
  async (_request, params, user) => {
    const id = (await params).id as string;
    const success = await removePaymentMethod(user.orgId, id, user.userId);

    if (!success) {
      return NextResponse.json({ error: "Payment method not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  },
  ["ADMIN"],
);
