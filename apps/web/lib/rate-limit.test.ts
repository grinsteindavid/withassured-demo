import { describe, it, expect, mock, beforeEach } from "bun:test";

const incr: ReturnType<typeof mock> = mock((..._args: unknown[]) => Promise.resolve(1)); // eslint-disable-line @typescript-eslint/no-unused-vars
const pexpire: ReturnType<typeof mock> = mock((..._args: unknown[]) => Promise.resolve(1)); // eslint-disable-line @typescript-eslint/no-unused-vars

mock.module("@/lib/redis", () => ({
  redis: { incr, pexpire },
}));

const { rateLimit, buildIdentifier, RateLimitUnavailableError } = await import("./rate-limit");

beforeEach(() => {
  incr.mockReset();
  pexpire.mockReset();
  incr.mockImplementation(async () => 1);
  pexpire.mockImplementation(async () => 1);
});

describe("buildIdentifier", () => {
  it("prefers userId over ip", () => {
    expect(buildIdentifier({ bucket: "api", userId: "u1", ip: "1.2.3.4" })).toBe("api:user:u1");
  });

  it("falls back to ip when userId is missing", () => {
    expect(buildIdentifier({ bucket: "api", ip: "1.2.3.4" })).toBe("api:ip:1.2.3.4");
  });

  it("falls back to 'unknown' when neither is provided", () => {
    expect(buildIdentifier({ bucket: "api" })).toBe("api:ip:unknown");
  });
});

describe("rateLimit", () => {
  it("allows requests under the limit and increments the counter", async () => {
    incr.mockImplementationOnce(async () => 1);
    const result = await rateLimit("test:user:u1", 5, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.count).toBe(1);
    expect(incr).toHaveBeenCalledTimes(1);
    expect(pexpire).toHaveBeenCalledTimes(1);
  });

  it("only sets PEXPIRE on the first hit of the window", async () => {
    incr.mockImplementationOnce(async () => 3);
    await rateLimit("test:user:u1", 5, 60_000);
    expect(pexpire).not.toHaveBeenCalled();
  });

  it("blocks when count exceeds the limit", async () => {
    incr.mockImplementationOnce(async () => 6);
    const result = await rateLimit("test:user:u1", 5, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("throws RateLimitUnavailableError when redis fails", async () => {
    incr.mockImplementationOnce(async () => {
      throw new Error("ECONNREFUSED");
    });
    await expect(rateLimit("test:user:u1", 5, 60_000)).rejects.toBeInstanceOf(
      RateLimitUnavailableError,
    );
  });

  it("uses different keys per window so counters reset", async () => {
    await rateLimit("test:user:u1", 5, 1);
    await new Promise((r) => setTimeout(r, 5));
    await rateLimit("test:user:u1", 5, 1);
    expect(incr).toHaveBeenCalledTimes(2);
    const firstKey = String(incr.mock.calls[0][0]);
    const secondKey = String(incr.mock.calls[1][0]);
    expect(firstKey).not.toBe(secondKey);
  });
});
