-- CreateEnum
CREATE TYPE "PlanKind" AS ENUM ('STANDARD', 'SALARY');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "AllowanceType" AS ENUM ('HOUSING', 'TRANSPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT', 'LEAVE', 'REMOTE', 'HOLIDAY');

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "employeeId" TEXT,
ADD COLUMN     "kind" "PlanKind" NOT NULL DEFAULT 'STANDARD';

-- AlterTable
ALTER TABLE "Instalment" ADD COLUMN     "periodYm" TEXT;

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "userId" TEXT,
    "jobTitle" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "workDays" INTEGER NOT NULL DEFAULT 31,
    "workStart" TEXT,
    "workEnd" TEXT,
    "graceMinutes" INTEGER,
    "basicSalaryHalalas" INTEGER,
    "payDay" INTEGER,
    "salaryCategoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeAllowance" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "AllowanceType" NOT NULL,
    "label" TEXT,
    "amountHalalas" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeAllowance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryPeriod" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "instalmentId" TEXT NOT NULL,
    "periodYm" TEXT NOT NULL,
    "basicHalalas" INTEGER NOT NULL,
    "allowances" JSONB NOT NULL,
    "grossHalalas" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalaryPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryDeduction" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "salaryPeriodId" TEXT NOT NULL,
    "amountHalalas" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalaryDeduction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "statusOverridden" BOOLEAN NOT NULL DEFAULT false,
    "checkIn" TEXT,
    "checkOut" TEXT,
    "note" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_partyId_key" ON "Employee"("partyId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");

-- CreateIndex
CREATE INDEX "Employee_establishmentId_status_idx" ON "Employee"("establishmentId", "status");

-- CreateIndex
CREATE INDEX "EmployeeAllowance_employeeId_idx" ON "EmployeeAllowance"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "SalaryPeriod_instalmentId_key" ON "SalaryPeriod"("instalmentId");

-- CreateIndex
CREATE INDEX "SalaryPeriod_establishmentId_periodYm_idx" ON "SalaryPeriod"("establishmentId", "periodYm");

-- CreateIndex
CREATE UNIQUE INDEX "SalaryPeriod_employeeId_periodYm_key" ON "SalaryPeriod"("employeeId", "periodYm");

-- CreateIndex
CREATE INDEX "SalaryDeduction_salaryPeriodId_idx" ON "SalaryDeduction"("salaryPeriodId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_establishmentId_date_idx" ON "AttendanceRecord"("establishmentId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_employeeId_date_key" ON "AttendanceRecord"("employeeId", "date");

-- CreateIndex
CREATE INDEX "Plan_employeeId_idx" ON "Plan"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Instalment_planId_periodYm_key" ON "Instalment"("planId", "periodYm");

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_salaryCategoryId_fkey" FOREIGN KEY ("salaryCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAllowance" ADD CONSTRAINT "EmployeeAllowance_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAllowance" ADD CONSTRAINT "EmployeeAllowance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryPeriod" ADD CONSTRAINT "SalaryPeriod_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryPeriod" ADD CONSTRAINT "SalaryPeriod_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryPeriod" ADD CONSTRAINT "SalaryPeriod_instalmentId_fkey" FOREIGN KEY ("instalmentId") REFERENCES "Instalment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryDeduction" ADD CONSTRAINT "SalaryDeduction_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryDeduction" ADD CONSTRAINT "SalaryDeduction_salaryPeriodId_fkey" FOREIGN KEY ("salaryPeriodId") REFERENCES "SalaryPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryDeduction" ADD CONSTRAINT "SalaryDeduction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

