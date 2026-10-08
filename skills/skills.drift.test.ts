// The skills are text an assistant reads to learn what the clients can do. This test holds that text to what
// exists: the general skill names every MCP tool, every `lh` command and every `--metrics` key, and no skill
// names one that does not exist. What exists is read the way a user meets it - the tool list an MCP server
// announces and the help `lh` prints - so a refactor of either package cannot fool it.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  type RunCliCommandDependencies,
  runCliCommand,
} from "@letpeoplework/lighthouse-cli";
import { createMcpCoreRuntime } from "@letpeoplework/lighthouse-mcp-core";
import { describe, expect, it } from "vitest";
import { aLighthouse } from "../packages/cli/test-support/cliHarness";

const REPOSITORY = new URL("..", import.meta.url).pathname;

// `lh help` prints the overview again; it has nothing of its own to explain.
const EXEMPT_COMMANDS = new Set(["lh help"]);

// ── What exists ─────────────────────────────────────────────────────────────

type Catalogue = {
  readonly tools: ReadonlySet<string>;
  readonly groups: ReadonlySet<string>;
  /** Every `lh <group> <subcommand>` the help prints, plus each group that has none. */
  readonly commands: ReadonlySet<string>;
  readonly metricKeys: ReadonlySet<string>;
  /** True when `lh` takes this `--metrics` value, canonical or alias. */
  readonly takesMetric: (key: string) => Promise<boolean>;
};

// Help never needs a connection, a stored output format or a client.
const helpOnly = {
  loadConnection: async () => null,
  saveConnection: async () => undefined,
  loadOutputFormat: async () => null,
  saveOutputFormat: async () => undefined,
  readTextFile: async () => "",
  prompt: async () => "",
  openBrowser: async () => undefined,
  validateConnectivity: async () => ({
    category: "unreachable",
    reason: "help needs no connection",
  }),
  validateStandaloneDiscovery: async () => ({
    category: "unreachable",
    reason: "help needs no connection",
  }),
  createClient: () => {
    throw new Error("help needs no client");
  },
} as unknown as RunCliCommandDependencies;

const printedHelp = async (args: readonly string[]): Promise<string> => {
  const result = await runCliCommand(args, helpOnly);
  return `${result.stdout}\n${result.stderr}`;
};

const groupsIn = (overview: string): string[] => {
  const section = overview.split("Top-level groups:")[1] ?? "";
  const lines = section.split("\n").slice(1);
  const end = lines.findIndex((line) => line.trim().length === 0);
  return lines
    .slice(0, end === -1 ? lines.length : end)
    .map((line) => line.trim())
    .filter((line) => /^[a-z][a-z-]*$/u.test(line));
};

const subcommandsIn = (group: string, help: string): string[] =>
  [...help.matchAll(/^\s*lh (\S+) (\S+)/gmu)]
    .filter(
      ([, printedGroup, subcommand]) =>
        printedGroup === group && /^[a-z][a-z-]*$/u.test(subcommand ?? ""),
    )
    .map(([, , subcommand]) => `lh ${group} ${subcommand}`);

const metricKeysIn = (help: string): string[] =>
  (/^Allowed metrics: (.+)$/mu.exec(help)?.[1] ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter((key) => key.length > 0);

const metricsProbe = aLighthouse({});

const readCatalogue = async (): Promise<Catalogue> => {
  const tools = createMcpCoreRuntime({
    createClient: () => {
      throw new Error("listing tools needs no client");
    },
  })
    .listTools()
    .map((tool) => tool.name);
  const groups = groupsIn(await printedHelp([]));
  const commands: string[] = [];
  for (const group of groups) {
    const ofGroup = subcommandsIn(group, await printedHelp([group]));
    commands.push(...(ofGroup.length === 0 ? [`lh ${group}`] : ofGroup));
  }
  return {
    tools: new Set(tools),
    groups: new Set(groups),
    commands: new Set(commands),
    metricKeys: new Set(metricKeysIn(await printedHelp(["metrics"]))),
    takesMetric: async (key) => {
      const result = await metricsProbe.run([
        "metrics",
        "team",
        "--id",
        "1",
        "--metrics",
        key,
        "--json",
      ]);
      return !result.stderr.includes("Unknown metric");
    },
  };
};

// ── What a skill says ───────────────────────────────────────────────────────

type SkillFile = { readonly path: string; readonly text: string };

/** A piece of code-formatted text and the line it starts on. */
type Span = { readonly text: string; readonly line: number };

/** Fenced blocks line by line, and every `inline` span outside them: where a skill names a tool or command. */
const codeSpansIn = (text: string): Span[] => {
  const spans: Span[] = [];
  let fenced = false;
  text.split("\n").forEach((content, index) => {
    const line = index + 1;
    if (content.trimStart().startsWith("```")) {
      fenced = !fenced;
      return;
    }
    if (fenced) {
      spans.push({ text: content, line });
      return;
    }
    for (const match of content.matchAll(/`([^`]+)`/gu)) {
      spans.push({ text: match[1] ?? "", line });
    }
  });
  return spans;
};

const toolsNamedIn = (span: string): string[] =>
  [...span.matchAll(/\blighthouse_[A-Za-z0-9_]+\*?/gu)].map(([name]) => name);

/** `lh <group>` or `lh <group> <subcommand>`; a flag or placeholder after the group names the group alone. */
const commandsNamedIn = (span: string): string[] =>
  [
    ...span.matchAll(
      /(?:^|[\s`($;|&])lh\s+([a-z][a-z-]*)(?:[ \t]+([a-z][a-z-]*))?/gu,
    ),
  ].map(([, group, subcommand]) =>
    subcommand === undefined ? `lh ${group}` : `lh ${group} ${subcommand}`,
  );

const metricKeysNamedIn = (span: string): string[] =>
  [...span.matchAll(/--metrics\s+([A-Za-z][A-Za-z,]*)/gu)].flatMap(([, keys]) =>
    (keys ?? "")
      .split(",")
      .map((key) => key.trim())
      .filter((key) => key.length > 0),
  );

// ── The rules ───────────────────────────────────────────────────────────────

const mentions = (text: string, name: string): boolean =>
  new RegExp(
    `(?<![A-Za-z0-9_-])${name.replaceAll(/\s+/gu, "\\s+")}(?![A-Za-z0-9_-])`,
    "u",
  ).test(text);

/** Everything that exists and the general skill never names, sorted. */
const missingFromTheGeneralSkill = (
  catalogue: Omit<Catalogue, "takesMetric">,
  files: readonly SkillFile[],
): string[] => {
  const text = files.map((file) => file.text).join("\n");
  const keysNamed = new Set(
    files
      .flatMap((file) => codeSpansIn(file.text))
      .flatMap((span) => metricKeysNamedIn(span.text))
      .map((key) => key.toLowerCase()),
  );
  return [
    ...[...catalogue.tools].filter((tool) => !mentions(text, tool)),
    ...[...catalogue.commands].filter(
      (command) => !EXEMPT_COMMANDS.has(command) && !mentions(text, command),
    ),
    ...[...catalogue.metricKeys]
      .filter((key) => !keysNamed.has(key.toLowerCase()))
      .map((key) => `--metrics ${key}`),
  ].sort();
};

/** Every name a skill uses that does not exist, as `<name> (<file>:<line>)`, sorted. */
const unknownNamesIn = async (
  catalogue: Catalogue,
  files: readonly SkillFile[],
): Promise<string[]> => {
  const offenders: string[] = [];
  for (const file of files) {
    for (const span of codeSpansIn(file.text)) {
      const where = `${file.path}:${span.line}`;
      for (const tool of toolsNamedIn(span.text)) {
        const family = tool.endsWith("*") || tool.endsWith("_");
        const known = family
          ? [...catalogue.tools].some((name) =>
              name.startsWith(tool.replace(/\*$/u, "")),
            )
          : catalogue.tools.has(tool);
        if (!known) {
          offenders.push(`${tool} (${where})`);
        }
      }
      for (const command of commandsNamedIn(span.text)) {
        const [, group = "", subcommand] = command.split(" ");
        const known =
          subcommand === undefined
            ? catalogue.groups.has(group)
            : catalogue.commands.has(command);
        if (!known) {
          offenders.push(`${command} (${where})`);
        }
      }
      for (const key of metricKeysNamedIn(span.text)) {
        if (!(await catalogue.takesMetric(key))) {
          offenders.push(`--metrics ${key} (${where})`);
        }
      }
    }
  }
  return offenders.sort();
};

/** A skill folder whose SKILL.md is missing, or whose `name` is not the name it ships under, or has no description. */
const frontmatterProblemsOf = (
  folder: string,
  expectedName: string,
): string[] => {
  const skillFile = join(folder, "SKILL.md");
  const shown = relative(REPOSITORY, folder);
  if (!existsSync(skillFile)) {
    return [`${shown}: no SKILL.md`];
  }
  const frontmatter =
    /^---\n([\s\S]*?)\n---/u.exec(readFileSync(skillFile, "utf8"))?.[1] ?? "";
  const name = /^name:\s*(\S+)\s*$/mu.exec(frontmatter)?.[1];
  const problems: string[] = [];
  if (name !== expectedName) {
    problems.push(
      `${shown}: name is ${name ?? "missing"}, expected ${expectedName}`,
    );
  }
  if (!/^description:\s*\S/mu.test(frontmatter)) {
    problems.push(`${shown}: no description`);
  }
  return problems;
};

// ── Where the skills are ────────────────────────────────────────────────────

const SKILLS = join(REPOSITORY, "skills");

// The general skill moves from skill/ to skills/lighthouse/ when the second skill arrives; it ships as
// lighthouse-skill.zip either way.
const generalSkillFolder = (): string =>
  existsSync(join(SKILLS, "lighthouse", "SKILL.md"))
    ? join(SKILLS, "lighthouse")
    : join(REPOSITORY, "skill");

const skillFolders = (): { folder: string; name: string }[] => {
  const general = generalSkillFolder();
  const others = existsSync(SKILLS)
    ? readdirSync(SKILLS)
        .map((entry) => join(SKILLS, entry))
        .filter((path) => statSync(path).isDirectory() && path !== general)
    : [];
  return [
    { folder: general, name: "lighthouse" },
    ...others.map((folder) => ({
      folder,
      name: relative(SKILLS, folder),
    })),
  ];
};

const textOf = (folder: string): SkillFile[] => {
  const references = join(folder, "references");
  const paths = [
    join(folder, "SKILL.md"),
    ...(existsSync(references)
      ? readdirSync(references)
          .filter((entry) => entry.endsWith(".md"))
          .sort()
          .map((entry) => join(references, entry))
      : []),
  ].filter((path) => existsSync(path));
  return paths.map((path) => ({
    path: relative(REPOSITORY, path),
    text: readFileSync(path, "utf8"),
  }));
};

// ── The checks ──────────────────────────────────────────────────────────────

describe("what the clients offer is read from them, not from a list kept by hand", () => {
  // @driving_port @real-io @contract-shape:pure-function
  // An empty set would let every other check pass while checking nothing, so a change to the help's
  // layout has to fail here first.
  it("finds a known tool, group, subcommand and metric in what the clients announce", async () => {
    const catalogue = await readCatalogue();

    expect(catalogue.tools.has("lighthouse_team_list")).toBe(true);
    expect(catalogue.groups.has("metrics")).toBe(true);
    expect(catalogue.commands.has("lh refinement vote")).toBe(true);
    expect(catalogue.metricKeys.has("wip")).toBe(true);
    expect(catalogue.tools.size).toBeGreaterThanOrEqual(45);
  });

  // @error @contract-shape:pure-function
  it("tells a metric alias lh takes from a word it refuses", async () => {
    const catalogue = await readCatalogue();

    expect(await catalogue.takesMetric("cycletime")).toBe(true);
    expect(await catalogue.takesMetric("pbcovertime")).toBe(true);
    expect(await catalogue.takesMetric("flowEfficiency")).toBe(false);
  });
});

describe("the check names what is wrong, so the failing test says what to fix", () => {
  const catalogue = {
    tools: new Set([
      "lighthouse_team_list",
      "lighthouse_team_metrics_flowEfficiency",
    ]),
    groups: new Set(["team", "metrics", "help"]),
    commands: new Set(["lh team list", "lh metrics team", "lh help"]),
    metricKeys: new Set(["throughput", "wip"]),
    takesMetric: async (key: string) =>
      ["throughput", "wip", "cycletime"].includes(key.toLowerCase()),
  };
  const aSkill = (text: string): SkillFile[] => [
    { path: "skills/lighthouse/SKILL.md", text },
  ];

  // @error @contract-shape:pure-function
  it("names a tool that exists and that the general skill never mentions", () => {
    const missing = missingFromTheGeneralSkill(
      catalogue,
      aSkill(
        "Use `lighthouse_team_list`, `lh team list` and `lh metrics team --metrics throughput,wip`.",
      ),
    );

    expect(missing).toEqual(["lighthouse_team_metrics_flowEfficiency"]);
  });

  // @error @contract-shape:pure-function
  it("names an lh command and a metric key the general skill never mentions", () => {
    const missing = missingFromTheGeneralSkill(
      catalogue,
      aSkill(
        "`lighthouse_team_list` and `lighthouse_team_metrics_flowEfficiency`, `lh team list`.",
      ),
    );

    expect(missing).toEqual([
      "--metrics throughput",
      "--metrics wip",
      "lh metrics team",
    ]);
  });

  // @error @contract-shape:pure-function
  it("names a tool, a command and a metric that do not exist, with the file and line they are on", async () => {
    const unknown = await unknownNamesIn(
      catalogue,
      aSkill(
        [
          "Read it with `lighthouse_team_metrics_velocity`.",
          "```",
          "lh feature list",
          "lh metrics team --id 3 --metrics throughput,storyPoints",
          "```",
        ].join("\n"),
      ),
    );

    expect(unknown).toEqual([
      "--metrics storyPoints (skills/lighthouse/SKILL.md:4)",
      "lh feature list (skills/lighthouse/SKILL.md:3)",
      "lighthouse_team_metrics_velocity (skills/lighthouse/SKILL.md:1)",
    ]);
  });

  // @contract-shape:pure-function
  it("accepts a family of tools, an alias, a flag after the group and a name in prose", async () => {
    const unknown = await unknownNamesIn(
      catalogue,
      aSkill(
        [
          "Any `lighthouse_team_metrics_*` tool; `lh metrics --metrics cycletime`.",
          "In prose lh frobnicate is not a command, and neither is lighthouse_nothing.",
          "```",
          "lh team list --json",
          "```",
        ].join("\n"),
      ),
    );

    expect(unknown).toEqual([]);
  });
});

describe("the skills and the clients agree", () => {
  // @walking_skeleton @driving_port @real-io @contract-shape:pure-function
  // An assistant told to run a command that does not exist fails in front of the user, so no skill may name one.
  it("no skill names a tool, an lh command or a metric that does not exist", async () => {
    const catalogue = await readCatalogue();
    const files = skillFolders().flatMap(({ folder }) => textOf(folder));

    expect(await unknownNamesIn(catalogue, files)).toEqual([]);
  });

  // @driving_port @real-io @contract-shape:pure-function
  // A read the general skill never names is a read assistants do not find, so every one must appear in it.
  it("the general skill names every MCP tool, every lh command and every metric key", async () => {
    const catalogue = await readCatalogue();

    expect(
      missingFromTheGeneralSkill(catalogue, textOf(generalSkillFolder())),
    ).toEqual([]);
  });

  // @driving_port @real-io @contract-shape:pure-function
  // The zip a skill ships in is named after its folder, and assistants import a skill under its `name`.
  it("every skill folder has a SKILL.md whose name is the name it ships under", () => {
    const problems = skillFolders().flatMap(({ folder, name }) =>
      frontmatterProblemsOf(folder, name),
    );

    expect(problems).toEqual([]);
  });
});
