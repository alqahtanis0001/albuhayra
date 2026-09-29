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
    // DO NOT enable `sequence.shuffle`. The static sweep in
    // src/features/transactions/scoping.test.ts reads the `allObserved` set that
    // the driver blocks in the same file populate, so it must run last. Shuffling
    // breaks it on some seeds only — two of three pass — which is the profile that
    // gets written off as flakiness. The test carries a floor assertion whose
    // failure message names this cause, so it will tell you rather than look like
    // a scoping regression. Making the sweep self-driving would fix it properly
    // but would duplicate every driver's fixture, and that duplication would rot
    // faster than this fragility costs.
  },
  resolve: {
    alias: { "@": path.resolve(root, "src") },
  },
});
