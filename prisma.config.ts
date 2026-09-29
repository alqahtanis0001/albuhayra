import path from "node:path";
import { defineConfig } from "prisma/config";
import "dotenv/config";

// Only migrate/seed need a URL. `prisma generate` (and therefore `npm run build`)
// must work without one, so this must not throw when both are unset.
//
// DIRECT_URL wins when set: on Render, DATABASE_URL is Neon's *pooled* string,
// and `migrate` takes a session-level advisory lock that PgBouncer's transaction
// mode cannot hold. Locally only DATABASE_URL is set, so nothing changes there.
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
  },
});
