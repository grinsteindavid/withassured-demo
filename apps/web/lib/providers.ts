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
import { start } from "workflow/api";
import { credentialingWorkflow } from "@/lib/workflow/credentialing";
import { licenseWorkflow } from "@/lib/workflow/license";
import { seedWorkflowRow } from "@/lib/workflow/store";

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

export async function getProviders(orgId: string) {
  return prisma.provider.findMany({ where: { orgId } });
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
  if (!data.orgId) {
    throw new Error("orgId is required");
  }
  return prisma.provider.create({
    data: {
      npi: data.npi,
      name: data.name,
      specialty: data.specialty,
      status: data.status,
      orgId: data.orgId,
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

    // Pre-seed Workflow rows inside the same transaction so the UI never
    // sees a missing row during the SDK queue-drain window. ensureRunStep
    // inside the workflow body becomes a no-op for existing rows.
    await seedWorkflowRow(tx, `cred_${provider.id}`, "credentialing");
    await seedWorkflowRow(tx, `lic_${license.id}`, "license");

    return { provider, license: licenseWithWorkflow, credentialingCase };
  });

  await Promise.all([
    recordUsageEvent("LICENSE", orgId, result.provider.id),
    recordUsageEvent("CREDENTIALING", orgId, result.provider.id),
  ]);

  await start(credentialingWorkflow, [`cred_${result.provider.id}`]);
  await start(licenseWorkflow, [result.license.workflowId!]);

  return result.provider;
}
