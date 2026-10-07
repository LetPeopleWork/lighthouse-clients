import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SEEDED_TERMS } from "@letpeoplework/lighthouse-client";
import { describe, expect, it } from "vitest";

// The readable views keep their layers apart by rule, so a rule is checked over the source itself: layout
// only in the CLI's renderers, words only in the client, no locale data in the date code, and every
// configurable word from the instance's terminology rather than a literal.

const here = dirname(fileURLToPath(import.meta.url));
const cliSource = here;
const clientSource = resolve(here, "../../client/src");

const sourcesIn = (directory: string, matches: RegExp): [string, string][] =>
  readdirSync(directory)
    .filter((file) => matches.test(file) && !file.endsWith(".test.ts"))
    .map((file) => [file, readFileSync(resolve(directory, file), "utf8")]);

const withoutComments = (source: string): string =>
  source.replaceAll(/\/\*[\s\S]*?\*\//gu, "").replaceAll(/^\s*\/\/.*$/gmu, "");

const renderers = sourcesIn(cliSource, /Output\.ts$/u);
const wordings = sourcesIn(clientSource, /Wording\.ts$/u);

// This story's new wording and output modules; refinement's predate the shared resolver.
const storyModules = [
  ...sourcesIn(
    clientSource,
    /^(forecastWording|answerWording|calendarDates)\.ts$/u,
  ),
  ...sourcesIn(cliSource, /^(forecastOutput|table)\.ts$/u),
];

const clientMethodCall =
  /\.(get|list|run|create|update|delete|refresh|cast|add|take|check)[A-Z]\w*\s*\(/u;

describe("the readable views keep words, layout and reads apart", () => {
  it("finds the modules it checks", () => {
    expect(renderers.map(([file]) => file)).toContain("forecastOutput.ts");
    expect(wordings.map(([file]) => file)).toContain("forecastWording.ts");
    expect(storyModules).toHaveLength(5);
  });

  it.each(renderers)("%s renders facts and reads nothing", (_file, source) => {
    expect(source).not.toMatch(/from\s+["']\.\/index["']/u);
    expect(source).not.toMatch(clientMethodCall);
  });

  it("pads table cells only in the shared table", () => {
    const padding = sourcesIn(cliSource, /\.ts$/u)
      .filter(([, source]) => source.includes("padEnd("))
      .map(([file]) => file);

    expect(padding).toEqual(["table.ts"]);
  });

  it.each(wordings)(
    "%s words facts and lays out no columns",
    (_file, source) => {
      expect(source).not.toContain("padEnd(");
      expect(source).not.toMatch(/\.join\(\s*(["'`])\s{2,}\1\s*\)/u);
    },
  );

  it("formats calendar days without the runtime's locale data", () => {
    const source = withoutComments(
      readFileSync(resolve(clientSource, "calendarDates.ts"), "utf8"),
    );

    expect(source).not.toMatch(/toLocale\w*|\bIntl\b/u);
  });

  it.each(storyModules)(
    "%s takes every configurable word from the terminology",
    (_file, source) => {
      const code = withoutComments(source);
      const seeded = Object.values(SEEDED_TERMS).filter((word) =>
        new RegExp(`\\b${word}\\b`, "u").test(code),
      );

      expect(seeded).toEqual([]);
    },
  );
});
