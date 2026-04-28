import "server-only";
import { headers } from "next/headers";
import { rateLimit, buildIdentifier, RateLimitUnavailableError } from "@/lib/rate-limit";
import { getSessionUser } from "@/lib/auth";

const DEFAULT_PAGE_RATE_LIMIT_MAX = 15;
const DEFAULT_PAGE_RATE_LIMIT_WINDOW_MS = 60_000;

export class RateLimitExceededError extends Error {
  constructor() {
    super("Rate limit exceeded");
    this.name = "RateLimitExceededError";
  }
}

export interface PageRateLimitOptions {
  bucket: string;
  max?: number;
  windowMs?: number;
}

/**
 * Rate-limit a server-rendered page or layout. Call from a Server Component
 * (e.g. `app/dashboard/layout.tsx`) so every render of the subtree is
 * counted. Keys on `user.id` when authenticated, otherwise falls back to the
 * `x-forwarded-for` IP.
 *
 * Throws `RateLimitExceededError` when the user/IP exceeds the limit, and
 * `RateLimitUnavailableError` when Redis is down — both will surface as
 * Next.js error boundaries / 500 pages.
 */
export async function enforcePageRateLimit(options: PageRateLimitOptions): Promise<void> {
  const [user, hdrs] = await Promise.all([getSessionUser(), headers()]);
  const ip = hdrs.get("x-forwarded-for") ?? "unknown";

  const identifier = buildIdentifier({
    bucket: options.bucket,
    userId: user?.userId,
    ip,
  });

  const result = await rateLimit(
    identifier,
    options.max ?? DEFAULT_PAGE_RATE_LIMIT_MAX,
    options.windowMs ?? DEFAULT_PAGE_RATE_LIMIT_WINDOW_MS,
  );

  if (!result.allowed) throw new RateLimitExceededError();
}

export { RateLimitUnavailableError };
