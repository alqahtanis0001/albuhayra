/**
 * Creates the single ADMIN account. Idempotent: running it again does nothing
 * once an ADMIN exists. Default categories are NOT created here — they are
 * created per establishment when the ADMIN approves an owner (see approveOwner).
 *
 *   npm run seed
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/index.js";

const BCRYPT_COST = 12;

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!connectionString) throw new Error("DATABASE_URL is not set");
  if (!email) throw new Error("SEED_ADMIN_EMAIL is not set");
  if (!password || password.length < 10) {
    throw new Error("SEED_ADMIN_PASSWORD must be at least 10 characters");
  }

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    const existing = await db.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true, email: true },
    });

    if (existing) {
      console.log(`ADMIN already exists (${existing.email}) — nothing to do.`);
      return;
    }

    const admin = await db.user.create({
      data: {
        email,
        // v1.1e: name parts, the legacy column dual-written for the expand step
        // (docs/BACKEND.md A9), and a verified address — without it the fresh
        // ADMIN would be refused by requireUser()'s verification gate.
        firstName: "مدير",
        lastName: "النظام",
        legacyName: "مدير النظام",
        emailVerifiedAt: new Date(),
        passwordHash: await bcrypt.hash(password, BCRYPT_COST),
        role: "ADMIN",
        status: "ACTIVE",
        establishmentId: null,
      },
      select: { id: true, email: true },
    });

    console.log(`Created ADMIN ${admin.email}.`);
    console.log("Log in, change the password, then remove SEED_ADMIN_PASSWORD from the environment.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  // Never print the password or the whole environment.
  console.error("Seed failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
