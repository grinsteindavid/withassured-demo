import { NextRequest, NextResponse } from "next/server";
import { getAlerts, markAllAlertsAsRead, markAlertAsRead } from "@/lib/alerts";
import { withAuth } from "@/lib/route-guard";

export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const severity = searchParams.get("severity") as "INFO" | "ERROR" | null;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const alerts = await getAlerts(user.orgId, {
      severity: severity || undefined,
      limit,
      offset,
    });

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}, { csrf: false });

export const PATCH = withAuth(async (request: NextRequest, user) => {
  try {
    const body = await request.json();
    const { alertIds, markAll } = body;

    if (markAll) {
      await markAllAlertsAsRead(user.orgId);
    } else if (alertIds && Array.isArray(alertIds)) {
      for (const alertId of alertIds) {
        await markAlertAsRead(alertId);
      }
    } else {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking alerts as read:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
