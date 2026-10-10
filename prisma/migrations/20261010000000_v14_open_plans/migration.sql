-- v1.4 (docs/V14-SPEC.md C1) — expand-only. Existing rows untouched: every
-- STANDARD and SALARY plan keeps its total; Transaction.planId is null on
-- every existing row. The previous release keeps inserting without the new
-- columns while Render builds this one.

-- AlterEnum
ALTER TYPE "PlanKind" ADD VALUE 'OPEN_ENDED';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "planId" TEXT;

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "expectedEndDate" DATE,
ALTER COLUMN "totalHalalas" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Transaction_planId_idx" ON "Transaction"("planId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
