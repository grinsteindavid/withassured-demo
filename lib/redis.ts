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

// `lazyConnect: true` — defer the TCP connect until the first command, so
//   importing this module never opens a socket.
// `maxRetriesPerRequest: 1` — fail fast so the rate limiter's fail-closed
//   path returns 503 promptly when Redis is down.
// `enableOfflineQueue: false` — when disconnected, commands reject
//   immediately instead of being queued.
export const redis: Redis =
  globalThis.__assuredRedis ??
  new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__assuredRedis = redis;
}
