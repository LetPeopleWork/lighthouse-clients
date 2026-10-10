import { describe, expect, it } from "vitest";
import {
  aDelivery,
  oceanExplorer,
  oceanExplorersPortfolioDeliveries,
  ok,
  q4ReleaseHistory,
} from "../../../test-support/lighthouseAnswers";
import {
  anAssistantOn,
  answerOf,
  factsBlockOf,
  summaryBlockOf,
} from "../test-support/mcpHarness";

// The Delivery tools: the list keeps its facts and adds a count; the recorded days add the heading lh prints.

const deliveriesAssistant = (reads = {}) =>
  anAssistantOn({
    getPortfolio: ok(oceanExplorer()),
    listDeliveries: ok(oceanExplorersPortfolioDeliveries()),
    getDeliveryMetricsHistory: ok(q4ReleaseHistory()),
    ...reads,
  });

const Q4_HEADING =
  "Delivery [id: 11] · Delivery Date Tue 15 Dec 2026 · recorded since Tue 15 Sep 2026";

describe("the Delivery tools' summary", () => {
  it.each([
    { deliveries: oceanExplorersPortfolioDeliveries(), says: "4 Deliveries" },
    { deliveries: { active: [aDelivery()], archived: [] }, says: "1 Delivery" },
  ])(
    "the delivery list summary counts the active Deliveries when the server answers {active, archived}: '$says'",
    async ({ deliveries, says }) => {
      const assistant = deliveriesAssistant({ listDeliveries: ok(deliveries) });

      const result = await assistant.call("lighthouse_delivery_list", {
        id: 2,
      });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      const { summary, ...facts } = answerOf(result, "deliveries: ");
      expect(facts).toEqual(deliveries);
      expect(summary).toBe(says);
    },
  );

  it("tells an assistant the delivery list holds the running Deliveries under `active`, the archived ones under `archived`, and `summary` as a field counting the running ones", () => {
    const description =
      anAssistantOn({})
        .runtime.listTools()
        .find((listed) => listed.name === "lighthouse_delivery_list")
        ?.description ?? "";

    expect(description).toContain("`active`");
    expect(description).toContain("`archived`");
    expect(description).toContain("a `summary` field counts the running ones");
    expect(description).not.toContain("second text block");
  });

  it("keeps the summarised recorded days as they are and adds their heading in a second block", async () => {
    const result = await deliveriesAssistant().call(
      "lighthouse_delivery_metrics",
      {
        id: 11,
      },
    );

    expect(result.isError).toBe(false);
    expect(factsBlockOf(result).startsWith("delivery metrics: ")).toBe(true);
    expect(summaryBlockOf(result) ?? "").toContain(Q4_HEADING);
  });

  it("hands the detailed recorded days over with their heading as a summary field", async () => {
    const result = await deliveriesAssistant().call(
      "lighthouse_delivery_metrics",
      {
        id: 11,
        detail: "epics",
      },
    );

    const { summary, ...facts } = answerOf(result, "delivery metrics: ");
    expect(facts).toEqual(q4ReleaseHistory());
    expect(String(summary)).toContain(Q4_HEADING);
  });
});
