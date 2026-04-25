import { describe, it, expect, mock } from "bun:test";

const findMany = mock(async () => [
  { id: "p_1", npi: "1234567890", name: "Dr. Mock", specialty: "Cardiology", status: "ACTIVE", orgId: "org_1" },
]);
const create = mock(async ({ data }: { data: Record<string, unknown> }) => ({ id: "p_new", ...data }));

mock.module("@/lib/db", () => ({
  prisma: { provider: { findMany, create } },
}));

const { GET, POST } = await import("./route");

describe("/api/providers", () => {
  it("GET returns providers", async () => {
    const response = await GET(new Request("http://localhost/api/providers"));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].id).toBe("p_1");
    expect(findMany).toHaveBeenCalled();
  });

  it("POST creates provider with valid input", async () => {
    const body = JSON.stringify({
      npi: "1234567890",
      name: "Dr. Test",
      specialty: "Cardiology",
      status: "ACTIVE",
      orgId: "org-test-123",
    });
    const response = await POST(
      new Request("http://localhost/api/providers", { method: "POST", body }),
    );
    expect(response.status).toBe(201);
    expect(create).toHaveBeenCalledWith({
      data: {
        npi: "1234567890",
        name: "Dr. Test",
        specialty: "Cardiology",
        status: "ACTIVE",
        orgId: "org-test-123",
      },
    });
  });

  it("POST rejects invalid input", async () => {
    const body = JSON.stringify({ npi: "123", name: "Dr. Test" });
    const response = await POST(
      new Request("http://localhost/api/providers", { method: "POST", body }),
    );
    expect(response.status).toBe(400);
  });
});
