import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Resolve the "@/..." alias to ./src without the ESM-only tsconfig-paths plugin
// (which fails to load under this toolchain).
const srcDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(srcDir, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: true,
    // Unit tests use the in-browser demo backend (no server, no Firebase).
    env: { NEXT_PUBLIC_BACKEND: "offline" },
  },
});
