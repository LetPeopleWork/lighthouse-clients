import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@letpeoplework/lighthouse-client": new URL(
        "./packages/client/src/index.ts",
        import.meta.url,
      ).pathname,
      "@letpeoplework/lighthouse-cli": new URL(
        "./packages/cli/src/index.ts",
        import.meta.url,
      ).pathname,
      "@letpeoplework/lighthouse-mcp-core": new URL(
        "./packages/mcp-core/src/index.ts",
        import.meta.url,
      ).pathname,
      "@letpeoplework/lighthouse-mcp-http": new URL(
        "./packages/mcp-http/src/index.ts",
        import.meta.url,
      ).pathname,
      "@letpeoplework/lighthouse-mcp-stdio": new URL(
        "./packages/mcp-stdio/src/index.ts",
        import.meta.url,
      ).pathname,
    },
  },
  test: {
    include: ["packages/*/src/**/*.test.ts"],
    coverage: {
      enabled: false,
    },
  },
});
