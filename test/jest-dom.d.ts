// Augments bun:test's expect with @testing-library/jest-dom matchers.
// Runtime registration happens in test/setup.ts; this just teaches TypeScript.
import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";

declare module "bun:test" {
  interface Matchers<T> extends TestingLibraryMatchers<typeof expect.stringContaining, T> {}
  interface AsymmetricMatchers extends TestingLibraryMatchers<typeof expect.stringContaining, void> {}
}
