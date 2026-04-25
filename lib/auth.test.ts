import { describe, it, expect } from "bun:test";
import { decodeJwt } from "jose";
import { hashPassword, verifyPassword, signJWT, verifyJWT } from "./auth";

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
