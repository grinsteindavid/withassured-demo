# Development

Daily dev loop, the Bun/Node runtime split, debugging tips, and the native-host alternative.

## The runtime split (read this first)

Inside the container two runtimes coexist:

- **Bun** drives `bun install`, `bunx prisma generate|migrate deploy`, `bun run db:seed`, and `bun test`.
- **Node 22** drives **only** `next dev` (Next.js 16 + Turbopack).

This split exists because of [vercel/next.js#86866](https://github.com/vercel/next.js/issues/86866): Turbopack emits hashed external module names like `@prisma/client-2c3a283f134fdcb6`. Node's resolver tolerates the suffix; Bun's does not. The Next.js maintainer's response is "report this to bun" — there's no Next.js-side fix.

The plumbing is two lines:

```dockerfile
# Dockerfile:6
COPY --from=node:22-slim /usr/local/bin/node /usr/local/bin/node
```

```yaml
# docker-compose.yml:48
exec node node_modules/next/dist/bin/next dev
```

`bun run dev` (in `package.json`) is preserved for native-host use, but the container bypasses it and invokes Next directly under Node.

## Daily loop with Docker Compose

```bash
docker compose up app          # foreground — see logs as you edit
docker compose up -d app       # background
docker logs -f assured-test-app-1
docker compose restart app     # if a config or env var changed
docker exec -it assured-test-app-1 sh   # shell inside the container
```

Source is bind-mounted (`.:/app`) so file edits trigger Turbopack HMR immediately. `node_modules` and `.next` are anonymous volumes — they survive container restarts but are recreated on `docker compose down && up`.

### File watching on macOS

Bind mounts on macOS don't fire inotify events. The compose file forces polling so HMR works:

```yaml
# docker-compose.yml:30-34
WATCHPACK_POLLING: "true"
CHOKIDAR_USEPOLLING: "true"
CHOKIDAR_INTERVAL: "500"
```

If HMR still misses changes, restart `app`.

## Debugging

### Turbopack chunks

The hashed-external bug is visible by inspecting chunks directly:

```bash
docker exec assured-test-app-1 sh -c \
  "grep -o '@prisma/client-[a-f0-9]*' /app/.next/dev/server/chunks/ssr/*.js | head -3"
```

You'll still see lines like `@prisma/client-2c3a283f134fdcb6` — that's expected, Node's resolver handles the suffix.

### Workflow logs

Mock workflow events log with prefixes:

- `[workflow] cred_01H… seeded (credentialing)`
- `[workflow] cred_01H… advance SANCTIONS_CHECK → COMMITTEE_REVIEW`
- `[compliance] comp_<id> reconciled to COMPLETED (DB: CLEAN)`
- `[compliance] Scheduler started (60s interval)`

These come from `lib/temporal/client.ts` and `lib/temporal/lifecycle.ts`.

### Database

```bash
docker compose up studio       # Prisma Studio at http://localhost:5555
# or psql:
docker exec -it assured-test-db-1 psql -U postgres -d assured
```

### Reset everything

```bash
docker compose down -v         # wipes postgres
docker compose up app          # rebuild + reseed from scratch
```

## Native-host alternative

If you'd rather run `next dev` on the Mac host (Next.js docs actively recommend this for dev performance), you only need the database in Docker:

```bash
docker compose up db           # postgres only
bun install
bunx prisma generate
bunx prisma migrate deploy
bun run db:seed
node node_modules/next/dist/bin/next dev   # use Node, not bun, for the same #86866 reason
```

Set `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/assured` in `.env` (the host-side connection string).

## Common scripts

All defined in `package.json`:

| Script | Use |
|---|---|
| `bun run dev` | Native-host dev (use `node node_modules/next/dist/bin/next dev` instead if you have bun installed). |
| `bun run build` | Production build. |
| `bun run start` | Production server. |
| `bun run lint` | ESLint. |
| `bun run db:migrate` | `prisma migrate dev` (interactive). |
| `bun run db:seed` | Re-seed (no-op if already seeded). |
| `bun run db:studio` | Prisma Studio (5555). |
| `bun test` | Unit + component tests. |
| `bun run test:watch` | Watch mode. |
| `bun run test:coverage` | Coverage report. |
| `bun run test:e2e` | Playwright e2e. |
| `bun run test:e2e:ui` | Playwright UI mode. |

See `docs/testing.md` for what each test layer covers.
