import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
  },
  {
    entry: { bin: "src/bin.ts" },
    format: ["esm"],
    dts: true,
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
]);
