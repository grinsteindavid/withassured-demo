# Integration tests

Tests in this directory run against **real infrastructure** (database, network, etc.). They are excluded from the default `bun test` (see `pathIgnorePatterns` in `bunfig.toml`) and require an opt-in.

## Running

```sh
bun run test:integration
```

Which expands to:

```sh
BUN_INTEGRATION_TESTS=1 bun test --path-ignore-patterns='' tests/integration
```

- `BUN_INTEGRATION_TESTS=1` tells `test-utils/setup.ts` to skip `blockNetwork()`.
- `--path-ignore-patterns=''` overrides the `tests/integration/**` exclusion declared in `bunfig.toml` (the bunfig list is fully replaced, not merged, when the flag is present).

A live PostgreSQL instance reachable via `DATABASE_URL` is required.

### Why not a Bun "named config" (`--config=integration`)?

Bun's docs describe a Jest-style conditional config via `[test.<name>]` plus `bun test --config=<name>`. It's documented but **broken in Bun 1.3.x** ([oven-sh/bun#25647](https://github.com/oven-sh/bun/issues/25647)) — `--config=<name>` is interpreted as a config-file path instead of a profile selector. Once that's fixed upstream we can drop the env-var/CLI workaround in favor of a `[test.integration]` stanza.

## Conventions

- File suffix: `*.integration.test.ts` (any `.test.ts` under this directory is also fine, but the suffix makes it obvious).
- Always assume the DB may have residual data from prior runs — use `beforeEach`/`afterAll` cleanup.
- Do **not** import these files from unit tests.

## Why a separate directory?

Unit tests (everywhere else in the repo) are colocated with source files and the runner blocks all outbound network calls. Integration tests need real connections, so they live here and run via a different npm script that flips the blocker off.

## Caveat: Prisma + the network blocker

The blocker patches JS primitives (`net.Socket`, `fetch`, `Bun.connect`). Prisma's query engine is a native Rust binding that opens its own TCP socket below the JS layer, so the blocker can't stop it. For unit tests that touch `@/lib/db`, mock the module:

```ts
mock.module("@/lib/db", () => ({
  prisma: { paymentMethod: { findFirst: mock(...) } },
}));
```

See `lib/providers.test.ts` for a canonical example.
