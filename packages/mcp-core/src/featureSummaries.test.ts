import { encode } from "@toon-format/toon";
import { describe, expect, it } from "vitest";
import {
  aFeature,
  oe002sWorkItems,
  ok,
  refused,
  terminology,
  threeOceanExplorerFeatures,
} from "../../../test-support/lighthouseAnswers";
import {
  anAssistantOn,
  factsBlockOf,
  summaryBlockOf,
} from "../test-support/mcpHarness";

// The Feature tools. Both answers are lists, so their facts stay byte for byte and a
// second block carries the summary.

const marcosAssistant = (reads = {}) =>
  anAssistantOn({
    getFeaturesByReferences: ok(threeOceanExplorerFeatures()),
    getFeaturesByIds: ok([aFeature()]),
    getFeatureWorkItems: ok(oe002sWorkItems()),
    ...reads,
  });

describe("the Feature tools' summary", () => {
  it("keeps the Features' facts as they are and adds a count", async () => {
    const result = await marcosAssistant().call("lighthouse_feature_get", {
      refs: ["OE-001", "OE-002", "OE-007"],
    });

    expect(result.isError).toBe(false);
    expect(factsBlockOf(result)).toBe(
      `features: ${encode(threeOceanExplorerFeatures() as never)}`,
    );
    expect(summaryBlockOf(result)).toBe("summary: 3 Features");
  });

  it("counts in the seeded word when the instance's term is not a word", async () => {
    const result = await marcosAssistant({
      getTerminology: ok(
        terminology().map((entry) =>
          entry.key === "features" ? { ...entry, value: {} } : entry,
        ),
      ),
    }).call("lighthouse_feature_get", { refs: ["OE-001", "OE-002", "OE-007"] });

    expect(factsBlockOf(result)).toBe(
      `features: ${encode(threeOceanExplorerFeatures() as never)}`,
    );
    expect(summaryBlockOf(result)).toBe("summary: 3 Features");
  });

  it("keeps the Work Items' facts as they are and adds the heading lh prints", async () => {
    const result = await marcosAssistant().call(
      "lighthouse_feature_workitems",
      {
        id: 2,
      },
    );

    expect(factsBlockOf(result)).toBe(
      `feature workitems: ${encode(oe002sWorkItems() as never)}`,
    );
    expect(summaryBlockOf(result)).toBe(
      "summary: OE-002 Deep-sea camera stream · 3 Work Items",
    );
  });

  // The summary's reads never fail the tool
  it("heads the Work Items with the Feature's id when its name cannot be read", async () => {
    const assistant = marcosAssistant({
      getFeaturesByIds: refused("forbidden", "You may not read this Feature"),
    });

    const result = await assistant.call("lighthouse_feature_workitems", {
      id: 2,
    });

    expect(result.isError).toBe(false);
    expect(summaryBlockOf(result)).toBe(
      "summary: Feature [id: 2] · 3 Work Items",
    );
  });
});
