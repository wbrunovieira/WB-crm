import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

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
  },
  plugins: [swc.vite({ module: { type: "es6" } })],
});
