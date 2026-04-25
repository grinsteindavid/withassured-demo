import { describe, it, expect, mock } from "bun:test";

const findMany = mock(async () => [
  { id: "p_1", npi: "1234567890", name: "Dr. Mock", specialty: "Cardiology", status: "ACTIVE", orgId: "org_1" },
]);
const create = mock(async ({ data }: { data: Record<string, unknown> }) => ({ id: "p_new", ...data }));

mock.module("@/lib/db", () => ({
  prisma: { provider: { findMany, create } },
}));

const { getProviders, createProvider } = await import("./providers");

describe("getProviders", () => {
  it("returns all providers", async () => {
    findMany.mockClear();
    const providers = await getProviders();
    expect(findMany).toHaveBeenCalled();
    expect(Array.isArray(providers)).toBe(true);
    expect(providers[0].id).toBe("p_1");
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
