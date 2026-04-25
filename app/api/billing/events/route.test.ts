import { describe, it, expect, mock, beforeEach } from "bun:test";
import { getSubscriptionItems, resetMockState } from "@/lib/stripe-mock";

const create = mock(async ({ data }: { data: Record<string, unknown> }) => ({ id: "ue_1", ...data }));

mock.module("@/lib/db", () => ({
  prisma: { usageEvent: { create } },
}));

const { POST } = await import("./route");

beforeEach(() => {
  resetMockState();
  create.mockClear();
});

describe("POST /api/billing/events", () => {
  it("returns 400 for missing or invalid type", async () => {
    const response = await POST(
      new Request("http://localhost/api/billing/events", {
        method: "POST",
        body: JSON.stringify({ type: "PIZZA" }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("creates a usage event with the right unitCents and emits a meter event", async () => {
    const response = await POST(
      new Request("http://localhost/api/billing/events", {
        method: "POST",
        body: JSON.stringify({ type: "CREDENTIALING", providerId: "p_1" }),
      }),
    );
    expect(response.status).toBe(201);

    expect(create).toHaveBeenCalledWith({
      data: { orgId: "org_1", type: "CREDENTIALING", providerId: "p_1", unitCents: 19_900 },
    });
    expect(getSubscriptionItems("org_1").credentialing).toBe(1);
  });

  it("uses the right unitCents per type", async () => {
    const cases: Array<[string, number]> = [
      ["LICENSE", 9_900],
      ["ENROLLMENT", 14_900],
      ["MONITORING", 2_900],
    ];
    for (const [type, expected] of cases) {
      create.mockClear();
      await POST(
        new Request("http://localhost/api/billing/events", {
          method: "POST",
          body: JSON.stringify({ type }),
        }),
      );
      const call = create.mock.calls[0][0] as { data: { unitCents: number } };
      expect(call.data.unitCents).toBe(expected);
    }
  });
});
