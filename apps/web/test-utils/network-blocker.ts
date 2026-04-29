/**
 * Blocks outbound network access in unit tests.
 *
 * Patches the JavaScript-level network primitives so any test that accidentally
 * tries to reach the network fails loudly with a descriptive error.
 *
 * Caveat: native bindings (e.g. Prisma's Rust query engine) bypass JS sockets
 * entirely, so this blocker can't stop them. For database tests, mock the
 * `@/lib/db` module via `mock.module("@/lib/db", ...)` (see lib/providers.test.ts)
 * or move the test to `tests/integration/` and run with `bun run test:integration`.
 */

import { Socket } from "node:net";

const INSTALLED = Symbol.for("test-utils.network-blocker.installed");

type Globals = typeof globalThis & { [INSTALLED]?: boolean };

const HINT =
  'Mock the dependency (e.g. mock.module("@/lib/db", ...) — see lib/providers.test.ts) ' +
  "or move the test to tests/integration/ and run `bun run test:integration`.";

function blockedError(kind: string, target: string): Error {
  return new Error(
    `Network access is blocked in unit tests: ${kind} → ${target}. ${HINT}`,
  );
}

function describeSocketTarget(args: unknown[]): string {
  const first = args[0];
  if (typeof first === "object" && first !== null) {
    const opts = first as { host?: string; path?: string; port?: number };
    return `${opts.host ?? opts.path ?? "<unknown>"}:${opts.port ?? "<n/a>"}`;
  }
  if (typeof first === "number") {
    const port = first;
    const host = typeof args[1] === "string" ? args[1] : "localhost";
    return `${host}:${port}`;
  }
  if (typeof first === "string") return first;
  return "<unknown>";
}

function describeFetchTarget(input: unknown): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  if (typeof input === "object" && input !== null && "url" in input) {
    return String((input as { url: unknown }).url);
  }
  return "<unknown>";
}

function safelyPatch(label: string, patch: () => void): void {
  try {
    patch();
  } catch (err) {
    // Some primitives are read-only on certain runtimes (e.g. Bun's node:dns).
    // Skip silently — the remaining patches still provide coverage.
    if (process.env.DEBUG_NETWORK_BLOCKER) {
      console.warn(`[network-blocker] could not patch ${label}:`, err);
    }
  }
}

function patchSocket(): void {
  Socket.prototype.connect = function (...args: unknown[]) {
    throw blockedError("net.Socket.connect", describeSocketTarget(args));
  } as typeof Socket.prototype.connect;
}

function patchFetch(g: Globals): void {
  // Return a rejected Promise (matches real fetch's contract) instead of throwing
  // synchronously, so `await fetch(...)` and `fetch(...).catch(...)` both work.
  const blocked = (input: unknown) =>
    Promise.reject(blockedError("fetch", describeFetchTarget(input)));
  g.fetch = blocked as unknown as typeof globalThis.fetch;
}

function patchBunConnect(g: Globals): void {
  const bun = (g as unknown as { Bun?: { connect?: unknown } }).Bun;
  if (bun && typeof bun.connect === "function") {
    bun.connect = (...args: unknown[]) => {
      throw blockedError("Bun.connect", describeSocketTarget(args));
    };
  }
}

/**
 * Install network blockers on JS-level primitives. Idempotent.
 *
 * Note: `node:dns` is intentionally NOT patched because Bun exposes its
 * properties as read-only. Blocking `fetch` + `net.Socket.connect` already
 * covers the realistic surface area for accidental network use in unit tests.
 */
export function blockNetwork(): void {
  const g = globalThis as Globals;
  if (g[INSTALLED]) return;
  g[INSTALLED] = true;

  safelyPatch("net.Socket.connect", patchSocket);
  safelyPatch("fetch", () => patchFetch(g));
  safelyPatch("Bun.connect", () => patchBunConnect(g));
}
