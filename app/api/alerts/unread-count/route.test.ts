import { describe, it, expect, mock, beforeEach } from "bun:test";
import { NextRequest } from "next/server";

const getSessionUserMock = mock(async () => ({ userId: "user_1", orgId: "org_1", role: "ADMIN" }));
const getUnreadCountMock = mock(async () => 0);

mock.module("@/lib/auth", () => ({
  getSessionUser: getSessionUserMock,
}));

mock.module("@/lib/alerts", () => ({
  getUnreadCount: getUnreadCountMock,
  getAlerts: async () => [],
  markAlertAsRead: async () => {},
  markAllAlertsAsRead: async () => {},
}));

mock.module("@/lib/rate-limit", () => ({
  rateLimit: async () => ({ allowed: true }),
  buildIdentifier: () => "test-identifier",
  RateLimitUnavailableError: class extends Error {},
}));

mock.module("@/lib/route-guard", () => ({
  withAuth: (handler: any, _options?: any) => {
    return async (request: NextRequest) => {
      const user = await getSessionUserMock();
      if (!user) {
        const { NextResponse } = await import("next/server");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return handler(request, user);
    };
  },
}));

let GET: any;

beforeEach(async () => {
  getSessionUserMock.mockClear();
  getUnreadCountMock.mockClear();
  const route = await import("./route");
  GET = route.GET;
});

describe("GET /api/alerts/unread-count", () => {
  it("returns 401 when no session", async () => {
    getSessionUserMock.mockResolvedValueOnce(null as any);

    const response = await GET(new NextRequest("http://localhost/api/alerts/unread-count"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns unread count", async () => {
    getSessionUserMock.mockResolvedValueOnce({ userId: "user_1", orgId: "org_1", role: "ADMIN" });
    getUnreadCountMock.mockResolvedValueOnce(5);

    const response = await GET(new NextRequest("http://localhost/api/alerts/unread-count"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(getUnreadCountMock).toHaveBeenCalledWith("org_1");
    expect(data).toEqual({ count: 5 });
  });

  it("returns 0 when no unread alerts", async () => {
    getSessionUserMock.mockResolvedValueOnce({ userId: "user_1", orgId: "org_1", role: "ADMIN" });
    getUnreadCountMock.mockResolvedValueOnce(0);

    const response = await GET(new NextRequest("http://localhost/api/alerts/unread-count"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(getUnreadCountMock).toHaveBeenCalledWith("org_1");
    expect(data).toEqual({ count: 0 });
  });
});
