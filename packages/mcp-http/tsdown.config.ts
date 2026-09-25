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
    deps: { alwaysBundle: [/@letpeoplework\/.*/] },
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
]);
