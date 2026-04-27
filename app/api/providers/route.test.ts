import { describe, it, expect, mock } from "bun:test";

const mockUser = { id: "user_1", orgId: "org_1", email: "test@test.com" };
const getSessionUserMock = mock(async () => mockUser);
const requireActiveSubscriptionMock = mock(async () => true);
const subscriptionBlockedResponseMock = mock(() =>
  new Response(JSON.stringify({ error: "Subscription required" }), { status: 403 })
);

mock.module("@/lib/auth", () => ({
  getSessionUser: getSessionUserMock,
}));

mock.module("@/lib/subscription-guard", () => ({
  requireActiveSubscription: requireActiveSubscriptionMock,
  subscriptionBlockedResponse: subscriptionBlockedResponseMock,
}));

const mockListProviders = mock(async () => [
  {
    id: "p_1",
    npi: "1234567890",
    name: "Dr. Test",
    specialty: "Cardiology",
    status: "ACTIVE",
    licenseCount: 2,
    enrollmentCount: 1,
    hasComplianceFlag: false,
    createdAt: new Date("2026-01-01"),
  },
]);

const mockCreateProvider = mock(async (data: Record<string, unknown>) => ({
  id: "p_new",
  ...data,
}));

mock.module("@/lib/providers", () => ({
  listProviders: mockListProviders,
  createProvider: mockCreateProvider,
}));

const { GET, POST } = await import("./route");

describe("GET /api/providers", () => {
  it("returns 401 without auth", async () => {
    getSessionUserMock.mockResolvedValueOnce(null as any);
    const res = await GET(new Request("http://t/api/providers"));
    expect(res.status).toBe(401);
  });

  it("returns providers with auth", async () => {
    getSessionUserMock.mockResolvedValueOnce(mockUser);
    mockListProviders.mockClear();
    const res = await GET(new Request("http://t/api/providers"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].name).toBe("Dr. Test");
  });

  it("passes filters to listProviders", async () => {
    getSessionUserMock.mockResolvedValueOnce(mockUser);
    mockListProviders.mockClear();
    const res = await GET(new Request("http://t/api/providers?status=ACTIVE&specialty=Cardiology"));
    expect(res.status).toBe(200);
    expect(mockListProviders).toHaveBeenCalledWith("org_1", {
      status: "ACTIVE",
      specialty: "Cardiology",
    });
  });
});

describe("POST /api/providers", () => {
  it("returns 401 without auth", async () => {
    getSessionUserMock.mockResolvedValueOnce(null as any);
    const res = await POST(
      new Request("http://t/api/providers", {
        method: "POST",
        body: JSON.stringify({ npi: "1234567890", name: "Dr. Test", specialty: "Cardiology", status: "ACTIVE" }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("creates a provider with valid data", async () => {
    getSessionUserMock.mockResolvedValueOnce(mockUser);
    mockCreateProvider.mockClear();
    const res = await POST(
      new Request("http://t/api/providers", {
        method: "POST",
        body: JSON.stringify({ npi: "1234567890", name: "Dr. Test", specialty: "Cardiology", status: "ACTIVE" }),
      }),
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe("Dr. Test");
    expect(mockCreateProvider).toHaveBeenCalledWith({
      npi: "1234567890",
      name: "Dr. Test",
      specialty: "Cardiology",
      status: "ACTIVE",
      orgId: "org_1",
    });
  });

  it("returns 400 with invalid data", async () => {
    getSessionUserMock.mockResolvedValueOnce(mockUser);
    const res = await POST(
      new Request("http://t/api/providers", {
        method: "POST",
        body: JSON.stringify({ npi: "123", name: "", specialty: "", status: "INVALID" }),
      }),
    );
    expect(res.status).toBe(400);
  });
});
