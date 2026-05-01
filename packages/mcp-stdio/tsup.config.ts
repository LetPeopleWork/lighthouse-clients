import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    tsconfig: "tsconfig.build.json",
  },
  {
    entry: { bin: "src/bin.ts" },
    format: ["esm"],
    dts: true,
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
    noExternal: [/.*/],
    platform: "node",
    tsconfig: "tsconfig.build.json",
  },
]);
