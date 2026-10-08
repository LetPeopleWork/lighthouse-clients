// Each skill's eval cases are the specification of what an assistant does with it. The maintainer runs them
// by hand before a release, against the Lighthouse each case's fixture describes. A case that names a tool
// that was renamed, or a fixture that is not there, would only be noticed in the middle of that run, so
// this test reads every case and every fixture on every commit.
//
// A skill's cases live in its folder. Cases written before their skill exists wait under
// test-support/pending-skill-evals/<skill>/ and move into skills/<skill>/evals/ with the skill's SKILL.md,
// because a skill folder without one would not pack.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import {
  type RunCliCommandDependencies,
  runCliCommand,
} from "@letpeoplework/lighthouse-cli";
import { createMcpCoreRuntime } from "@letpeoplework/lighthouse-mcp-core";
import { describe, expect, it } from "vitest";

const REPOSITORY = new URL("..", import.meta.url).pathname;

// The reads this feature adds to the clients; a case may name them before they exist.
const TOOLS_STILL_TO_COME = new Set([
  "lighthouse_team_metrics_wip",
  "lighthouse_team_metrics_sleRisk",
  "lighthouse_team_metrics_processBehaviorChart",
  "lighthouse_portfolio_metrics_processBehaviorChart",
]);

// Where an eval is run, as the release's environment list names them.
const ENVIRONMENTS = new Set([
  "clean",
  "with-stale-general-skill",
  "with-prokanban-skill",
  "with-older-clients",
  "with-older-lighthouse",
]);

const STORIES = new Set(["6245", "6217", "6246"]);
const KINDS = new Set(["positive", "neighbour", "negative"]);
const SURFACES = new Set(["mcp", "lh"]);

type EvalCase = {
  readonly id?: unknown;
  readonly story?: unknown;
  readonly kind?: unknown;
  readonly guardrail?: unknown;
  readonly surface?: unknown;
  readonly fixture?: unknown;
  readonly environment?: unknown;
  readonly prompt?: unknown;
  readonly followUps?: unknown;
  readonly tools?: {
    readonly required?: unknown;
    readonly forbidden?: unknown;
    readonly notBefore?: { readonly tool?: unknown; readonly turn?: unknown };
  };
  readonly commands?: {
    readonly required?: unknown;
    readonly forbidden?: unknown;
  };
  readonly answer?: {
    readonly mustContain?: unknown;
    readonly mustNotContain?: unknown;
    readonly checks?: unknown;
  };
};

type CaseFile = {
  readonly skill: string;
  readonly path: string;
  readonly cases: readonly EvalCase[];
};

const caseFilesUnder = (folder: string, skillOf: (entry: string) => string) =>
  existsSync(folder)
    ? readdirSync(folder)
        .map((entry) => ({
          skill: skillOf(entry),
          path: join(folder, entry, "evals", "cases.json"),
        }))
        .filter(({ path }) => existsSync(path))
    : [];

const caseFiles = (): CaseFile[] => {
  const located = [
    { skill: "lighthouse", path: join(REPOSITORY, "skill/evals/cases.json") },
    ...caseFilesUnder(join(REPOSITORY, "skills"), (entry) => entry),
    ...(existsSync(join(REPOSITORY, "test-support/pending-skill-evals"))
      ? readdirSync(join(REPOSITORY, "test-support/pending-skill-evals")).map(
          (entry) => ({
            skill: entry,
            path: join(
              REPOSITORY,
              "test-support/pending-skill-evals",
              entry,
              "cases.json",
            ),
          }),
        )
      : []),
  ].filter(({ path }) => existsSync(path));
  return located.map(({ skill, path }) => ({
    skill,
    path,
    cases: JSON.parse(readFileSync(path, "utf8")) as EvalCase[],
  }));
};

const isText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isTextList = (value: unknown): boolean =>
  value === undefined || (Array.isArray(value) && value.every(isText));

const asList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter(isText) : [];

const fixturePathOf = (file: CaseFile, fixture: string): string =>
  join(dirname(file.path), "fixtures", `${fixture}.json`);

/** What is wrong with one case, as `<file> <id>: <problem>`. */
const problemsOf = (file: CaseFile, entry: EvalCase): string[] => {
  const where = `${relative(REPOSITORY, file.path)} ${String(entry.id)}`;
  const problems: string[] = [];
  const check = (holds: boolean, problem: string) => {
    if (!holds) {
      problems.push(`${where}: ${problem}`);
    }
  };
  check(isText(entry.id), "no id");
  check(STORIES.has(String(entry.story)), "story is not 6245, 6217 or 6246");
  check(
    KINDS.has(String(entry.kind)),
    "kind is not positive, neighbour or negative",
  );
  check(typeof entry.guardrail === "boolean", "guardrail is not true or false");
  check(SURFACES.has(String(entry.surface)), "surface is not mcp or lh");
  check(isText(entry.prompt), "no prompt");
  check(isTextList(entry.followUps), "followUps is not a list of messages");
  check(
    entry.environment === undefined ||
      ENVIRONMENTS.has(String(entry.environment)),
    `environment ${String(entry.environment)} is not one the release names`,
  );
  check(
    isText(entry.fixture) &&
      existsSync(fixturePathOf(file, String(entry.fixture))),
    `fixture ${String(entry.fixture)} is not in fixtures/`,
  );
  for (const list of [
    entry.tools?.required,
    entry.tools?.forbidden,
    entry.commands?.required,
    entry.commands?.forbidden,
    entry.answer?.mustContain,
    entry.answer?.mustNotContain,
    entry.answer?.checks,
  ]) {
    check(isTextList(list), "a list holds something other than text");
  }
  const notBefore = entry.tools?.notBefore;
  check(
    notBefore === undefined ||
      (isText(notBefore.tool) &&
        Number.isInteger(notBefore.turn) &&
        Number(notBefore.turn) >= 2 &&
        Number(notBefore.turn) <= asList(entry.followUps).length + 1),
    "notBefore names no tool or a turn the conversation does not have",
  );
  const scoredFromEvidence =
    asList(entry.tools?.forbidden).length > 0 ||
    notBefore !== undefined ||
    asList(entry.commands?.forbidden).length > 0 ||
    asList(entry.answer?.mustNotContain).length > 0;
  check(
    entry.guardrail !== true || scoredFromEvidence,
    "a guardrail needs something scored from the transcript or the request log, not only a judgement",
  );
  const hasExpectation =
    asList(entry.tools?.required).length +
      asList(entry.tools?.forbidden).length +
      asList(entry.commands?.required).length +
      asList(entry.commands?.forbidden).length +
      asList(entry.answer?.mustContain).length +
      asList(entry.answer?.mustNotContain).length +
      asList(entry.answer?.checks).length >
    0;
  check(hasExpectation, "says nothing about what should happen");
  return problems;
};

const toolsNamedBy = (entry: EvalCase): string[] => [
  ...asList(entry.tools?.required),
  ...asList(entry.tools?.forbidden),
  ...asList([entry.tools?.notBefore?.tool]),
];

const helpOnly = {
  loadConnection: async () => null,
  saveConnection: async () => undefined,
  loadOutputFormat: async () => null,
  saveOutputFormat: async () => undefined,
  readTextFile: async () => "",
  prompt: async () => "",
  openBrowser: async () => undefined,
  validateConnectivity: async () => ({ category: "unreachable", reason: "" }),
  validateStandaloneDiscovery: async () => ({
    category: "unreachable",
    reason: "",
  }),
  createClient: () => {
    throw new Error("help needs no client");
  },
} as unknown as RunCliCommandDependencies;

/** True when `lh` prints a usage line that begins with `command`; `on|off` in the help offers either word. */
const lhKnows = async (command: string): Promise<boolean> => {
  const words = command.split(" ");
  const help = await runCliCommand([words[1] ?? ""], helpOnly);
  return `${help.stdout}\n${help.stderr}`.split("\n").some((line) => {
    const printed = line.trim().split(/\s+/u);
    return words.every((word, index) =>
      (printed[index] ?? "").split("|").includes(word),
    );
  });
};

const toolsThatExist = (): Set<string> =>
  new Set(
    createMcpCoreRuntime({
      createClient: () => {
        throw new Error("listing tools needs no client");
      },
    })
      .listTools()
      .map((tool) => tool.name),
  );

describe("every skill's eval cases can be run as written", () => {
  // @contract-shape:pure-function
  // An empty set of files would make every check below pass while checking nothing.
  it("finds the cases of all three skills", () => {
    expect(
      caseFiles()
        .map((file) => file.skill)
        .sort(),
    ).toEqual([
      "lighthouse",
      "lighthouse-daily-flow-review",
      "lighthouse-refinement",
    ]);
  });

  // @error @contract-shape:pure-function
  it("every case says who it is for, where it runs, against which Lighthouse, and what must happen", () => {
    const problems = caseFiles().flatMap((file) =>
      file.cases.flatMap((entry) => problemsOf(file, entry)),
    );

    expect(problems).toEqual([]);
  });

  // @error @contract-shape:pure-function
  it("no two cases of one skill share an id", () => {
    const repeated = caseFiles().flatMap((file) => {
      const ids = file.cases.map((entry) => String(entry.id));
      return ids
        .filter((id, index) => ids.indexOf(id) !== index)
        .map((id) => `${file.skill} ${id}`);
    });

    expect(repeated).toEqual([]);
  });

  // @contract-shape:pure-function
  // A skill is tested where it should answer, where a neighbouring skill should, and where it must refuse.
  it("every skill has positive, neighbouring and negative cases", () => {
    const missing = caseFiles().flatMap((file) =>
      [...KINDS]
        .filter((kind) => !file.cases.some((entry) => entry.kind === kind))
        .map((kind) => `${file.skill}: no ${kind} case`),
    );

    expect(missing).toEqual([]);
  });

  // @error @contract-shape:pure-function
  it("every case names only tools that exist or that this release adds", () => {
    const existing = toolsThatExist();
    const unknown = caseFiles().flatMap((file) =>
      file.cases.flatMap((entry) =>
        toolsNamedBy(entry)
          .filter(
            (tool) => !existing.has(tool) && !TOOLS_STILL_TO_COME.has(tool),
          )
          .map((tool) => `${file.skill} ${String(entry.id)}: ${tool}`),
      ),
    );

    expect(unknown).toEqual([]);
  });

  // @error @contract-shape:pure-function
  it("every case names only lh commands that exist", async () => {
    const unknown: string[] = [];
    for (const file of caseFiles()) {
      for (const entry of file.cases) {
        for (const command of [
          ...asList(entry.commands?.required),
          ...asList(entry.commands?.forbidden),
        ]) {
          if (!(await lhKnows(command))) {
            unknown.push(`${file.skill} ${String(entry.id)}: ${command}`);
          }
        }
      }
    }

    expect(unknown).toEqual([]);
  });

  // @contract-shape:pure-function
  // Pending until the clients carry the WIP, SLE Risk and chart reads; then nothing is still to come.
  it.skip("every tool a case names exists in the clients", () => {
    const existing = toolsThatExist();
    const unknown = caseFiles().flatMap((file) =>
      file.cases.flatMap((entry) =>
        toolsNamedBy(entry).filter((tool) => !existing.has(tool)),
      ),
    );

    expect(unknown).toEqual([]);
  });
});

describe("every fixture is a Lighthouse the eval server can play", () => {
  const fixtures = () =>
    caseFiles().flatMap((file) => {
      const folder = join(dirname(file.path), "fixtures");
      return existsSync(folder)
        ? readdirSync(folder)
            .filter((entry) => entry.endsWith(".json"))
            .map((entry) => ({
              name: `${file.skill}/${basename(entry, ".json")}`,
              fixture: JSON.parse(
                readFileSync(join(folder, entry), "utf8"),
              ) as { version?: unknown; routes?: Record<string, unknown> },
            }))
        : [];
    });

  // @error @contract-shape:pure-function
  // The version decides which reads the client lets through; a route is a method and a path without its
  // query, because the server answers whatever the query asks.
  it("names its Lighthouse version and answers routes by method and path", () => {
    const problems = fixtures().flatMap(({ name, fixture }) => [
      ...(isText(fixture.version) && /^v\d+(\.\d+)+$/u.test(fixture.version)
        ? []
        : [`${name}: version ${String(fixture.version)}`]),
      ...Object.keys(fixture.routes ?? {})
        .filter(
          (route) => !/^(GET|POST|PUT|DELETE) \/api\/v1\/[^?\s]+$/u.test(route),
        )
        .map((route) => `${name}: ${route}`),
    ]);

    expect(problems).toEqual([]);
  });

  // @error @contract-shape:pure-function
  // Every answer is worded in the instance's terms and every tool asks how the instance signs in, so a
  // fixture without these would put a 404 in front of every case.
  it("answers the Terminology and sign-in reads every case makes", () => {
    const missing = fixtures().flatMap(({ name, fixture }) =>
      ["GET /api/v1/terminology/all", "GET /api/v1/auth/mode"]
        .filter((route) => fixture.routes?.[route] === undefined)
        .map((route) => `${name}: ${route}`),
    );

    expect(missing).toEqual([]);
  });

  // @contract-shape:pure-function
  it("every fixture is used by at least one case", () => {
    const used = new Set(
      caseFiles().flatMap((file) =>
        file.cases.map((entry) => `${file.skill}/${String(entry.fixture)}`),
      ),
    );

    expect(
      fixtures()
        .map(({ name }) => name)
        .filter((name) => !used.has(name)),
    ).toEqual([]);
  });
});
