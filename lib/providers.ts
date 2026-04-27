import { prisma } from "@/lib/db";
import type { createProviderSchema } from "@/lib/validators";
import type { z } from "zod";
import type { ProviderStatus, License, PayerEnrollment, ComplianceCheck } from "@prisma/client";

type ProviderWithRelations = {
  id: string;
  npi: string;
  name: string;
  specialty: string;
  status: ProviderStatus;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
  licenses: License[];
  enrollments: PayerEnrollment[];
  complianceChecks: ComplianceCheck[];
};

export type ProviderSummary = {
  id: string;
  npi: string;
  name: string;
  specialty: string;
  status: ProviderStatus;
  licenseCount: number;
  enrollmentCount: number;
  hasComplianceFlag: boolean;
  createdAt: Date;
};

export type ProviderDetail = ProviderSummary & {
  licenses: License[];
  enrollments: PayerEnrollment[];
  complianceChecks: ComplianceCheck[];
};

export function computeProviderStatus(
  provider: Pick<ProviderWithRelations, "licenses" | "enrollments" | "complianceChecks">,
): ProviderStatus {
  const hasExpiredOrRevokedLicense = provider.licenses.some(
    (l) => l.status === "EXPIRED" || l.status === "REVOKED",
  );
  const hasDeniedEnrollment = provider.enrollments.some(
    (e) => e.status === "DENIED",
  );
  const hasComplianceFlag = provider.complianceChecks.some(
    (c) => c.result === "FLAG",
  );

  if (hasExpiredOrRevokedLicense || hasDeniedEnrollment || hasComplianceFlag) {
    return "INACTIVE";
  }

  const hasPendingLicense = provider.licenses.some(
    (l) => l.status === "PENDING",
  );
  const hasPendingEnrollment = provider.enrollments.some(
    (e) => e.status === "PENDING" || e.status === "SUBMITTED",
  );

  if (hasPendingLicense || hasPendingEnrollment) {
    return "PENDING";
  }

  return "ACTIVE";
}

export async function recomputeAndUpdateProviderStatus(providerId: string): Promise<ProviderStatus> {
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    include: { licenses: true, enrollments: true, complianceChecks: true },
  }) as ProviderWithRelations | null;

  if (!provider) return "INACTIVE";

  const status = computeProviderStatus(provider);
  await prisma.provider.update({ where: { id: providerId }, data: { status } });
  return status;
}

export async function getProviders() {
  return prisma.provider.findMany();
}

export async function listProviders(
  orgId: string,
  filters?: {
    status?: ProviderStatus;
    specialty?: string;
    search?: string;
  },
): Promise<ProviderSummary[]> {
  const where: {
    orgId: string;
    specialty?: string;
    OR?: Array<{ name: { contains: string; mode: "insensitive" } } | { npi: { contains: string; mode: "insensitive" } }>;
  } = { orgId };

  if (filters?.specialty) {
    where.specialty = filters.specialty;
  }

  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { npi: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const providers = await prisma.provider.findMany({
    where,
    include: {
      licenses: true,
      enrollments: true,
      complianceChecks: true,
    },
    orderBy: { name: "asc" },
  }) as ProviderWithRelations[];

  const mapped = providers.map((p) => ({
    id: p.id,
    npi: p.npi,
    name: p.name,
    specialty: p.specialty,
    status: computeProviderStatus(p),
    licenseCount: p.licenses.length,
    enrollmentCount: p.enrollments.length,
    hasComplianceFlag: p.complianceChecks.some((c) => c.result === "FLAG"),
    createdAt: p.createdAt,
  }));

  if (filters?.status) {
    return mapped.filter((p) => p.status === filters.status);
  }

  return mapped;
}

export async function getProviderDetail(
  providerId: string,
  orgId: string,
): Promise<ProviderDetail | null> {
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    include: {
      licenses: true,
      enrollments: true,
      complianceChecks: true,
    },
  }) as ProviderWithRelations | null;

  if (!provider || provider.orgId !== orgId) return null;

  const status = computeProviderStatus(provider);

  return {
    id: provider.id,
    npi: provider.npi,
    name: provider.name,
    specialty: provider.specialty,
    status,
    licenseCount: provider.licenses.length,
    enrollmentCount: provider.enrollments.length,
    hasComplianceFlag: provider.complianceChecks.some((c) => c.result === "FLAG"),
    createdAt: provider.createdAt,
    licenses: provider.licenses,
    enrollments: provider.enrollments,
    complianceChecks: provider.complianceChecks,
  };
}

export async function createProvider(data: z.infer<typeof createProviderSchema>) {
  return prisma.provider.create({
    data: {
      npi: data.npi,
      name: data.name,
      specialty: data.specialty,
      status: data.status,
      orgId: data.orgId || "",
    },
  });
}
