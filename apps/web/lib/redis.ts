import "server-only";
import Redis from "ioredis";

// Singleton Redis client used by the rate limiter and any future
// Redis-backed feature. Configured from `REDIS_URL`.
//
// We use `ioredis` because the Next.js server runs under Node
// (`docker-compose.yml` -> `node node_modules/next/dist/bin/next dev`),
// where `import { redis } from "bun"` is unavailable.
//
// Application code should never import `ioredis` directly — going through
// this module gives tests a single seam to mock
// (`mock.module("@/lib/redis", ...)`).

const url = process.env.REDIS_URL ?? "redis://localhost:6379";

declare global {
  var __assuredRedis: Redis | undefined;
}

// Tuned for serverless (Vercel lambdas) where the TCP socket may be
// closed between warm invocations and the first command races the TLS+AUTH
// handshake on cold starts. The defaults below absorb both without flipping
// the limiter to fail-open.
//
// - eager connect (no `lazyConnect`) so the handshake overlaps module init
//   instead of the first `incr` call.
// - `maxRetriesPerRequest: 3` tolerates a single dropped packet on cold
//   start without surfacing as a 5xx.
// - `connectTimeout: 10_000` caps a stuck handshake so a lambda can't hang.
// - `enableReadyCheck` defers commands until the client emits "ready".
// - `enableOfflineQueue` (default true) queues commands during the brief
//   window between connect() and ready.
// - `retryStrategy` reconnects with mild backoff (50ms..500ms).
// - `reconnectOnError` forces a fresh socket when the edge silently closes
//   the previous one (`Stream isn't writeable`) or the replica flips read-only.
export const redis: Redis =
  globalThis.__assuredRedis ??
  new Redis(url, {
    maxRetriesPerRequest: 3,
    connectTimeout: 10_000,
    enableReadyCheck: true,
    retryStrategy: (times) => Math.min(times * 50, 500),
    reconnectOnError: (err) => {
      const msg = err.message;
      return msg.includes("READONLY") || msg.includes("Stream isn't writeable");
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__assuredRedis = redis;
}
