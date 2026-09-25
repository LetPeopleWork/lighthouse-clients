import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["esm", "cjs"],
    dts: { sourcemap: false },
    sourcemap: false,
    clean: true,
    fixedExtension: false,
    tsconfig: "tsconfig.build.json",
  },
  {
    entry: { bin: "src/bin.ts" },
    format: ["esm"],
    dts: { sourcemap: false },
    sourcemap: false,
    clean: false,
    fixedExtension: false,
    tsconfig: "tsconfig.build.json",
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
  {
    // Self-contained CJS bundle for the MCPB distribution.
    // All dependencies are inlined so the MCPB runs without any npm install or npx.
    entry: { "mcpb-runtime": "src/mcpb-launcher.ts" },
    format: ["cjs"],
    dts: false,
    sourcemap: false,
    clean: false,
    fixedExtension: false,
    deps: { alwaysBundle: [/.*/] },
    platform: "node",
    tsconfig: "tsconfig.build.json",
  },
]);
