# Security

Auth, rate limiting, CSRF, and security headers.

## Auth flow

- **Login**: `POST /api/auth/login` validates credentials, issues a JWT (1h expiry, HS256), sets an HTTP-only `session` cookie and a non-HTTP-only `csrf-token` cookie.
- **Middleware** (`middleware.ts`): intercepts all non-public routes. Returns `401 Unauthorized` JSON for API routes, `307` redirect to `/login` for page routes.
- **Logout**: `POST /api/auth/logout` clears both cookies.

## Route guards

All API routes use wrappers from `lib/route-guard.ts`:

- `withAuth(handler)` — validates JWT, injects `{ userId, orgId, role }` into the handler. Returns `401` if missing.
- `withSubscription(handler)` — wraps `withAuth`, checks active subscription via `lib/subscription-guard.ts`. Returns `403` if inactive.
- `withRole(handler, roles[])` — wraps `withAuth`, enforces `ADMIN` or `MEMBER`. Returns `403` if unauthorized.
- `withAuthParams`, `withSubscriptionParams`, `withRoleParams` — same guards for routes with dynamic segments (e.g., `[id]`).

CSRF validation runs automatically on all `POST`/`PUT`/`PATCH`/`DELETE` handlers. Pass `{ csrf: false }` to disable.

## Rate limiting

`lib/rate-limit.ts` provides a fixed-window rate limiter backed by Redis (Bun's native `RedisClient`, configured via `REDIS_URL`). The shared client lives in `lib/redis.ts`.

- **Identifier**: prefers `user.id` (when authenticated); falls back to the `x-forwarded-for` IP. Build via `buildIdentifier({ bucket, userId, ip })`.
- **Algorithm**: `INCR rl:{identifier}:{windowIndex}` + `PEXPIRE` on first hit. Counter naturally resets per window.
- **Fail closed**: if Redis is unreachable, the limiter throws `RateLimitUnavailableError` and callers respond with `503`. Rate limiting does not work without Redis.
- **Auth endpoints** (`/api/auth/login`): `15 req/min` per IP (bucket `login`).
- **Authenticated API routes**: opt-in per route via `withAuth(handler, { rateLimit: { bucket, max?, windowMs? } })`. Defaults: `100 req/min`.

## Security headers

Middleware sets the following on every response:

- `Content-Security-Policy` (allows same-origin framing for PDF previews and Vercel Speed Insights scripts)
- `Strict-Transport-Security` (max-age 63072000)
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`
- `X-Request-Id` (for tracing)

## Dashboard pages

Middleware already enforces auth. Pages use `getSessionUser()` to fetch `orgId` without redundant `redirect("/login")` checks.
