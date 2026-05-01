import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    bundle: true,
    tsconfig: "tsconfig.build.json",
  },
  {
    entry: { bin: "src/bin.ts" },
    format: ["esm"],
    dts: false,
    banner: {
      js: "#!/usr/bin/env node",
    },
    bundle: true,
    tsconfig: "tsconfig.build.json",
  },
]);
