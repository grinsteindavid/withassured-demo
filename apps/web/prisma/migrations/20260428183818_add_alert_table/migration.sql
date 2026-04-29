-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('WORKFLOW_COMPLETED', 'WORKFLOW_FAILED');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'ERROR');

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Alert_orgId_idx" ON "Alert"("orgId");

-- CreateIndex
CREATE INDEX "Alert_workflowId_idx" ON "Alert"("workflowId");

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
