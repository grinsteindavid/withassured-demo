import { z } from "zod";
import type { LicenseStatus } from "@prisma/client";

const LICENSE_STATUSES: readonly LicenseStatus[] = ["ACTIVE", "EXPIRED", "PENDING", "REVOKED"] as const;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const createProviderSchema = z.object({
  npi: z.string().length(10),
  name: z.string().min(1),
  specialty: z.string().min(1),
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING"]),
  orgId: z.string().optional(),
  licenseState: z.string().min(1),
  licenseNumber: z.string().min(1),
  licenseExpiresAt: z.string().date(),
});

export const licenseQuerySchema = z.object({
  status: z.enum(LICENSE_STATUSES).optional(),
  state: z.string().optional(),
  expiringInDays: z.coerce.number().optional(),
});

export const complianceQuerySchema = z.object({
  providerId: z.string().optional(),
});

export const billingUsageQuerySchema = z.object({
  period: z.enum(["current", "previous"]).default("current"),
});

export const providerQuerySchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING"]).optional(),
  specialty: z.string().optional(),
  search: z.string().optional(),
});

export const addPaymentMethodSchema = z.object({
  type: z.enum(["CARD", "ACH"]),
  last4: z.string().length(4),
  expiryMonth: z.coerce.number().min(1).max(12),
  expiryYear: z.coerce.number().min(new Date().getFullYear()),
  brand: z.string().optional(),
  setDefault: z.boolean().default(false),
});

export const createSubscriptionSchema = z.object({
  plan: z.enum(["STARTUP", "GROWTH", "ENTERPRISE"]),
});

export const createPayerEnrollmentSchema = z.object({
  providerId: z.string().min(1),
  payer: z.string().min(1),
  state: z.string().min(1),
  submittedAt: z.string().datetime().optional(),
});
