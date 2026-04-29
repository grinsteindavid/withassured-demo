import { describe, it, expect, mock, beforeEach } from "bun:test";
import { NextRequest } from "next/server";

const getSessionUserMock = mock(async () => ({ userId: "user_1", orgId: "org_1", role: "ADMIN" }));
const getAlertsMock = mock(async () => []);
const markAllAlertsAsReadMock = mock(async () => {});
const markAlertAsReadMock = mock(async () => {});

mock.module("@/lib/auth", () => ({
  getSessionUser: getSessionUserMock,
}));

mock.module("@/lib/alerts", () => ({
  getAlerts: getAlertsMock,
  markAllAlertsAsRead: markAllAlertsAsReadMock,
  markAlertAsRead: markAlertAsReadMock,
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

const { GET, PATCH } = await import("./route");

beforeEach(() => {
  getSessionUserMock.mockClear();
  getAlertsMock.mockClear();
  markAllAlertsAsReadMock.mockClear();
  markAlertAsReadMock.mockClear();
});

describe("GET /api/alerts", () => {
  it("returns 401 when no session", async () => {
    getSessionUserMock.mockResolvedValueOnce(null as any);

    const response = await GET(new NextRequest("http://localhost/api/alerts"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("fetches alerts with default parameters", async () => {
    getSessionUserMock.mockResolvedValueOnce({ userId: "user_1", orgId: "org_1", role: "ADMIN" });
    getAlertsMock.mockResolvedValueOnce([]);

    const response = await GET(new NextRequest("http://localhost/api/alerts"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(getAlertsMock).toHaveBeenCalledWith("org_1", { limit: 50, offset: 0 });
    expect(data).toEqual({ alerts: [] });
  });

  it("fetches alerts with severity filter", async () => {
    getSessionUserMock.mockResolvedValueOnce({ userId: "user_1", orgId: "org_1", role: "ADMIN" });
    getAlertsMock.mockResolvedValueOnce([]);

    const response = await GET(new NextRequest("http://localhost/api/alerts?severity=ERROR"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(getAlertsMock).toHaveBeenCalledWith("org_1", { severity: "ERROR", limit: 50, offset: 0 });
    expect(data).toEqual({ alerts: [] });
  });

  it("fetches alerts with custom limit and offset", async () => {
    getSessionUserMock.mockResolvedValueOnce({ userId: "user_1", orgId: "org_1", role: "ADMIN" });
    getAlertsMock.mockResolvedValueOnce([]);

    const response = await GET(new NextRequest("http://localhost/api/alerts?limit=100&offset=50"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(getAlertsMock).toHaveBeenCalledWith("org_1", { limit: 100, offset: 50 });
    expect(data).toEqual({ alerts: [] });
  });
});

describe("PATCH /api/alerts", () => {
  it("returns 401 when no session", async () => {
    getSessionUserMock.mockResolvedValueOnce(null as any);

    const request = new NextRequest("http://localhost/api/alerts", { method: "PATCH" });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("marks all alerts as read when markAll is true", async () => {
    getSessionUserMock.mockResolvedValueOnce({ userId: "user_1", orgId: "org_1", role: "ADMIN" });
    markAllAlertsAsReadMock.mockResolvedValueOnce();

    const request = new NextRequest("http://localhost/api/alerts", {
      method: "PATCH",
      body: JSON.stringify({ markAll: true }),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(markAllAlertsAsReadMock).toHaveBeenCalledWith("org_1");
    expect(data).toEqual({ success: true });
  });

  it("marks specific alerts as read", async () => {
    getSessionUserMock.mockResolvedValueOnce({ userId: "user_1", orgId: "org_1", role: "ADMIN" });
    markAlertAsReadMock.mockResolvedValueOnce();

    const request = new NextRequest("http://localhost/api/alerts", {
      method: "PATCH",
      body: JSON.stringify({ alertIds: ["alert_1", "alert_2"] }),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(markAlertAsReadMock).toHaveBeenCalledWith("alert_1");
    expect(markAlertAsReadMock).toHaveBeenCalledWith("alert_2");
    expect(data).toEqual({ success: true });
  });

  it("returns 400 for invalid request body", async () => {
    getSessionUserMock.mockResolvedValueOnce({ userId: "user_1", orgId: "org_1", role: "ADMIN" });

    const request = new NextRequest("http://localhost/api/alerts", {
      method: "PATCH",
      body: JSON.stringify({}),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "Invalid request body" });
  });
});
