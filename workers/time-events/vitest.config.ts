import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.toml" },
      miniflare: {
        // Keep tests deterministic: no real network, no real Supabase.
        // The test harness injects an in-memory store via service binding-
        // free DI — see `src/test/harness.ts`.
        compatibilityDate: "2026-04-19",
        compatibilityFlags: ["nodejs_compat"],
      },
    }),
    tsconfigPaths(),
  ],
});
