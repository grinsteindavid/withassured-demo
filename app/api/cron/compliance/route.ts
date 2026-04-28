import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { start } from "workflow/api";
import { complianceWorkflow } from "@/lib/workflow/compliance";
import { seedWorkflowRow } from "@/lib/workflow/store";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const providers = await prisma.provider.findMany({
    where: {
      licenses: {
        some: { status: "ACTIVE" },
        none: { status: "REVOKED" },
      },
    },
    include: { licenses: true },
  });

  for (const provider of providers) {
    const check = await prisma.complianceCheck.create({
      data: {
        providerId: provider.id,
        source: "SCHEDULED_CHECK",
        result: "CLEAN",
      },
    });

    const workflowId = `comp_${check.id}`;
    await seedWorkflowRow(prisma, workflowId, "compliance");
    await start(complianceWorkflow, [workflowId]);
  }

  return NextResponse.json({ created: providers.length });
}
