import "server-only";
import { redis } from "@/lib/redis";

export class RateLimitUnavailableError extends Error {
  constructor(message = "Rate limiter unavailable", options?: { cause?: unknown }) {
    super(message, options);
    this.name = "RateLimitUnavailableError";
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;
  count: number;
}

export interface IdentifierInput {
  bucket: string;
  userId?: string | null;
  ip?: string | null;
}

/**
 * Build a rate-limit identifier. Prefers `userId` when present, otherwise
 * falls back to `ip`. Always namespaced under `bucket` so different routes
 * don't share counters.
 */
export function buildIdentifier({ bucket, userId, ip }: IdentifierInput): string {
  if (userId) return `${bucket}:user:${userId}`;
  return `${bucket}:ip:${ip ?? "unknown"}`;
}

/**
 * Fixed-window rate limiter backed by Redis.
 *
 * Increments a counter at `rl:{identifier}:{windowIndex}` and sets a TTL on
 * the first hit of the window. Fails closed: any Redis error throws
 * `RateLimitUnavailableError` so callers can return 503.
 */
export async function rateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowIndex = Math.floor(now / windowMs);
  const key = `rl:${identifier}:${windowIndex}`;

  let count: number;
  try {
    count = await redis.incr(key);
    if (count === 1) {
      await redis.pexpire(key, windowMs);
    }
  } catch (err) {
    throw new RateLimitUnavailableError("Rate limiter unavailable", { cause: err });
  }

  const allowed = count <= maxRequests;
  const remaining = Math.max(0, maxRequests - count);
  const reset = (windowIndex + 1) * windowMs;

  return { allowed, remaining, reset, count };
}
