-- CreateEnum
CREATE TYPE "PartyType" AS ENUM ('CUSTOMER', 'SUPPLIER', 'EMPLOYEE', 'OTHER');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PlanState" AS ENUM ('OPEN', 'ARCHIVED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "instalmentId" TEXT,
ADD COLUMN     "partyId" TEXT,
ADD COLUMN     "projectId" TEXT;

-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PartyType" NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "budgetHalalas" INTEGER,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "direction" "Direction" NOT NULL,
    "title" TEXT NOT NULL,
    "totalHalalas" INTEGER NOT NULL,
    "categoryId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "reminderDays" INTEGER NOT NULL DEFAULT 3,
    "state" "PlanState" NOT NULL DEFAULT 'OPEN',
    "closedAt" TIMESTAMP(3),
    "notes" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Instalment" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "dueDate" DATE NOT NULL,
    "amountDueHalalas" INTEGER NOT NULL,
    "paidHalalas" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Instalment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Party_establishmentId_type_idx" ON "Party"("establishmentId", "type");

-- CreateIndex
CREATE INDEX "Project_establishmentId_status_idx" ON "Project"("establishmentId", "status");

-- CreateIndex
CREATE INDEX "Plan_establishmentId_state_idx" ON "Plan"("establishmentId", "state");

-- CreateIndex
CREATE INDEX "Plan_partyId_idx" ON "Plan"("partyId");

-- CreateIndex
CREATE INDEX "Plan_categoryId_idx" ON "Plan"("categoryId");

-- CreateIndex
CREATE INDEX "Instalment_establishmentId_dueDate_idx" ON "Instalment"("establishmentId", "dueDate");

-- CreateIndex
CREATE INDEX "Instalment_planId_idx" ON "Instalment"("planId");

-- CreateIndex
CREATE INDEX "Transaction_partyId_idx" ON "Transaction"("partyId");

-- CreateIndex
CREATE INDEX "Transaction_projectId_idx" ON "Transaction"("projectId");

-- CreateIndex
CREATE INDEX "Transaction_instalmentId_idx" ON "Transaction"("instalmentId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_instalmentId_fkey" FOREIGN KEY ("instalmentId") REFERENCES "Instalment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Instalment" ADD CONSTRAINT "Instalment_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Instalment" ADD CONSTRAINT "Instalment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

