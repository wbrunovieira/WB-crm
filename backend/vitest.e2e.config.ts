import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

// Load .env manually for e2e (vitest doesn't auto-load .env by default)
function loadEnv(): Record<string, string> {
  try {
    const raw = readFileSync(resolve(__dirname, ".env"), "utf-8");
    return Object.fromEntries(
      raw
        .split("\n")
        .filter((l) => l.trim() && !l.startsWith("#"))
        .map((l) => {
          const idx = l.indexOf("=");
          return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^["']|["']$/g, "")];
        }),
    );
  } catch {
    return {};
  }
}
const envFile = loadEnv();

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    globals: true,
    root: "./",
    include: ["test/e2e/**/*.e2e-spec.ts"],
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
    testTimeout: 30000,
    env: {
      ...envFile,
      DATABASE_URL:
        envFile.TEST_DATABASE_URL ??
        process.env.TEST_DATABASE_URL ??
        "postgresql://crm_user:dev_password_123@localhost:5499/crm_db",
    },
  },
  plugins: [swc.vite({ module: { type: "es6" } })],
});
