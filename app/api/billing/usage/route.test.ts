import { describe, it, expect, mock } from "bun:test";

const getCurrentUsage = mock(async (_period: "current" | "previous") => ({
  periodStart: new Date("2026-04-01"),
  periodEnd: new Date("2026-04-30"),
  platformFeeCents: 150_000,
  lines: [],
  subtotalCents: 0,
  totalCents: 150_000,
}));

mock.module("@/lib/billing", () => ({ getCurrentUsage }));

const { GET } = await import("./route");

describe("GET /api/billing/usage", () => {
  it("delegates to getCurrentUsage with the parsed period", async () => {
    getCurrentUsage.mockClear();
    const response = await GET(new Request("http://localhost/api/billing/usage?period=previous"));
    expect(response.status).toBe(200);
    expect(getCurrentUsage).toHaveBeenCalledWith("previous");
  });

  it("defaults to period=current when omitted", async () => {
    getCurrentUsage.mockClear();
    const response = await GET(new Request("http://localhost/api/billing/usage"));
    expect(response.status).toBe(200);
    expect(getCurrentUsage).toHaveBeenCalledWith("current");
  });

  it("returns 400 for invalid period", async () => {
    const response = await GET(new Request("http://localhost/api/billing/usage?period=bogus"));
    expect(response.status).toBe(400);
  });
});
