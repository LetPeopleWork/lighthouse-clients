import { describe, expect, it } from "vitest";
import { SEEDED_TERMS, type Terms } from "./terminology";
import {
  describeBlackoutRuleWriteConfirmation,
  describeOwnerWriteConfirmation,
  describeRefreshConfirmation,
  readWrittenBlackoutRule,
  readWrittenOwner,
} from "./writeWording";

const RENAMED: Terms = {
  ...SEEDED_TERMS,
  team: "Squad",
  portfolio: "Programme",
};

describe("readWrittenOwner", () => {
  it("reads the id and name the write answered with", () => {
    expect(readWrittenOwner({ id: 9, name: "Lightspeed", tags: [] })).toEqual({
      id: 9,
      name: "Lightspeed",
    });
  });

  it("keeps the id alone when the answer carries no name", () => {
    expect(readWrittenOwner({ id: 9, name: "" })).toEqual({ id: 9 });
    expect(readWrittenOwner({ id: 9 })).toEqual({ id: 9 });
  });

  it.each([null, undefined, "ok", [], { name: "Lightspeed" }, { id: "9" }])(
    "says nothing for an answer without an id: %j",
    (value) => {
      expect(readWrittenOwner(value)).toBeNull();
    },
  );
});

describe("readWrittenBlackoutRule", () => {
  it("reads the id, Lighthouse's summary and the description", () => {
    expect(
      readWrittenBlackoutRule({
        id: 5,
        summary: "Every Friday — weekly — from 2026-10-09 — no end",
        description: "Focus Friday",
        weekdays: ["Friday"],
      }),
    ).toEqual({
      id: 5,
      summary: "Every Friday — weekly — from 2026-10-09 — no end",
      description: "Focus Friday",
    });
  });

  it("leaves an empty summary or description out", () => {
    expect(
      readWrittenBlackoutRule({ id: 5, summary: "", description: "" }),
    ).toEqual({ id: 5, summary: undefined, description: undefined });
  });

  it.each([null, "ok", [], { summary: "Every Friday" }, { id: "5" }])(
    "says nothing for an answer without an id: %j",
    (value) => {
      expect(readWrittenBlackoutRule(value)).toBeNull();
    },
  );
});

describe("describeOwnerWriteConfirmation", () => {
  it.each([
    ["Created", "team", "Created: Team Lightspeed [id: 9]."],
    ["Updated", "portfolio", "Updated: Portfolio Lightspeed [id: 9]."],
  ] as const)("%s a %s by its word, name and id", (verb, kind, line) => {
    expect(
      describeOwnerWriteConfirmation(
        verb,
        kind,
        { id: 9, name: "Lightspeed" },
        SEEDED_TERMS,
      ),
    ).toBe(line);
  });

  it("names a delete, or an answer without a name, by the id alone", () => {
    expect(
      describeOwnerWriteConfirmation(
        "Deleted",
        "portfolio",
        { id: 6 },
        SEEDED_TERMS,
      ),
    ).toBe("Deleted: Portfolio [id: 6].");
  });

  it("uses the instance's word for a Team and a Portfolio", () => {
    expect(
      describeOwnerWriteConfirmation("Deleted", "team", { id: 9 }, RENAMED),
    ).toBe("Deleted: Squad [id: 9].");
    expect(
      describeOwnerWriteConfirmation(
        "Updated",
        "portfolio",
        { id: 2, name: "Ocean Explorer" },
        RENAMED,
      ),
    ).toBe("Updated: Programme Ocean Explorer [id: 2].");
  });
});

describe("describeRefreshConfirmation", () => {
  it("says the refresh was queued, in the instance's words", () => {
    expect(describeRefreshConfirmation("team", 3, SEEDED_TERMS)).toBe(
      "Refresh queued: Team [id: 3]. Lighthouse updates it in the background.",
    );
    expect(describeRefreshConfirmation("portfolio", 2, RENAMED)).toBe(
      "Refresh queued: Programme [id: 2]. Lighthouse updates it in the background.",
    );
  });
});

describe("describeBlackoutRuleWriteConfirmation", () => {
  const summary = "Every Friday — every 2 weeks — from 2026-10-09 — no end";

  it("carries Lighthouse's summary verbatim and the description in brackets", () => {
    expect(
      describeBlackoutRuleWriteConfirmation("Created", {
        id: 5,
        summary,
        description: "Focus Friday",
      }),
    ).toBe(
      "Created: recurring blackout rule [id: 5] — Every Friday — every 2 weeks — from 2026-10-09 — no end (Focus Friday).",
    );
  });

  it("states the schedule alone when the rule has no description", () => {
    expect(
      describeBlackoutRuleWriteConfirmation("Updated", { id: 5, summary }),
    ).toBe(
      "Updated: recurring blackout rule [id: 5] — Every Friday — every 2 weeks — from 2026-10-09 — no end.",
    );
  });

  it("names a deleted rule by its id alone", () => {
    expect(describeBlackoutRuleWriteConfirmation("Deleted", { id: 5 })).toBe(
      "Deleted: recurring blackout rule [id: 5].",
    );
  });
});
