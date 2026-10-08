import { encode } from "@toon-format/toon";
import { describe, expect, it } from "vitest";
import {
  aDelivery,
  oceanExplorer,
  oceanExplorersDeliveries,
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
    listDeliveries: ok(oceanExplorersDeliveries()),
    getDeliveryMetricsHistory: ok(q4ReleaseHistory()),
    ...reads,
  });

const Q4_HEADING =
  "Delivery [id: 11] · Delivery Date Tue 15 Dec 2026 · recorded since Tue 15 Sep 2026";

describe("the Delivery tools' summary", () => {
  it.each([
    { deliveries: oceanExplorersDeliveries(), says: "summary: 4 Deliveries" },
    { deliveries: [aDelivery()], says: "summary: 1 Delivery" },
  ])(
    "keeps the Delivery list's facts as they are and adds '$says'",
    async ({ deliveries, says }) => {
      const assistant = deliveriesAssistant({ listDeliveries: ok(deliveries) });

      const result = await assistant.call("lighthouse_delivery_list", {
        id: 2,
      });

      expect(result.isError).toBe(false);
      expect(factsBlockOf(result)).toBe(
        `deliveries: ${encode(deliveries as never)}`,
      );
      expect(summaryBlockOf(result)).toBe(says);
    },
  );

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
