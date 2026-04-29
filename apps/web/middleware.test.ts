import { describe, it, expect } from "bun:test";
import { NextRequest } from "next/server";
import { middleware, config } from "./middleware";

describe("middleware", () => {
  it("allows /login through without a session", async () => {
    const request = new NextRequest("http://localhost:3000/login");
    const response = await middleware(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("sets security headers on public routes", async () => {
    const request = new NextRequest("http://localhost:3000/login");
    const response = await middleware(request);
    expect(response.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
    expect(response.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'self'");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(response.headers.get("Strict-Transport-Security")).toContain("max-age=63072000");
  });

  it("allows /api/auth/* through without a session", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
    });
    const response = await middleware(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects /dashboard to /login without a session", async () => {
    const request = new NextRequest("http://localhost:3000/dashboard");
    const response = await middleware(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("redirects /dashboard/billing to /login without a session", async () => {
    const request = new NextRequest("http://localhost:3000/dashboard/billing");
    const response = await middleware(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("returns 401 JSON for protected /api routes without a session", async () => {
    const request = new NextRequest("http://localhost:3000/api/providers");
    const response = await middleware(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 JSON for protected /api routes with invalid session", async () => {
    const request = new NextRequest("http://localhost:3000/api/providers", {
      headers: { cookie: "session=not-a-valid-jwt" },
    });
    const response = await middleware(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("redirects when session cookie is invalid on pages", async () => {
    const request = new NextRequest("http://localhost:3000/dashboard", {
      headers: { cookie: "session=not-a-valid-jwt" },
    });
    const response = await middleware(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });

  // Note: NextRequest cookie parsing in Bun test environment does not
  // populate request.cookies from the cookie header, so we cannot test
  // valid authenticated middleware flows here. Auth success paths are
  // covered by the route-guard tests and e2e tests instead.

  describe("matcher config", () => {
    it("excludes Workflow SDK runtime endpoints", () => {
      const matcher = config.matcher[0];
      expect(matcher).toContain(".well-known/workflow/");
    });

    it("excludes cron routes (gated by Bearer token, not session)", () => {
      const matcher = config.matcher[0];
      expect(matcher).toContain("api/cron/");
    });
  });
});
