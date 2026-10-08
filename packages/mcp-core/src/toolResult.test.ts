import { encode } from "@toon-format/toon";
import { describe, expect, it } from "vitest";
import { withSummary } from "./toolResult";

describe("withSummary", () => {
  it("adds the summary as a field of an object answer", () => {
    expect(withSummary("team", { id: 3 }, "Gravity").content).toEqual([
      { type: "text", text: `team: ${encode({ summary: "Gravity", id: 3 })}` },
    ]);
  });

  it.each([
    ["a list", [1, 2]],
    ["nothing", null],
    ["a single value", "v26.10.1"],
    ["an object with a summary of its own", { summary: "Every Friday", id: 5 }],
  ])(
    "puts the summary in a second block after %s, leaving the facts as they are",
    (_case, facts) => {
      expect(withSummary("facts", facts, "Stated").content).toEqual([
        { type: "text", text: `facts: ${encode(facts as never)}` },
        { type: "text", text: "summary: Stated" },
      ]);
    },
  );
});
