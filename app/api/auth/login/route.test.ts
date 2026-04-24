import { describe, it, expect } from "bun:test";
import { POST } from "./route";

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
    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "nonexistent@test.com", password: "password" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 401 for wrong password", async () => {
    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "test@test.com", password: "wrongpass" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});
