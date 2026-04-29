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
| **Workflows** | Vercel Workflow SDK steps, engine, and read paths. | `lib/workflows.test.ts`, `lib/credentialing.test.ts`, `lib/enrollment.test.ts` |
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
- **Time / `setInterval`** — `spyOn(globalThis, "setInterval")` and assert callback registration.
- **Fixtures** — `test/fixtures/index.ts` exports `makeProvider`, `makeWorkflow`, `makeInvoice`. Builders take overrides.

### Cross-file `mock.module` pitfalls (Bun 1.3.x)

Bun's `mock.module(specifier, factory)` registers process-wide. The registration persists across test files and **whichever file's factory is registered first wins the module cache** for any later static import resolving to the same specifier. This causes three failure modes that are easy to hit and painful to debug:

1. **Partial mock corrupts another file's static imports.** If `a.test.ts` does `mock.module("@/lib/foo", () => ({ bar: mockBar }))` and `b.test.ts` does `import { bar, baz } from "@/lib/foo"`, then `b.test.ts` fails at module evaluation with `SyntaxError: Export named 'baz' not found`. We hit this with `@/lib/stripe-mock` — see the inline comment in `lib/billing.test.ts`.
2. **Mocked function identities leak into the file that tests the real module.** `lib/stripe-mock.test.ts` imports the real module statically; if `lib/billing.test.ts` had registered a partial mock first, the destructured bindings in `stripe-mock.test.ts` would be the mocked stubs, not the real implementations. `afterAll` cleanup does **not** save you — the next file's static imports are evaluated before the previous file's `afterAll` runs.
3. **Whole-component stubs leak into the file that tests that component.** A consumer test mocks an entire component module to `() => null` (e.g. `app/dashboard/page.test.tsx` stubs `@/components/dashboard/analytics/analytics-section`). When `components/dashboard/analytics/analytics-section.test.tsx` later does `await import("./analytics-section")`, Bun returns the registered stub — the real component never runs and assertions on its inner calls fail silently. Unlike pitfall #2, **`afterAll` cleanup *does* fix this** because the affected test uses a dynamic `await import(...)`, so cleanup of the offending file runs before the next file's import is evaluated. See `app/dashboard/page.test.tsx` for the pattern:

   ```ts
   import * as RealAnalyticsSection from "@/components/dashboard/analytics/analytics-section";
   const realAnalyticsSection = { ...RealAnalyticsSection };

   mock.module("@/components/dashboard/analytics/analytics-section", () => ({
     AnalyticsSection: () => null,
   }));

   afterAll(() => {
     mock.module("@/components/dashboard/analytics/analytics-section", () => realAnalyticsSection);
   });
   ```

   **Rule:** any test file that `mock.module`s a *component or module that has its own `*.test.tsx`* must capture the real exports before mocking and restore them in `afterAll`.

**Rules of thumb:**

- **Prefer `spyOn(realModule, "fn")`** over `mock.module` whenever you only need to assert call arguments. It doesn't pollute the cache. Example: `lib/payments.test.ts` spies on `stripeMock.deletePaymentMethod`.
- **Use the real module directly** when the test-only override would just re-implement the real behavior. Call the real `resetMockState()` in `beforeEach` for isolation. Example: `lib/billing.test.ts` imports `createInvoice`, `payInvoice`, etc. straight from `@/lib/stripe-mock`.
- **If you must `mock.module` an alias**, spread the real module first so every export stays defined:
  ```ts
  import * as workflowApi from "workflow/api";
  mock.module("workflow/api", () => ({
    ...workflowApi,
    start: startMock,
  }));
  ```
  See `lib/providers.test.ts` for a working example. Never register a `mock.module` factory that returns a partial subset of a module also imported elsewhere in the suite.
- **Files that test the real module** (e.g. `lib/stripe-mock.test.ts`) should not be mocked by anyone else. Audit other tests' `mock.module` calls before adding new ones.

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
apps/e2e/
├── globalSetup.ts          # logs in via /api/auth/login, persists cookies to playwright/.auth/admin.json
├── pages/
│   ├── BasePage.ts
│   ├── LoginPage.ts
│   └── DashboardPage.ts    # page object pattern
├── fixtures/
│   └── index.ts            # extends Playwright's `test` with loginPage / dashboardPage fixtures
├── specs/
│   └── auth.e2e.ts         # auth flow specs
├── playwright.config.ts    # Playwright configuration
└── package.json            # e2e workspace manifest
```

`playwright.config.ts` highlights:

- `testDir: "./specs"`, `testMatch: "**/*.e2e.ts"`.
- `globalSetup: "./globalSetup.ts"` — runs once before any spec.
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
bun run test:e2e                              # headless run (from root via turbo)
bun --cwd apps/e2e run test:e2e:ui            # Playwright UI mode
bunx --cwd apps/e2e playwright test specs/auth.e2e.ts   # single spec
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
