import { describe, it, expect } from "bun:test";
import { GET } from "./route";

describe("GET /api/auth/me", () => {
  it("returns 401 when no token in cookie", async () => {
    const request = new Request("http://localhost:3000/api/auth/me", {
      method: "GET",
    });

    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("returns 401 when token is invalid", async () => {
    const request = new Request("http://localhost:3000/api/auth/me", {
      method: "GET",
      headers: { cookie: "session=invalid-token" },
    });

    const response = await GET(request);
    expect(response.status).toBe(401);
  });
});
