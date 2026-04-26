# Testing

Two layers, two runners: **Bun's native `bun test`** for units and components, **Playwright** for end-to-end.

## Unit + component tests (Bun)

### Why Bun's runner

Jest-compatible API (`describe`, `it`, `expect`, `mock`, `spyOn`), runs under the same runtime that's used elsewhere in the toolchain, no transform config needed, no `ts-jest` / `@swc/jest` ESM headaches.

### Setup

`bunfig.toml` preloads the test setup file for every test:

```toml
[test]
preload = ["./test/setup.ts"]
```

`test/setup.ts` registers happy-dom globally and extends `expect` with jest-dom matchers:

```ts
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import * as matchers from "@testing-library/jest-dom/matchers";
import { afterEach, expect } from "bun:test";

GlobalRegistrator.register();
expect.extend(matchers as never);

afterEach(() => {
  document.body.innerHTML = "";
});
```

### What gets tested where

Tests are colocated with source as `*.test.ts` / `*.test.tsx`. Current coverage:

| Layer | What's tested | Example file |
|---|---|---|
| **Lib utils** | Pricing math, JWT sign/verify, period math, validators. | `lib/billing.test.ts`, `lib/auth.test.ts`, `lib/validators.test.ts` |
| **Domain modules** | Compliance, credentialing, enrollment, licenses, providers, workflows. | `lib/compliance.test.ts`, `lib/credentialing.test.ts`, `lib/enrollment.test.ts`, `lib/licenses.test.ts`, `lib/providers.test.ts`, `lib/workflows.test.ts` |
| **Stripe mock** | Invoice + meter event semantics. | `lib/stripe-mock.test.ts` |
| **Temporal mock** | Client surface, derive reducer, lifecycle scheduler. | `lib/temporal/client.test.ts`, `lib/temporal/derive.test.ts`, `lib/temporal/lifecycle.test.ts` |
| **Middleware** | JWT cookie pass-through / redirect. | `middleware.test.ts` |
| **Components** | RTL render + DOM assertions. | `components/dashboard/workflow-timeline.test.tsx`, `components/dashboard/billing/*.test.tsx`, `components/dashboard/enrollment/enrollment-row.test.tsx`, `components/dashboard/logout-button.test.tsx` |
| **Pages** | Smoke render of dashboard overview. | `app/dashboard/page.test.tsx` |

### Mocking

- **Prisma** — top of the test:
  ```ts
  mock.module("@/lib/db", () => ({
    prisma: { provider: { findMany: async () => [{ id: "p_1", name: "Dr. Who" }] } },
  }));
  const { GET } = await import("./route");
  ```
- **`fetch` / network** — `spyOn(globalThis, "fetch")`.
- **Time / `setInterval`** — `spyOn(globalThis, "setInterval")` and assert callback registration; see `lib/temporal/lifecycle.test.ts` for the pattern.
- **Fixtures** — `test/fixtures/index.ts` exports `makeProvider`, `makeWorkflow`, `makeInvoice`. Builders take overrides.

### Commands

```bash
bun test                    # all unit + component tests
bun run test:watch          # watch mode
bun run test:coverage       # coverage report
bun test middleware.test.ts # single file
```

## End-to-end tests (Playwright)

### Layout

```
e2e/
├── globalSetup.ts          # logs in via /api/auth/login, persists cookies to playwright/.auth/admin.json
├── pages/
│   ├── BasePage.ts
│   ├── LoginPage.ts
│   └── DashboardPage.ts    # page object pattern
├── fixtures/
│   └── index.ts            # extends Playwright's `test` with loginPage / dashboardPage fixtures
└── specs/
    └── auth.e2e.ts         # auth flow specs
```

`playwright.config.ts` highlights:

- `testDir: "./e2e"`, `testMatch: "**/*.e2e.ts"`.
- `globalSetup: "./e2e/globalSetup.ts"` — runs once before any spec.
- `use.storageState: "playwright/.auth/admin.json"` — every test starts authenticated; specs that need a fresh session call `test.use({ storageState: { cookies: [], origins: [] } })`.
- `webServer.command: "bun dev"` — Playwright will start the dev server if not already running. (When running tests against the Docker stack, set `reuseExistingServer: true` and start `docker compose up app` first.)
- Single project: `chromium` on `Desktop Chrome`.

### Required env

`globalSetup.ts` needs:

```env
E2E_USER_EMAIL=admin@assured.test
E2E_USER_PASSWORD=password123
```

These default values match what `prisma/seed.ts` creates.

### Commands

```bash
bun run test:e2e            # headless run
bun run test:e2e:ui         # Playwright UI mode
bunx playwright test e2e/specs/auth.e2e.ts   # single spec
bunx playwright codegen http://localhost:3000   # record new specs
```

### Running against the Docker stack

If `docker compose up app` is already running on `localhost:3000`, Playwright will reuse it (the config has `reuseExistingServer: !process.env.CI`). Otherwise it'll boot its own `bun dev` (which on macOS may hit the same Bun + Turbopack bug — see `docs/development.md`; if you hit it, run `node node_modules/next/dist/bin/next dev` manually before starting Playwright).

## CI considerations

- `forbidOnly: !!process.env.CI` — fails if a spec has `.only`.
- `retries: 2` on CI, `0` locally.
- `workers: 1` on CI to avoid DB contention; uncapped locally.
- `reporter: "github"` on CI for inline annotations.
- Bun unit tests are fast enough that sharding isn't needed.
