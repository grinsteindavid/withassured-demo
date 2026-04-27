import { describe, it, expect } from "bun:test";
import { loginSchema, createProviderSchema, licenseQuerySchema } from "./validators";

describe("loginSchema", () => {
  it("validates correct input", () => {
    const result = loginSchema.safeParse({ email: "test@example.com", password: "password123" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({ email: "invalid", password: "password123" });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = loginSchema.safeParse({ email: "test@example.com", password: "12345" });
    expect(result.success).toBe(false);
  });
});

describe("createProviderSchema", () => {
  it("validates correct input", () => {
    const result = createProviderSchema.safeParse({
      npi: "1234567890",
      name: "Dr. Test",
      specialty: "Cardiology",
      status: "ACTIVE",
      orgId: "org-123",
      licenseState: "CA",
      licenseNumber: "L123456",
      licenseExpiresAt: "2027-01-01",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid NPI length", () => {
    const result = createProviderSchema.safeParse({
      npi: "123",
      name: "Dr. Test",
      specialty: "Cardiology",
      status: "ACTIVE",
      orgId: "org-123",
      licenseState: "CA",
      licenseNumber: "L123456",
      licenseExpiresAt: "2027-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing status", () => {
    const result = createProviderSchema.safeParse({
      npi: "1234567890",
      name: "Dr. Test",
      specialty: "Cardiology",
      orgId: "org-123",
      licenseState: "CA",
      licenseNumber: "L123456",
      licenseExpiresAt: "2027-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing license fields", () => {
    const result = createProviderSchema.safeParse({
      npi: "1234567890",
      name: "Dr. Test",
      specialty: "Cardiology",
      status: "ACTIVE",
    });
    expect(result.success).toBe(false);
  });

  it("accepts missing orgId (added by API route)", () => {
    const result = createProviderSchema.safeParse({
      npi: "1234567890",
      name: "Dr. Test",
      specialty: "Cardiology",
      status: "ACTIVE",
      licenseState: "CA",
      licenseNumber: "L123456",
      licenseExpiresAt: "2027-01-01",
    });
    expect(result.success).toBe(true);
  });
});

describe("licenseQuerySchema", () => {
  it("validates without optional fields", () => {
    const result = licenseQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("validates with expiringInDays", () => {
    const result = licenseQuerySchema.safeParse({ expiringInDays: "30" });
    expect(result.success).toBe(true);
  });
});
