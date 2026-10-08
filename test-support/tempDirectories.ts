import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach } from "vitest";

const created: string[] = [];

// Registered once per test file that imports this module, so each test's directories are gone before the next
// test starts. Mutation runs repeat the suite thousands of times, and leftovers once filled /tmp.
afterEach(() => {
  for (const directory of created.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

export const aTempDirectory = (prefix: string): string => {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  created.push(directory);
  return directory;
};
