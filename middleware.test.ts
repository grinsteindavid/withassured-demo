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

  it("redirects protected /api routes to /login without a session", async () => {
    const request = new NextRequest("http://localhost:3000/api/providers");
    const response = await middleware(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("redirects when session cookie is invalid", async () => {
    const request = new NextRequest("http://localhost:3000/dashboard", {
      headers: { cookie: "session=not-a-valid-jwt" },
    });
    const response = await middleware(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });

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
