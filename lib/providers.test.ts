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
const create = mock(async ({ data }: { data: Record<string, unknown> }) => ({ id: "p_new", ...data }));

mock.module("@/lib/db", () => ({
  prisma: { provider: { findMany, findUnique, create } },
}));

const { getProviders, listProviders, getProviderDetail, createProvider } = await import("./providers");

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

  it("applies status filter", async () => {
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
    await listProviders("org_1", { status: "ACTIVE" });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orgId: "org_1", status: "ACTIVE" },
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
    expect(provider).toEqual({ id: "p_new", ...data });
  });
});
