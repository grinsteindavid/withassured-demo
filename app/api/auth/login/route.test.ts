import { describe, it, expect, mock } from "bun:test";

const findUnique = mock(async (_args: { where: { email: string } }) => null as unknown);

mock.module("@/lib/db", () => ({
  prisma: { user: { findUnique } },
}));

mock.module("@/lib/auth", () => ({
  verifyPassword: async (input: string, expected: string) => input === expected,
  signJWT: async () => "fake-jwt",
  setSessionCookie: async () => {},
}));

const { POST } = await import("./route");

describe("POST /api/auth/login", () => {
  it("returns 400 for invalid input", async () => {
    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "invalid" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 401 for non-existent email", async () => {
    findUnique.mockResolvedValueOnce(null);

    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "nobody@test.com", password: "password" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 401 for wrong password", async () => {
    findUnique.mockResolvedValueOnce({
      id: "u_1",
      email: "test@test.com",
      passwordHash: "correctpass",
      role: "ADMIN",
      orgId: "org_1",
    });

    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "test@test.com", password: "wrongpass" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 200 and the user on valid credentials", async () => {
    findUnique.mockResolvedValueOnce({
      id: "u_1",
      email: "test@test.com",
      passwordHash: "correctpass",
      role: "ADMIN",
      orgId: "org_1",
    });

    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "test@test.com", password: "correctpass" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.user).toEqual({ id: "u_1", email: "test@test.com", role: "ADMIN" });
  });
});
