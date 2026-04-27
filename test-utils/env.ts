// Test runner environment shim.
//
// Loaded as the FIRST bunfig preload (before test-utils/setup.ts) so it runs
// before any other module is evaluated. Vercel sets NODE_ENV=production for
// the entire build pipeline, including the `bun test` step. Several modules
// switch behavior on NODE_ENV (notably lib/stripe-mock.ts's globalThis
// singleton, lib/db.ts's log level, and React's dev-mode rendering used by
// @testing-library/react). Forcing development mode here keeps unit tests
// behaving identically locally and on CI.
//
// This file MUST have no imports — it must be effective the moment the
// runtime evaluates it, before any user module is loaded.

// Bracket-notation assignment sidesteps the readonly narrowing from
// @types/node + Next.js's type augmentation of process.env.NODE_ENV.
const env = process.env as Record<string, string | undefined>;
if (env.NODE_ENV === "production" || !env.NODE_ENV) {
  env.NODE_ENV = "development";
}
