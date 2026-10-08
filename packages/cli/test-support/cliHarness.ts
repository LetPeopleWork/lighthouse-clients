// `lh` as a person runs it, through `runCliCommand`, against a Lighthouse that answers each client read
// from a table and records every read it was asked for. Only Lighthouse is faked.

import {
  ok,
  type Reads,
  refused,
  terminology,
} from "../../../test-support/lighthouseAnswers";
import { type RunCliCommandDependencies, runCliCommand } from "../src/index";

type CliClient = ReturnType<RunCliCommandDependencies["createClient"]>;

type Connection =
  | { readonly mode: "server"; readonly endpointUrl: string }
  | { readonly mode: "standalone" };

export type Call = { readonly read: string; readonly args: readonly unknown[] };

export const aLighthouse = (
  reads: Reads,
  options: {
    readonly connection?: Connection;
    readonly reachable?: {
      readonly category: string;
      readonly reason?: string;
    };
    readonly payloadFiles?: Readonly<Record<string, string>>;
  } = {},
) => {
  const calls: Call[] = [];
  // The instance's Terminology answers as seeded unless a scenario says otherwise.
  const answers: Reads = { getTerminology: ok(terminology()), ...reads };
  const client = new Proxy(
    {},
    {
      get: (_target, property) => {
        if (typeof property !== "string" || property === "then") {
          return undefined;
        }
        return async (...args: readonly unknown[]) => {
          calls.push({ read: property, args });
          if (property === "checkConnectivity") {
            return options.reachable ?? { category: "success" };
          }
          const answer = answers[property];
          if (typeof answer === "function") {
            return answer(...args);
          }
          return (
            answer ??
            refused(
              "unexpected",
              `${property} is not answered in this scenario`,
            )
          );
        };
      },
    },
  ) as CliClient;

  const connection = options.connection ?? {
    mode: "server",
    endpointUrl: "https://lighthouse.letpeoplework.com",
  };

  const dependencies: RunCliCommandDependencies = {
    loadConnection: async () =>
      connection.mode === "server"
        ? { ...connection, authMode: "disabled" }
        : { mode: "standalone", authMode: "disabled" },
    saveConnection: async () => undefined,
    loadOutputFormat: async () => null,
    saveOutputFormat: async () => undefined,
    readTextFile: async (filePath: string) => {
      const content = options.payloadFiles?.[filePath];
      if (content === undefined) {
        throw new Error(`File not mocked: ${filePath}`);
      }
      return content;
    },
    prompt: async () => "",
    validateConnectivity: async () => ({
      category: "unreachable",
      reason: "not used",
    }),
    validateStandaloneDiscovery: async () => ({
      category: "unreachable",
      reason: "not used",
    }),
    createClient: () => client,
  } as RunCliCommandDependencies;

  return {
    run: (args: readonly string[]) => runCliCommand(args, dependencies),
    /** The reads Lighthouse was asked for, in order, by client method name. */
    asked: () => calls.map((call) => call.read),
    calls: () => [...calls],
  };
};

// The output as a reader sees it: one entry per printed line, runs of spaces read as one.
export const shownLines = (stdout: string): string[] =>
  stdout
    .split("\n")
    .map((line) => line.replaceAll(/\s+/gu, " ").trim())
    .filter((line) => line.length > 0);

// The output as prose, so a sentence wrapped over two lines still reads as one sentence.
export const prose = (stdout: string): string =>
  stdout.replaceAll(/\s+/gu, " ").trim();

// What a renderer must never leak: a missing fact printed as a word instead of being left out.
export const NEVER_PRINTED = ["undefined", "NaN", "null", "[object Object]"];

// The generic view's tell: wire names printed as `camelCase:` keys.
export const looksLikeTheGenericView = (stdout: string): boolean =>
  /^\s*[a-z][A-Za-z]*:/mu.test(stdout);

// Runs `body` with the reader's clock in another time zone. Node takes a TZ change at runtime.
export const inTimeZone = async <T>(
  zone: string,
  body: () => Promise<T>,
): Promise<T> => {
  const readersZone = process.env.TZ;
  process.env.TZ = zone;
  try {
    return await body();
  } finally {
    if (readersZone === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = readersZone;
    }
  }
};
