import { describe, it, expect } from "bun:test";
import { Socket } from "node:net";

describe("network-blocker (active in unit-test setup)", () => {
  it("rejects fetch() with a descriptive error", async () => {
    await expect(fetch("https://example.com")).rejects.toThrow(/blocked in unit tests/);
  });

  it("rejects fetch() and includes the target URL in the message", async () => {
    await expect(fetch("https://api.example.com/users")).rejects.toThrow(
      /https:\/\/api\.example\.com\/users/,
    );
  });

  it("throws synchronously from net.Socket#connect", () => {
    const socket = new Socket();
    expect(() => socket.connect({ host: "example.com", port: 443 })).toThrow(
      /blocked in unit tests/,
    );
  });

  it("error message hints at mock.module and tests/integration", async () => {
    await expect(fetch("https://x")).rejects.toThrow(/mock\.module/);
    await expect(fetch("https://x")).rejects.toThrow(/tests\/integration/);
  });
});
