#!/usr/bin/env node
/**
 * Pre-commit changeset gate.
 *
 * Blocks the commit when a staged change touches publishable package source or
 * package manifests (packages/<name>/src/** or packages/<name>/package.json)
 * but does NOT include a new .changeset/*.md file in the same commit.
 *
 * Commits that only affect docs, CI, repo metadata, or .changeset config files
 * pass through without requiring a changeset entry.
 */

import { execSync } from "node:child_process";

const staged = execSync("git diff --cached --name-only", { encoding: "utf-8" })
  .trim()
  .split("\n")
  .filter(Boolean);

/**
 * Paths that indicate a publishable package has been modified and therefore
 * require a changeset entry.  This is intentionally narrow: source files and
 * the package manifest.  Build output and test helpers do not trigger the rule.
 */
const PACKAGE_AFFECTING = /^packages\/[^/]+\/(src\/|package\.json$)/;

const changedPackages = staged
  .filter((f) => PACKAGE_AFFECTING.test(f))
  .map((f) => f.match(/^packages\/([^/]+)\//)[1]);

const uniqueChangedPackages = [...new Set(changedPackages)];

if (uniqueChangedPackages.length === 0) {
  // No publishable package touched — no changeset required.
  process.exit(0);
}

const stagedChangesets = staged.filter((f) =>
  /^\.changeset\/[^/]+\.md$/.test(f),
);

if (stagedChangesets.length > 0) {
  // At least one changeset file is staged — requirement satisfied.
  process.exit(0);
}

console.error("");
console.error("ERROR: Missing changeset entry.");
console.error("");
console.error(
  "The following package(s) have staged changes that require a changeset:",
);
for (const pkg of uniqueChangedPackages) {
  console.error(`  packages/${pkg}`);
}
console.error("");
console.error("Run: pnpm changeset");
console.error(
  "Then stage the generated .changeset/*.md file and commit again.",
);
console.error("");
process.exit(1);
