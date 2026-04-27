// Test runner preload (registered via bunfig.toml).
//
// Unit tests get the network blocker installed automatically. Integration
// tests opt out by setting BUN_INTEGRATION_TESTS=1 (the `test:integration`
// script does this). The blocker can't be skipped via `--config=<name>`
// because Bun's named-config feature is broken in 1.3.x (issue #25647).

import { afterEach, expect, mock } from "bun:test";

// Replace the npm `server-only` package (whose default export throws in
// non-RSC runtimes) with a no-op so tests can import server modules that
// declare `import "server-only"`. Next.js handles the directive natively at
// build time; this mock only affects `bun test`.
mock.module("server-only", () => ({}));

import { GlobalRegistrator } from "@happy-dom/global-registrator";
import * as matchers from "@testing-library/jest-dom/matchers";
import { blockNetwork } from "./network-blocker";

GlobalRegistrator.register();
expect.extend(matchers as never);

if (process.env.BUN_INTEGRATION_TESTS !== "1") {
  blockNetwork();
}

afterEach(() => {
  document.body.innerHTML = "";
});
