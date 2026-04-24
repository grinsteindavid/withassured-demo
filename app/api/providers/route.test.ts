import { describe, it, expect } from "bun:test";
import { GET, POST } from "./route";

describe("/api/providers", () => {
  it("GET returns providers", async () => {
    const response = await GET(new Request("http://localhost/api/providers"));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("POST creates provider with valid input", async () => {
    const uniqueNpi = `${Date.now().toString().slice(-10)}`;
    const body = JSON.stringify({
      npi: uniqueNpi,
      name: "Dr. Test",
      specialty: "Cardiology",
      status: "ACTIVE",
      orgId: "org-test-123",
    });
    const response = await POST(
      new Request("http://localhost/api/providers", {
        method: "POST",
        body,
      }),
    );
    expect(response.status).toBe(201);
  });

  it("POST rejects invalid input", async () => {
    const body = JSON.stringify({ npi: "123", name: "Dr. Test" });
    const response = await POST(
      new Request("http://localhost/api/providers", {
        method: "POST",
        body,
      }),
    );
    expect(response.status).toBe(400);
  });
});
