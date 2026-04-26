import { readFileSync, writeFileSync } from "fs";

const files = ["dist/bin.cjs", "dist/bin.js"];
for (const f of files) {
  const content = readFileSync(f, "utf8");
  if (!content.startsWith("#!/usr/bin/env node")) {
    writeFileSync(f, "#!/usr/bin/env node\n" + content);
  }
}