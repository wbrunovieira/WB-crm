import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  // Config PostCSS inline vazia: impede o Vite de subir diretórios e achar o
  // postcss.config.mjs da raiz (que requer @tailwindcss/postcss — inexistente
  // quando só backend/node_modules está instalado, como no CI). Backend não tem CSS.
  css: { postcss: { plugins: [] } },
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
