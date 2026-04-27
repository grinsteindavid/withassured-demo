import "server-only";

import { prisma } from "@/lib/db";
import { mockTemporal } from "@/lib/temporal/client";
import { currentStep, fullStepList } from "@/lib/temporal/derive";
import type { WorkflowStep } from "@/lib/temporal/types";
import type { Provider } from "@prisma/client";

export async function getProvidersByOrg(orgId: string) {
  return prisma.provider.findMany({
    where: { orgId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

type ComplianceCheckWithProvider = {
  id: string;
  providerId: string;
  source: string;
  result: string;
  checkedAt: Date;
  provider: Provider;
};

export type ComplianceSummary = {
  id: string;
  providerId: string;
  providerName: string;
  providerSpecialty: string;
  source: string;
  result: string;
  checkedAt: Date;
  workflowId: string;
  workflowStatus: string;
  currentStep: string | null;
  startTime: Date;
};

export type ComplianceDetail = ComplianceSummary & {
  steps: WorkflowStep[];
};

export async function getComplianceChecks(orgId: string, providerId?: string) {
  const where: { providerId?: string; provider: { orgId: string } } = { provider: { orgId } };
  if (providerId) where.providerId = providerId;
  return prisma.complianceCheck.findMany({ where });
}

export async function listComplianceWorkflows(
  orgId: string,
  filters?: {
    result?: string;
    source?: string;
    providerId?: string;
  },
): Promise<ComplianceSummary[]> {
  const where: {
    provider: { orgId: string };
    result?: string;
    source?: string;
    providerId?: string;
  } = {
    provider: { orgId },
  };

  if (filters?.result) {
    where.result = filters.result;
  }

  if (filters?.source) {
    where.source = filters.source;
  }

  if (filters?.providerId) {
    where.providerId = filters.providerId;
  }

  const checks = await prisma.complianceCheck.findMany({
    where,
    include: { provider: true },
    orderBy: { checkedAt: "desc" },
  });

  return Promise.all(
    (checks as ComplianceCheckWithProvider[]).map(async (check) => {
      const workflowId = `comp_${check.id}`;
      const handle = mockTemporal.workflow.getHandle(workflowId);
      const [info, history] = await Promise.all([handle.describe(), handle.fetchHistory()]);
      return {
        id: check.id,
        providerId: check.providerId,
        providerName: check.provider.name,
        providerSpecialty: check.provider.specialty,
        source: check.source,
        result: check.result,
        checkedAt: check.checkedAt,
        workflowId,
        workflowStatus: info.status.name,
        currentStep: currentStep(history.events),
        startTime: info.startTime,
      };
    }),
  );
}

export async function getComplianceWorkflowDetail(
  checkId: string,
  orgId: string,
): Promise<ComplianceDetail | null> {
  const check = await prisma.complianceCheck.findUnique({
    where: { id: checkId },
    include: { provider: true },
  });

  if (!check) return null;
  const checkWithProvider = check as ComplianceCheckWithProvider;
  if (checkWithProvider.provider.orgId !== orgId) return null;

  const workflowId = `comp_${check.id}`;
  const handle = mockTemporal.workflow.getHandle(workflowId);
  const [info, history] = await Promise.all([handle.describe(), handle.fetchHistory()]);

  return {
    id: check.id,
    providerId: check.providerId,
    providerName: checkWithProvider.provider.name,
    providerSpecialty: checkWithProvider.provider.specialty,
    source: check.source,
    result: check.result,
    checkedAt: check.checkedAt,
    workflowId,
    workflowStatus: info.status.name,
    currentStep: currentStep(history.events),
    startTime: info.startTime,
    steps: fullStepList(history.events, info.type),
  };
}
