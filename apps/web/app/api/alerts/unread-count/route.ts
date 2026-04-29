import { NextResponse } from "next/server";
import { getUnreadCount } from "@/lib/alerts";
import { withAuth } from "@/lib/route-guard";

export const GET = withAuth(async (_request, user) => {
  try {
    const count = await getUnreadCount(user.orgId);

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}, { csrf: false });
