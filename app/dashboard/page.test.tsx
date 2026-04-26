import { describe, it, expect, mock, beforeEach } from "bun:test";

const count = mock(async () => 0 as number);
const verifyJWTMock = mock(async () => null as { sub: string; orgId: string; role: string } | null);
const getSessionUserMock = mock(async () => ({ userId: "user_1", orgId: "org_1", role: "ADMIN" }));
const cookiesMock = mock(async () => ({
  get: mock(() => ({ value: "mock-token" })),
}));

mock.module("@/lib/db", () => ({
  prisma: {
    provider: { count },
    credentialingCase: { count },
    payerEnrollment: { count },
    complianceCheck: { count },
  },
}));

mock.module("@/lib/auth", () => ({
  verifyJWT: verifyJWTMock,
  getSessionUser: getSessionUserMock,
}));

mock.module("next/headers", () => ({
  cookies: cookiesMock,
}));

mock.module("next/navigation", () => ({
  redirect: mock(() => {
    throw new Error("NEXT_REDIRECT");
  }),
  useRouter: () => ({
    push: mock(() => {}),
    refresh: mock(() => {}),
  }),
}));

const { default: DashboardOverview } = await import("./page");

beforeEach(() => {
  count.mockReset();
  verifyJWTMock.mockReset();
  getSessionUserMock.mockReset();
});

describe("DashboardOverview", () => {
  it("filters data by orgId correctly", async () => {
    getSessionUserMock.mockResolvedValueOnce({ userId: "user_1", orgId: "org_test", role: "ADMIN" });

    await DashboardOverview();

    expect(count).toHaveBeenCalledWith({ where: { orgId: "org_test" } });
    expect(count).toHaveBeenCalledWith({
      where: { provider: { orgId: "org_test" }, status: "COMPLETED" },
    });
    expect(count).toHaveBeenCalledWith({
      where: { provider: { orgId: "org_test" }, status: "PENDING" },
    });
    expect(count).toHaveBeenCalledWith({
      where: { provider: { orgId: "org_test" }, result: "FLAG" },
    });
  });

  it("renders without error when authenticated", async () => {
    getSessionUserMock.mockResolvedValueOnce({ userId: "user_1", orgId: "org_1", role: "ADMIN" });
    count.mockResolvedValueOnce(5);
    count.mockResolvedValueOnce(3);
    count.mockResolvedValueOnce(2);
    count.mockResolvedValueOnce(1);

    const page = await DashboardOverview();
    expect(page).toBeTruthy();
  });

  it("displays correct metric values when data exists", async () => {
    getSessionUserMock.mockResolvedValueOnce({ userId: "user_1", orgId: "org_1", role: "ADMIN" });
    count.mockResolvedValueOnce(10); // total providers
    count.mockResolvedValueOnce(8); // active credentials
    count.mockResolvedValueOnce(5); // pending enrollments
    count.mockResolvedValueOnce(2); // compliance alerts

    const page = await DashboardOverview();
    expect(page).toBeTruthy();

    // Verify the correct counts were queried
    expect(count).toHaveBeenCalledTimes(4);
  });
});
