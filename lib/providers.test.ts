import { describe, it, expect, mock } from "bun:test";

const findMany = mock(async () => [
  { id: "p_1", npi: "1234567890", name: "Dr. Mock", specialty: "Cardiology", status: "ACTIVE", orgId: "org_1" },
]);
const findUnique = mock(async () => ({
  id: "p_1",
  npi: "1234567890",
  name: "Dr. Mock",
  specialty: "Cardiology",
  status: "ACTIVE",
  orgId: "org_1",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  licenses: [],
  enrollments: [],
  complianceChecks: [],
}));
const update = mock(async () => ({ id: "p_1", status: "ACTIVE" }));
const create = mock(async ({ data }: { data: Record<string, unknown> }) => ({ id: "p_new", ...data }));

mock.module("@/lib/db", () => ({
  prisma: { provider: { findMany, findUnique, create, update } },
}));

const { getProviders, listProviders, getProviderDetail, createProvider, computeProviderStatus, recomputeAndUpdateProviderStatus } = await import("./providers");

describe("getProviders", () => {
  it("returns all providers", async () => {
    findMany.mockClear();
    const providers = await getProviders();
    expect(findMany).toHaveBeenCalled();
    expect(Array.isArray(providers)).toBe(true);
    expect(providers[0].id).toBe("p_1");
  });
});

describe("listProviders", () => {
  it("returns providers for org with counts", async () => {
    findMany.mockClear();
    findMany.mockResolvedValueOnce([
      {
        id: "p_1",
        npi: "1234567890",
        name: "Dr. Mock",
        specialty: "Cardiology",
        status: "ACTIVE",
        orgId: "org_1",
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
        licenses: [{ id: "l_1" }, { id: "l_2" }],
        enrollments: [{ id: "e_1" }],
        complianceChecks: [],
      },
    ] as never);
    const providers = await listProviders("org_1");
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orgId: "org_1" },
        include: expect.objectContaining({
          licenses: true,
          enrollments: true,
          complianceChecks: true,
        }),
      }),
    );
    expect(providers[0].licenseCount).toBe(2);
    expect(providers[0].enrollmentCount).toBe(1);
  });

  it("applies status filter in-memory", async () => {
    findMany.mockClear();
    findMany.mockResolvedValueOnce([
      {
        id: "p_active",
        npi: "1234567890",
        name: "Dr. Mock",
        specialty: "Cardiology",
        status: "ACTIVE",
        orgId: "org_1",
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
        licenses: [],
        enrollments: [],
        complianceChecks: [],
      },
      {
        id: "p_inactive",
        npi: "0987654321",
        name: "Dr. Expired",
        specialty: "Cardiology",
        status: "ACTIVE",
        orgId: "org_1",
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
        licenses: [{ id: "l_1", status: "EXPIRED" }],
        enrollments: [],
        complianceChecks: [],
      },
    ] as never);
    const providers = await listProviders("org_1", { status: "ACTIVE" });
    expect(providers).toHaveLength(1);
    expect(providers[0].id).toBe("p_active");
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orgId: "org_1" },
      }),
    );
  });

  it("applies search filter", async () => {
    findMany.mockClear();
    findMany.mockResolvedValueOnce([
      {
        id: "p_1",
        npi: "1234567890",
        name: "Dr. Mock",
        specialty: "Cardiology",
        status: "ACTIVE",
        orgId: "org_1",
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
        licenses: [],
        enrollments: [],
        complianceChecks: [],
      },
    ] as never);
    await listProviders("org_1", { search: "Dr" });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ name: expect.objectContaining({ contains: "Dr" }) }),
            expect.objectContaining({ npi: expect.objectContaining({ contains: "Dr" }) }),
          ]),
        }),
      }),
    );
  });
});

describe("getProviderDetail", () => {
  it("returns provider with relations for valid org", async () => {
    findUnique.mockClear();
    const mockData = {
      id: "p_1",
      npi: "1234567890",
      name: "Dr. Mock",
      specialty: "Cardiology",
      status: "ACTIVE",
      orgId: "org_1",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      licenses: [{ id: "l_1" }],
      enrollments: [{ id: "e_1" }],
      complianceChecks: [{ id: "c_1", result: "CLEAN" }],
    };
    findUnique.mockResolvedValueOnce(mockData as never);
    const detail = await getProviderDetail("p_1", "org_1");
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "p_1" },
        include: expect.objectContaining({
          licenses: true,
          enrollments: true,
          complianceChecks: true,
        }),
      }),
    );
    expect(detail?.licenses).toHaveLength(1);
    expect(detail?.enrollments).toHaveLength(1);
  });

  it("returns null for wrong org", async () => {
    findUnique.mockClear();
    const mockData = {
      id: "p_1",
      npi: "1234567890",
      name: "Dr. Mock",
      specialty: "Cardiology",
      status: "ACTIVE",
      orgId: "org_2",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      licenses: [],
      enrollments: [],
      complianceChecks: [],
    };
    findUnique.mockResolvedValueOnce(mockData as never);
    const detail = await getProviderDetail("p_1", "org_1");
    expect(detail).toBeNull();
  });
});

describe("computeProviderStatus", () => {
  it("returns INACTIVE when license is EXPIRED", () => {
    const status = computeProviderStatus({
      licenses: [{ status: "EXPIRED" }] as never,
      enrollments: [],
      complianceChecks: [],
    });
    expect(status).toBe("INACTIVE");
  });

  it("returns INACTIVE when license is REVOKED", () => {
    const status = computeProviderStatus({
      licenses: [{ status: "REVOKED" }] as never,
      enrollments: [],
      complianceChecks: [],
    });
    expect(status).toBe("INACTIVE");
  });

  it("returns INACTIVE when enrollment is DENIED", () => {
    const status = computeProviderStatus({
      licenses: [],
      enrollments: [{ status: "DENIED" }] as never,
      complianceChecks: [],
    });
    expect(status).toBe("INACTIVE");
  });

  it("returns INACTIVE when compliance check is FLAG", () => {
    const status = computeProviderStatus({
      licenses: [],
      enrollments: [],
      complianceChecks: [{ result: "FLAG" }] as never,
    });
    expect(status).toBe("INACTIVE");
  });

  it("returns PENDING when license is PENDING", () => {
    const status = computeProviderStatus({
      licenses: [{ status: "PENDING" }] as never,
      enrollments: [],
      complianceChecks: [],
    });
    expect(status).toBe("PENDING");
  });

  it("returns PENDING when enrollment is SUBMITTED", () => {
    const status = computeProviderStatus({
      licenses: [],
      enrollments: [{ status: "SUBMITTED" }] as never,
      complianceChecks: [],
    });
    expect(status).toBe("PENDING");
  });

  it("returns PENDING when enrollment is PENDING", () => {
    const status = computeProviderStatus({
      licenses: [],
      enrollments: [{ status: "PENDING" }] as never,
      complianceChecks: [],
    });
    expect(status).toBe("PENDING");
  });

  it("returns ACTIVE when all clean", () => {
    const status = computeProviderStatus({
      licenses: [{ status: "ACTIVE" }] as never,
      enrollments: [{ status: "APPROVED" }] as never,
      complianceChecks: [{ result: "CLEAN" }] as never,
    });
    expect(status).toBe("ACTIVE");
  });
});

describe("recomputeAndUpdateProviderStatus", () => {
  it("fetches provider, computes status, and updates DB", async () => {
    update.mockClear();
    findUnique.mockResolvedValueOnce({
      id: "p_1",
      licenses: [{ status: "EXPIRED" }],
      enrollments: [],
      complianceChecks: [],
    } as never);
    const status = await recomputeAndUpdateProviderStatus("p_1");
    expect(status).toBe("INACTIVE");
    expect(update).toHaveBeenCalledWith({
      where: { id: "p_1" },
      data: { status: "INACTIVE" },
    });
  });

  it("returns INACTIVE for missing provider", async () => {
    update.mockClear();
    findUnique.mockResolvedValueOnce(null as never);
    const status = await recomputeAndUpdateProviderStatus("p_missing");
    expect(status).toBe("INACTIVE");
    expect(update).not.toHaveBeenCalled();
  });
});

describe("createProvider", () => {
  it("creates a provider with valid data", async () => {
    create.mockClear();
    const data = {
      npi: "1234567890",
      name: "Dr. Test",
      specialty: "Cardiology",
      status: "ACTIVE" as const,
      orgId: "org-test-123",
    };
    const provider = await createProvider(data);
    expect(create).toHaveBeenCalledWith({
      data: {
        npi: "1234567890",
        name: "Dr. Test",
        specialty: "Cardiology",
        status: "ACTIVE",
        orgId: "org-test-123",
      },
    });
    expect(provider).toEqual(expect.objectContaining({ id: "p_new", ...data }));
  });
});
