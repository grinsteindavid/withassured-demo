import "server-only";

import { prisma } from "@/lib/db";
import { mockTemporal } from "@/lib/temporal/client";
import { currentStep, fullStepList } from "@/lib/temporal/derive";
import type { WorkflowStep } from "@/lib/temporal/types";
import type { LicenseStatus, Provider } from "@prisma/client";

type LicenseWithProvider = {
  id: string;
  providerId: string;
  state: string;
  number: string;
  expiresAt: Date;
  status: LicenseStatus;
  workflowId: string | null;
  provider: Provider;
};

export type LicenseSummary = {
  id: string;
  providerId: string;
  providerName: string;
  providerSpecialty: string;
  state: string;
  number: string;
  expiresAt: Date;
  status: LicenseStatus;
  workflowId: string;
  workflowStatus: string;
  currentStep: string | null;
  startTime: Date;
};

export type LicenseDetail = LicenseSummary & {
  steps: WorkflowStep[];
};

export async function listLicenses(
  orgId: string,
  filters?: {
    status?: LicenseStatus;
    state?: string;
    expiringInDays?: number;
  },
): Promise<LicenseSummary[]> {
  const where: {
    provider: { orgId: string };
    workflowId: { not: null };
    status?: LicenseStatus;
    state?: string;
    expiresAt?: { lte: Date };
  } = {
    provider: { orgId },
    workflowId: { not: null },
  };

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.state) {
    where.state = filters.state;
  }

  if (filters?.expiringInDays) {
    where.expiresAt = {
      lte: new Date(Date.now() + filters.expiringInDays * 24 * 60 * 60 * 1000),
    };
  }

  const licenses = await prisma.license.findMany({
    where,
    include: { provider: true },
    orderBy: { expiresAt: "asc" },
  });

  return Promise.all(
    (licenses as LicenseWithProvider[]).map(async (license) => {
      const handle = mockTemporal.workflow.getHandle(license.workflowId!);
      const [info, history] = await Promise.all([handle.describe(), handle.fetchHistory()]);
      return {
        id: license.id,
        providerId: license.providerId,
        providerName: license.provider.name,
        providerSpecialty: license.provider.specialty,
        state: license.state,
        number: license.number,
        expiresAt: license.expiresAt,
        status: license.status,
        workflowId: license.workflowId!,
        workflowStatus: info.status.name,
        currentStep: currentStep(history.events),
        startTime: info.startTime,
      };
    }),
  );
}

export async function getLicenseDetail(
  licenseId: string,
  orgId: string,
): Promise<LicenseDetail | null> {
  const license = await prisma.license.findUnique({
    where: { id: licenseId },
    include: { provider: true },
  });

  if (!license || !license.workflowId) return null;
  const licenseWithProvider = license as LicenseWithProvider;
  if (licenseWithProvider.provider.orgId !== orgId) return null;

  const handle = mockTemporal.workflow.getHandle(license.workflowId);
  const [info, history] = await Promise.all([handle.describe(), handle.fetchHistory()]);

  return {
    id: license.id,
    providerId: license.providerId,
    providerName: licenseWithProvider.provider.name,
    providerSpecialty: licenseWithProvider.provider.specialty,
    state: license.state,
    number: license.number,
    expiresAt: license.expiresAt,
    status: license.status,
    workflowId: license.workflowId,
    workflowStatus: info.status.name,
    currentStep: currentStep(history.events),
    startTime: info.startTime,
    steps: fullStepList(history.events, info.type),
  };
}

// Legacy function for backward compatibility
export async function getLicenses(expiringInDays?: number) {
  const where = expiringInDays
    ? {
        expiresAt: {
          lte: new Date(Date.now() + expiringInDays * 24 * 60 * 60 * 1000),
        },
      }
    : {};

  return prisma.license.findMany({ where });
}
