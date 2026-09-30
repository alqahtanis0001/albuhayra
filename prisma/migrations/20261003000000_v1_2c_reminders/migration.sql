-- CreateEnum
CREATE TYPE "DigestStatus" AS ENUM ('PENDING', 'SENT', 'EMPTY', 'FAILED');

-- AlterTable
ALTER TABLE "Establishment" ADD COLUMN     "digestEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "digestHour" INTEGER NOT NULL DEFAULT 7;

-- AlterTable
ALTER TABLE "Party" ADD COLUMN     "remindersOptIn" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ReminderDigest" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "DigestStatus" NOT NULL,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderDigest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReminderDigest_establishmentId_date_key" ON "ReminderDigest"("establishmentId", "date");

-- AddForeignKey
ALTER TABLE "ReminderDigest" ADD CONSTRAINT "ReminderDigest_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

