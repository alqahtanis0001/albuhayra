import path from "node:path";
import { defineConfig } from "prisma/config";
import "dotenv/config";

// DATABASE_URL is only needed for migrate/seed. `prisma generate` (and therefore
// `npm run build`) must work without it, so this must not throw when it is unset.
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
