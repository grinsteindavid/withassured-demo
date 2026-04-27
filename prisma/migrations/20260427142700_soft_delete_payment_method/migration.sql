-- AlterTable
ALTER TABLE "PaymentMethod" ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletedBy" TEXT;
