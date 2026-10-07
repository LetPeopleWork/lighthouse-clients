// An MCP tool as an assistant calls it, through `createMcpCoreRuntime(...).callTool`, against a Lighthouse
// that answers each client read from a table and records every read it was asked for.

import { decode } from "@toon-format/toon";
import {
  ok,
  type Reads,
  refused,
  terminology,
} from "../../../test-support/lighthouseAnswers";
import { createMcpCoreRuntime } from "../src/index";

type Runtime = ReturnType<typeof createMcpCoreRuntime>;
type RuntimeClient = ReturnType<
  Parameters<typeof createMcpCoreRuntime>[0]["createClient"]
>;
export type ToolResult = Awaited<ReturnType<Runtime["callTool"]>>;

export const anAssistantOn = (
  reads: Reads,
  options: {
    readonly reachable?: {
      readonly category: string;
      readonly reason?: string;
    };
  } = {},
) => {
  const asked: string[] = [];
  const answers: Reads = { getTerminology: ok(terminology()), ...reads };
  const client = new Proxy(
    {},
    {
      get: (_target, property) => {
        if (typeof property !== "string" || property === "then") {
          return undefined;
        }
        return async (...args: readonly unknown[]) => {
          asked.push(property);
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
  ) as RuntimeClient;
  const runtime: Runtime = createMcpCoreRuntime({ createClient: () => client });
  return {
    runtime,
    call: (tool: string, argumentsPayload: unknown = {}) =>
      runtime.callTool(tool, argumentsPayload),
    asked: () => [...asked],
  };
};

/** The first text block: the facts, as every assistant reads them today. */
export const factsBlockOf = (result: ToolResult): string =>
  result.content[0]?.text ?? "";

/** The decoded answer object of an object-shaped tool (`label: <TOON>`). */
export const answerOf = (
  result: ToolResult,
  label: string,
): Record<string, unknown> => {
  const text = factsBlockOf(result);
  if (!text.startsWith(label)) {
    throw new Error(`Expected the answer to start with "${label}": ${text}`);
  }
  return decode(text.slice(label.length)) as Record<string, unknown>;
};

/** The second text block a list or scalar answer carries (`summary: …`), or null when there is none. */
export const summaryBlockOf = (result: ToolResult): string | null =>
  result.content[1]?.text ?? null;
