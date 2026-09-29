import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Tests must not depend on the machine's timezone; the app's is Asia/Riyadh.
    env: { TZ: "Asia/Riyadh" },
  },
  resolve: {
    alias: { "@": path.resolve(root, "src") },
  },
});
