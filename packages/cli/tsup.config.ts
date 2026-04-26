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
    format: ["esm", "cjs"],
    dts: true,
    tsconfig: "tsconfig.build.json",
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
]);
