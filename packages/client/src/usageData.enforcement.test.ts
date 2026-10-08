import { readdirSync, readFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { UsageDataEvent } from "./usageData";

// Rules that keep usage data honest, checked over the source rather than trusted to review: one place
// talks to Lighthouse about it, the code that sends it can never print, the lock is written once, and
// nothing a person typed can ride along in an event.

const PACKAGES = fileURLToPath(new URL("../../", import.meta.url));

const productionSources = (): readonly string[] =>
  readdirSync(PACKAGES).flatMap((name) => {
    const source = join(PACKAGES, name, "src");
    let paths: readonly string[];
    try {
      paths = readdirSync(source, { recursive: true, encoding: "utf8" });
    } catch {
      return [];
    }
    return paths
      .filter((path) => path.endsWith(".ts") && !path.endsWith(".test.ts"))
      .map((path) => join(source, path));
  });

const sourcesSaying = (pattern: RegExp): readonly string[] =>
  productionSources()
    .filter((path) => pattern.test(readFileSync(path, "utf8")))
    .map((path) => relative(PACKAGES, path).replaceAll("\\", "/"));

describe("usage data stays where it belongs", () => {
  it("is asked of Lighthouse only by the client package", () => {
    const callers = sourcesSaying(/\/usagedata\//u);

    expect(callers.length).toBeGreaterThan(0);
    expect(callers.filter((path) => !path.startsWith("client/src/"))).toEqual(
      [],
    );
  });

  it("is handled by code that never writes to the console or the process's streams", () => {
    const loud = sourcesSaying(/console\.|process\.std(out|err)/u).filter(
      (path) =>
        /^client\/src\/usageData[^/]*\.ts$/u.test(path) ||
        path === "mcp-core/src/usageDataPort.ts",
    );

    expect(loud).toEqual([]);
  });

  it("is kept under a lock that only the owner-only file takes", () => {
    const lockers = sourcesSaying(/\.lock/u)
      .filter((path) =>
        /["']wx["']/u.test(readFileSync(join(PACKAGES, path), "utf8")),
      )
      .map((path) => basename(path));

    expect(lockers).toEqual(["ownerOnlyJsonFile.ts"]);
  });

  it("carries no field a person could have typed", () => {
    // One event kind at a time: across the whole union only the fields every kind shares would be seen.
    type OpenFields<Shape> = Shape extends unknown
      ? {
          [Field in keyof Shape]-?: string extends Shape[Field]
            ? Field
            : Shape[Field] extends string | number | boolean
              ? never
              : Field;
        }[keyof Shape]
      : never;

    expectTypeOf<OpenFields<UsageDataEvent>>().toEqualTypeOf<never>();
  });
});
