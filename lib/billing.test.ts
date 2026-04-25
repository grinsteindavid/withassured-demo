import { describe, it, expect } from "bun:test";
import { rollupUsage } from "./billing";

describe("rollupUsage", () => {
  it("sums events by type and applies platform fee", () => {
    const result = rollupUsage({
      platformFeeCents: 150_000,
      events: [
        { type: "CREDENTIALING", unitCents: 19_900 },
        { type: "CREDENTIALING", unitCents: 19_900 },
        { type: "LICENSE", unitCents: 9_900 },
      ],
    });
    expect(result.subtotalCents).toBe(49_700);
    expect(result.totalCents).toBe(199_700);
  });

  it("returns empty lines when no events", () => {
    const result = rollupUsage({
      platformFeeCents: 150_000,
      events: [],
    });
    expect(result.lines).toEqual([]);
    expect(result.subtotalCents).toBe(0);
    expect(result.totalCents).toBe(150_000);
  });
});
