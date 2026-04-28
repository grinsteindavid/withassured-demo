import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";

import { apiFetch } from "./api-client";

function setCookieString(value: string) {
  Object.defineProperty(document, "cookie", {
    configurable: true,
    get: () => value,
    set: () => {},
  });
}

describe("apiFetch", () => {
  const originalFetch = globalThis.fetch;
  let fetchMock: ReturnType<typeof mock>;

  beforeEach(() => {
    fetchMock = mock(() => Promise.resolve(new Response(null, { status: 200 })));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    setCookieString("");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    // Remove the instance-level override so the next test file sees
    // happy-dom's native `document.cookie` getter via the prototype.
    delete (document as unknown as { cookie?: string }).cookie;
  });

  it("passes GET through unchanged", async () => {
    await apiFetch("/api/foo");
    expect(fetchMock).toHaveBeenCalledWith("/api/foo", {});
  });

  it("passes HEAD through unchanged", async () => {
    await apiFetch("/api/foo", { method: "HEAD" });
    expect(fetchMock).toHaveBeenCalledWith("/api/foo", { method: "HEAD" });
  });

  it("does not attach CSRF header when no cookie is present (pass-through)", async () => {
    await apiFetch("/api/foo", { method: "POST", body: "{}" });
    expect(fetchMock).toHaveBeenCalledWith("/api/foo", { method: "POST", body: "{}" });
  });

  it("attaches x-csrf-token header from the cookie on POST", async () => {
    setCookieString("csrf-token=abc-123");
    await apiFetch("/api/foo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;
    expect(headers.get("x-csrf-token")).toBe("abc-123");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(init.body).toBe("{}");
    expect(init.method).toBe("POST");
  });

  it("attaches x-csrf-token header on PUT, PATCH, and DELETE", async () => {
    setCookieString("csrf-token=tok");
    for (const method of ["PUT", "PATCH", "DELETE"] as const) {
      fetchMock.mockClear();
      await apiFetch("/api/foo", { method });
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Headers).get("x-csrf-token")).toBe("tok");
    }
  });

  it("URL-decodes the token from the cookie", async () => {
    setCookieString("csrf-token=a%2Fb%3Dc");
    await apiFetch("/api/foo", { method: "POST" });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Headers).get("x-csrf-token")).toBe("a/b=c");
  });
});
