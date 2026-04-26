import { describe, it, expect, mock } from "bun:test";
import { decodeJwt } from "jose";
import { hashPassword, verifyPassword, signJWT, verifyJWT, getSessionUser } from "./auth";

describe("hashPassword", () => {
  it("hashes a password with bcrypt", async () => {
    const password = "test-password";
    const hash = await hashPassword(password);
    
    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(50);
  });
});

describe("verifyPassword", () => {
  it("returns true for correct password", async () => {
    const password = "test-password";
    const hash = await hashPassword(password);
    const result = await verifyPassword(password, hash);
    
    expect(result).toBe(true);
  });

  it("returns false for incorrect password", async () => {
    const password = "test-password";
    const hash = await hashPassword(password);
    const result = await verifyPassword("wrong-password", hash);
    
    expect(result).toBe(false);
  });
});

describe("signJWT", () => {
  it("signs a JWT with correct payload", async () => {
    const payload = { sub: "user-123", orgId: "org-456", role: "ADMIN" };
    const token = await signJWT(payload);
    
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // JWT has 3 parts
  });
});

describe("signJWT", () => {
  it("expires in approximately 1 hour", async () => {
    const payload = { sub: "user-123", orgId: "org-456", role: "ADMIN" };
    const token = await signJWT(payload);
    const decoded = decodeJwt(token);

    expect(decoded.iat).toBeDefined();
    expect(decoded.exp).toBeDefined();

    const duration = (decoded.exp! - decoded.iat!);
    expect(duration).toBeGreaterThanOrEqual(3590);
    expect(duration).toBeLessThanOrEqual(3610);
  });
});

describe("verifyJWT", () => {
  it("decodes valid token and returns payload", async () => {
    const payload = { sub: "user-123", orgId: "org-456", role: "ADMIN" };
    const token = await signJWT(payload);
    const result = await verifyJWT(token);
    
    expect(result).not.toBeNull();
    expect(result?.sub).toBe("user-123");
    expect(result?.orgId).toBe("org-456");
    expect(result?.role).toBe("ADMIN");
  });

  it("returns null for invalid token", async () => {
    const result = await verifyJWT("invalid-token");
    expect(result).toBeNull();
  });

  it("returns null for malformed token", async () => {
    const result = await verifyJWT("not.a.jwt");
    expect(result).toBeNull();
  });
});

import { authenticateUser } from "./auth";

const findUnique = mock(async (_args: { where: { email: string } }) => null as unknown);

mock.module("@/lib/db", () => ({
  prisma: { user: { findUnique } },
}));

describe("authenticateUser", () => {
  it("returns null for non-existent email", async () => {
    findUnique.mockResolvedValueOnce(null);
    const result = await authenticateUser("nobody@test.com", "password");
    expect(result).toBeNull();
  });

  it("returns null for wrong password", async () => {
    const passwordHash = await hashPassword("correctpass");
    findUnique.mockResolvedValueOnce({
      id: "u_1",
      email: "test@test.com",
      passwordHash,
      role: "ADMIN",
      orgId: "org_1",
    });
    const result = await authenticateUser("test@test.com", "wrongpass");
    expect(result).toBeNull();
  });

  it("returns user on valid credentials", async () => {
    const passwordHash = await hashPassword("correctpass");
    findUnique.mockResolvedValueOnce({
      id: "u_1",
      email: "test@test.com",
      passwordHash,
      role: "ADMIN",
      orgId: "org_1",
    });
    const result = await authenticateUser("test@test.com", "correctpass");
    expect(result).toEqual({ id: "u_1", email: "test@test.com", role: "ADMIN", orgId: "org_1" });
  });
});

const cookiesMock = mock(async () => ({
  get: mock(() => ({ value: "mock-token" })),
}));

mock.module("next/headers", () => ({
  cookies: cookiesMock,
}));

describe("getSessionUser", () => {
  it("returns user data when valid session exists", async () => {
    const payload = { sub: "user-123", orgId: "org-456", role: "ADMIN" };
    const token = await signJWT(payload);
    cookiesMock.mockResolvedValueOnce({
      get: mock(() => ({ value: token })),
    });

    const result = await getSessionUser();

    expect(result).not.toBeNull();
    expect(result?.userId).toBe("user-123");
    expect(result?.orgId).toBe("org-456");
    expect(result?.role).toBe("ADMIN");
  });

  it("returns null when no session cookie", async () => {
    cookiesMock.mockResolvedValueOnce({
      get: mock(() => undefined) as () => { value: string } | undefined,
    });

    const result = await getSessionUser();

    expect(result).toBeNull();
  });

  it("returns null when token verification fails", async () => {
    cookiesMock.mockResolvedValueOnce({
      get: mock(() => ({ value: "invalid-token" })),
    });

    const result = await getSessionUser();

    expect(result).toBeNull();
  });
});
