-- v1.1e: email verification, password reset, name parts. EXPAND ONLY.
--
-- Generated with `prisma migrate diff` (schema before → schema after, no
-- database), then the backfill below was written by hand in the same file.
-- Nothing the previous release reads is removed: while Render builds, the old
-- release keeps serving against this database, so "name" stays (nullable) and
-- the new name columns default to '' so the old release can still insert.
-- A later *contract* migration drops "name" (docs/BACKEND.md A9, A10).
--
-- Tested on PGlite by src/lib/migration.test.ts. Only the user applies this to
-- Neon: Render's build runs `prisma migrate deploy` on push.
-- CreateEnum
CREATE TYPE "EmailCodePurpose" AS ENUM ('VERIFY', 'RESET');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "firstName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "lastName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "middleName" TEXT,
ALTER COLUMN "name" DROP NOT NULL;

-- CreateTable
CREATE TABLE "EmailCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "EmailCodePurpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailCode_userId_purpose_idx" ON "EmailCode"("userId", "purpose");

-- AddForeignKey
ALTER TABLE "EmailCode" ADD CONSTRAINT "EmailCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill ------------------------------------------------------------------
-- Split the old single name into parts: first word, middle words, last word;
-- a one-word name gets an empty lastName and no middleName.
--
-- Locale-proof (A10): Postgres' trim() strips only U+0020 and '\s' depends on
-- the database's ctype, so whitespace is an explicit class (tab, newline,
-- NBSP, the U+2000 spaces, zero-width space, narrow NBSP, ideographic space,
-- BOM, …). Bidi marks, ZWNJ/ZWJ and tatweel are removed, as the app does.
--
-- Compound Arabic names: the connectors عبد أبو ابو آل بن ابن are glued to the
-- following word with U+E000 (private use, never typed) before splitting and
-- turned back into a space afterwards, so «عبد الله محمد القحطاني» gives first
-- «عبد الله», and «محمد بن سلمان آل سعود» gives first «محمد», middle
-- «بن سلمان», last «آل سعود». The glue runs twice so chained connectors
-- («أبو عبد الله») stay together: a match consumes the space the next needs.
WITH cleaned AS (
  SELECT "id",
    btrim(
      regexp_replace(
        regexp_replace("name", '[\u200c-\u200f\u202a-\u202e\u2066-\u2069\u061c\u0640]', '', 'g'),
        '[\s\u00a0\u1680\u2000-\u200b\u2028\u2029\u202f\u205f\u3000\ufeff]+', ' ', 'g'),
      ' ') AS n
  FROM "User"
  WHERE "name" IS NOT NULL
), glued AS (
  SELECT "id",
    regexp_replace(
      regexp_replace(n, '(^| )(عبد|أبو|ابو|آل|بن|ابن) ', '\1\2' || chr(57344), 'g'),
      '(^| |' || chr(57344) || ')(عبد|أبو|ابو|آل|بن|ابن) ', '\1\2' || chr(57344), 'g') AS n
  FROM cleaned
), split AS (
  SELECT "id", regexp_split_to_array(n, ' ') AS parts FROM glued
)
UPDATE "User" AS u
SET
  "firstName" = replace(s.parts[1], chr(57344), ' '),
  "lastName" = CASE
    WHEN cardinality(s.parts) > 1 THEN replace(s.parts[cardinality(s.parts)], chr(57344), ' ')
    ELSE ''
  END,
  "middleName" = NULLIF(
    replace(array_to_string(s.parts[2:cardinality(s.parts) - 1], ' '), chr(57344), ' '),
    ''
  )
FROM split AS s
WHERE u."id" = s."id";

-- Every account that exists before v1.1e is treated as verified: nobody is
-- locked out by the new requireUser() gate on deploy.
UPDATE "User" SET "emailVerifiedAt" = CURRENT_TIMESTAMP WHERE "emailVerifiedAt" IS NULL;
