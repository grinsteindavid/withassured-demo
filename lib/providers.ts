import "server-only";

import { prisma } from "@/lib/db";
import type { createProviderSchema } from "@/lib/validators";
import type { z } from "zod";
import type { ProviderStatus } from "@prisma/client";
import {
  computeProviderStatus,
  type ProviderDetail,
  type ProviderSummary,
  type ProviderWithRelations,
} from "@/lib/providers-shared";
import { recordUsageEvent } from "@/lib/billing";
import { controls } from "@/lib/temporal/client";

export { computeProviderStatus };
export type { ProviderDetail, ProviderSummary };

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

export async function createProviderWithLicenseAndCredentialing(
  data: z.infer<typeof createProviderSchema>,
  orgId: string,
) {
  const result = await prisma.$transaction(async (tx) => {
    const provider = await tx.provider.create({
      data: {
        npi: data.npi,
        name: data.name,
        specialty: data.specialty,
        status: "PENDING",
        orgId,
      },
    });

    const license = await tx.license.create({
      data: {
        providerId: provider.id,
        state: data.licenseState,
        number: data.licenseNumber,
        expiresAt: new Date(data.licenseExpiresAt),
        status: "PENDING",
      },
    });

    const licenseWithWorkflow = await tx.license.update({
      where: { id: license.id },
      data: { workflowId: `lic_${license.id}` },
    });

    const credentialingCase = await tx.credentialingCase.create({
      data: {
        providerId: provider.id,
        workflowId: `cred_${provider.id}`,
        status: "IN_PROGRESS",
      },
    });

    return { provider, license: licenseWithWorkflow, credentialingCase };
  });

  await Promise.all([
    recordUsageEvent("LICENSE", result.provider.id, orgId),
    recordUsageEvent("CREDENTIALING", result.provider.id, orgId),
  ]);

  controls.create(result.license.workflowId!, { status: "RUNNING", completedCount: 0 });
  controls.create(`cred_${result.provider.id}`, { status: "RUNNING", completedCount: 0 });

  return result.provider;
}
