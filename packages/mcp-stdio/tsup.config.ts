import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    bundle: true,
  },
  {
    entry: { bin: "src/bin.ts" },
    format: ["esm", "cjs"],
    dts: false,
    banner: {
      js: "#!/usr/bin/env node",
    },
    bundle: true,
  },
]);
