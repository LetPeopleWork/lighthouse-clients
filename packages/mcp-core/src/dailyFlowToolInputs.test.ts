import { describe, expect, it } from "vitest";
import { anAssistantOn } from "../test-support/mcpHarness";
import { registerMcpTools } from "./index";

// What the daily-flow tools take from an assistant: a question they cannot answer is refused before
// Lighthouse is asked anything, and the schemas an assistant is shown say what each tool needs.

const WIP = "lighthouse_team_metrics_wip";
const SLE_RISK = "lighthouse_team_metrics_sleRisk";
const TEAM_CHART = "lighthouse_team_metrics_processBehaviorChart";
const PORTFOLIO_CHART = "lighthouse_portfolio_metrics_processBehaviorChart";

const TEAM_CHART_TYPES = [
  "Throughput",
  "WorkItemAge",
  "Wip",
  "CycleTime",
  "Arrivals",
];

type Parsed = { readonly success: boolean; readonly data?: unknown };

const registeredSchemas = () => {
  const schemas = new Map<
    string,
    { readonly safeParse: (value: unknown) => Parsed }
  >();
  const server = {
    registerTool: (
      name: string,
      configuration: { readonly inputSchema: never },
    ) => {
      schemas.set(name, configuration.inputSchema);
    },
  };
  registerMcpTools(server as never, { createClient: () => ({}) as never });
  return (tool: string, value: unknown): Parsed =>
    schemas.get(tool)?.safeParse(value) ?? { success: false };
};

describe("a daily-flow question without a whole-number id", () => {
  // @error @contract-shape:bounded-change
  it.each([
    [WIP, {}, "team metrics: invalid id"],
    [SLE_RISK, { id: "3" }, "team metrics: invalid id"],
    [TEAM_CHART, { metricType: "Throughput" }, "team metrics: invalid id"],
    [
      PORTFOLIO_CHART,
      { id: 2.5, metricType: "FeatureSize" },
      "portfolio metrics: invalid id",
    ],
  ])("%s refuses %o without asking Lighthouse", async (tool, args, refusal) => {
    const assistant = anAssistantOn({});

    const result = await assistant.call(tool, args);

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([{ type: "text", text: refusal }]);
    expect(assistant.asked()).toEqual([]);
  });
});

describe("a Portfolio chart question that names no chart", () => {
  // @error @contract-shape:bounded-change
  it("asks which chart, without asking Lighthouse", async () => {
    const assistant = anAssistantOn({});

    const result = await assistant.call(PORTFOLIO_CHART, { id: 2 });

    expect(result.content).toEqual([
      { type: "text", text: "portfolio metrics: invalid metricType" },
    ]);
    expect(assistant.asked()).toEqual([]);
  });
});

describe("the schemas the daily-flow tools are registered with", () => {
  // @contract-shape:pure-function
  it.each([
    [WIP, { id: 3 }],
    [SLE_RISK, { id: 3 }],
    [TEAM_CHART, { id: 3, metricType: "CycleTime" }],
    [
      PORTFOLIO_CHART,
      {
        id: 2,
        metricType: "FeatureSize",
        startDate: "2026-09-09",
        endDate: "2026-10-08",
      },
    ],
  ])("%s hands the question it takes on whole", (tool, question) => {
    expect(registeredSchemas()(tool, question)).toEqual({
      success: true,
      data: question,
    });
  });

  // @error @contract-shape:pure-function
  it("takes no Feature Size chart for a Team", () => {
    expect(
      registeredSchemas()(TEAM_CHART, { id: 3, metricType: "FeatureSize" })
        .success,
    ).toBe(false);
  });

  // @contract-shape:pure-function
  it.each([
    [TEAM_CHART, TEAM_CHART_TYPES],
    [PORTFOLIO_CHART, [...TEAM_CHART_TYPES, "FeatureSize"]],
  ])(
    "%s tells an assistant to name the id and one of the charts it draws, and nothing else",
    (tool, chartTypes) => {
      const listed = anAssistantOn({})
        .runtime.listTools()
        .find((candidate) => candidate.name === tool);

      expect(listed?.inputSchema).toMatchObject({
        type: "object",
        properties: { metricType: { enum: chartTypes } },
        required: ["id", "metricType"],
        additionalProperties: false,
      });
    },
  );
});
