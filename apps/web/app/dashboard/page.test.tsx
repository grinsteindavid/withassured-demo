import { describe, it, expect, mock, beforeEach, afterAll } from "bun:test";

import * as RealAnalyticsSection from "@/components/dashboard/analytics/analytics-section";
const realAnalyticsSection = { ...RealAnalyticsSection };

const count = mock(async () => 0 as number);
const verifyJWTMock = mock(async () => null as { sub: string; orgId: string; role: string } | null);
const getSessionUserMock = mock(async () => ({ userId: "user_1", orgId: "org_1", role: "ADMIN" }));
const cookiesMock = mock(async () => ({
  get: mock(() => ({ value: "mock-token" })),
}));

const findUnique = mock(async () => ({ name: "Test Org" }));

mock.module("@/lib/db", () => ({
  prisma: {
    provider: { count },
    credentialingCase: { count },
    payerEnrollment: { count },
    complianceCheck: { count },
    license: { count },
    organization: { findUnique },
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
  useSearchParams: () => new URLSearchParams(),
}));

mock.module("@/components/dashboard/analytics/analytics-section", () => ({
  AnalyticsSection: () => null,
}));

// Restore the real module after this file's tests so later test files
// (e.g. analytics-section.test.tsx) see the real component.
afterAll(() => {
  mock.module("@/components/dashboard/analytics/analytics-section", () => realAnalyticsSection);
});

const { default: DashboardOverview } = await import("./page");

beforeEach(() => {
  count.mockReset();
  findUnique.mockReset();
  verifyJWTMock.mockReset();
  getSessionUserMock.mockReset();
});

describe("DashboardOverview", () => {
  it("filters data by orgId correctly", async () => {
    getSessionUserMock.mockResolvedValueOnce({ userId: "user_1", orgId: "org_test", role: "ADMIN" });

    await DashboardOverview({ searchParams: {} });

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
    expect(count).toHaveBeenCalledWith({
      where: { provider: { orgId: "org_test" }, status: "EXPIRED" },
    });
  });

  it("renders without error when authenticated", async () => {
    getSessionUserMock.mockResolvedValueOnce({ userId: "user_1", orgId: "org_1", role: "ADMIN" });
    count.mockResolvedValueOnce(5);
    count.mockResolvedValueOnce(3);
    count.mockResolvedValueOnce(2);
    count.mockResolvedValueOnce(1);
    count.mockResolvedValueOnce(0);

    const page = await DashboardOverview({ searchParams: {} });
    expect(page).toBeTruthy();
  });

  it("displays correct metric values when data exists", async () => {
    getSessionUserMock.mockResolvedValueOnce({ userId: "user_1", orgId: "org_1", role: "ADMIN" });
    count.mockResolvedValueOnce(10); // total providers
    count.mockResolvedValueOnce(8); // active credentials
    count.mockResolvedValueOnce(5); // pending enrollments
    count.mockResolvedValueOnce(2); // compliance alerts
    count.mockResolvedValueOnce(1); // expired licenses

    const page = await DashboardOverview({ searchParams: {} });
    expect(page).toBeTruthy();

    // Verify the correct counts were queried
    expect(count).toHaveBeenCalledTimes(5);
  });
});
