import { describe, it, expect, mock } from "bun:test";
import { NextRequest, NextResponse } from "next/server";
import { withAuth, withSubscription, withRole, withAuthParams } from "./route-guard";

mock.module("next/headers", () => ({
  cookies: mock(async () => ({
    get: mock(() => undefined),
  })),
}));

mock.module("@/lib/db", () => ({
  prisma: {
    user: { findUnique: mock(() => null) },
    subscription: { findUnique: mock(() => null) },
  },
}));

describe("withAuth", () => {
  it("returns 401 when no session cookie", async () => {
    const handler = mock(() => NextResponse.json({ ok: true }));
    const wrapped = withAuth(handler as unknown as Parameters<typeof withAuth>[0]);

    const request = new NextRequest("http://localhost:3000/api/test");
    const response = await wrapped(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("withSubscription", () => {
  it("returns 403 when subscription is inactive", async () => {
    const { signJWT } = await import("./auth");
    const token = await signJWT({ sub: "user-1", orgId: "org-1", role: "ADMIN" });

    mock.module("next/headers", () => ({
      cookies: mock(async () => ({
        get: mock(() => ({ value: token })),
      })),
    }));

    const handler = mock(() => NextResponse.json({ ok: true }));
    const wrapped = withSubscription(handler as unknown as Parameters<typeof withSubscription>[0]);

    const request = new NextRequest("http://localhost:3000/api/test");
    const response = await wrapped(request);

    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("withRole", () => {
  it("returns 403 when role is not allowed", async () => {
    const { signJWT } = await import("./auth");
    const token = await signJWT({ sub: "user-1", orgId: "org-1", role: "MEMBER" });

    mock.module("next/headers", () => ({
      cookies: mock(async () => ({
        get: mock(() => ({ value: token })),
      })),
    }));

    const handler = mock(() => NextResponse.json({ ok: true }));
    const wrapped = withRole(
      handler as unknown as Parameters<typeof withRole>[0],
      ["ADMIN"],
    );

    const request = new NextRequest("http://localhost:3000/api/test");
    const response = await wrapped(request);

    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("withAuthParams", () => {
  it("returns 401 when no session cookie", async () => {
    mock.module("next/headers", () => ({
      cookies: mock(async () => ({
        get: mock(() => undefined),
      })),
    }));

    const handler = mock(() => NextResponse.json({ ok: true }));
    const wrapped = withAuthParams(handler as unknown as Parameters<typeof withAuthParams>[0]);

    const request = new NextRequest("http://localhost:3000/api/test/123");
    const params = Promise.resolve({ id: "123" });
    const response = await wrapped(request, { params });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
    expect(handler).not.toHaveBeenCalled();
  });
});
