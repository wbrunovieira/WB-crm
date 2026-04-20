import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@test": resolve(__dirname, "test"),
    },
  },
  test: {
    globals: true,
    root: "./",
    include: ["src/**/*.spec.ts", "test/unit/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**"],
      exclude: ["src/**/*.spec.ts", "src/main.ts"],
    },
  },
  plugins: [swc.vite({ module: { type: "es6" } })],
});
