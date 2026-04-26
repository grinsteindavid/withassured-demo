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
  orgId: z.string(),
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
