import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getWorkflowState } from "@/lib/workflow/read";
import { inferType } from "@/lib/workflow/definitions";
import type { WorkflowType } from "@/lib/workflow/types";
import { withAuthParams } from "@/lib/route-guard";

export const GET = withAuthParams(
  async (_request, params, user) => {
    const workflowId = (await params).workflowId as string;
    const allowed = await isOrgAuthorized(workflowId, user.orgId);
    if (!allowed) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    try {
      const state = await getWorkflowState(workflowId);
      return NextResponse.json(state);
    } catch {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  },
);

// Verify the workflow's parent entity belongs to the caller's org.
// Mirrors the orgId checks in lib/credentialing.ts, lib/licenses.ts,
// lib/compliance.ts, and lib/enrollment.ts.
async function isOrgAuthorized(workflowId: string, orgId: string): Promise<boolean> {
  let type: WorkflowType;
  try {
    type = inferType(workflowId);
  } catch {
    return false;
  }

  switch (type) {
    case "credentialing": {
      const cred = await prisma.credentialingCase.findUnique({
        where: { workflowId },
        include: { provider: true },
      });
      return !!cred && cred.provider.orgId === orgId;
    }
    case "license": {
      const license = await prisma.license.findFirst({
        where: { workflowId },
        include: { provider: true },
      });
      return !!license && license.provider.orgId === orgId;
    }
    case "enrollment": {
      const enrollment = await prisma.payerEnrollment.findFirst({
        where: { workflowId },
        include: { provider: true },
      });
      return !!enrollment && enrollment.provider.orgId === orgId;
    }
    case "compliance": {
      const checkId = workflowId.replace(/^comp_/, "");
      const check = await prisma.complianceCheck.findUnique({
        where: { id: checkId },
        include: { provider: true },
      });
      return !!check && check.provider.orgId === orgId;
    }
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}
