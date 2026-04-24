import { describe, it, expect, mock } from "bun:test";

mock.module("@/lib/auth", () => ({
  clearSessionCookie: async () => {},
}));

const { POST } = await import("./route");

describe("POST /api/auth/logout", () => {
  it("returns success", async () => {
    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
  });
});
