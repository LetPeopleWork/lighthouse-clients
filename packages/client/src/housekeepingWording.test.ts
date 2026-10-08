import { describe, expect, it } from "vitest";
import {
  describeBlackoutRuleCount,
  describeBlackoutRuleSchedule,
  describeNoBlackoutRules,
  describeReachable,
  describeVersion,
  readBlackoutRules,
} from "./housekeepingWording";

const focusFriday = {
  id: 5,
  weekdays: ["Friday"],
  intervalWeeks: 2,
  start: "2026-10-09",
  end: null,
  description: "Focus Friday",
  summary: "Every Friday — every 2 weeks — from 2026-10-09 — no end",
};

describe("readBlackoutRules", () => {
  it("reads every rule the list holds", () => {
    const hackathon = { ...focusFriday, id: 6, end: "2026-12-22" };
    expect(readBlackoutRules([focusFriday, hackathon])).toEqual([
      focusFriday,
      hackathon,
    ]);
    expect(readBlackoutRules([])).toEqual([]);
  });

  it.each([
    null,
    "rules",
    {},
    [{ ...focusFriday, summary: "" }],
    [{ ...focusFriday, summary: undefined }],
    [{ ...focusFriday, id: "5" }],
    [{ ...focusFriday, weekdays: "Friday" }],
    [{ ...focusFriday, intervalWeeks: "2" }],
    [{ ...focusFriday, start: undefined }],
    [{ ...focusFriday, end: 7 }],
    [{ ...focusFriday, description: null }],
  ])("refuses %j as a list of rules", (value) => {
    expect(readBlackoutRules(value)).toBeNull();
  });
});

describe("describeBlackoutRuleCount", () => {
  it.each([
    [0, "No recurring blackout rules"],
    [1, "1 recurring blackout rule"],
    [2, "2 recurring blackout rules"],
  ])("counts %i rules as %s", (count, expected) => {
    expect(describeBlackoutRuleCount(count)).toBe(expected);
  });

  it("says so in a sentence when there are none", () => {
    expect(describeNoBlackoutRules()).toBe("No recurring blackout rules.");
  });
});

describe("describeBlackoutRuleSchedule", () => {
  it("names the rule by id, then Lighthouse's own summary", () => {
    expect(describeBlackoutRuleSchedule(focusFriday)).toBe(
      "[id: 5] Every Friday — every 2 weeks — from 2026-10-09 — no end",
    );
  });
});

describe("describeVersion", () => {
  it("shows the version exactly as sent", () => {
    expect(describeVersion("v26.10.3.6")).toBe("Lighthouse v26.10.3.6");
    expect(describeVersion("26.10.3.6")).toBe("Lighthouse 26.10.3.6");
  });

  it.each([null, "", 26, { version: "v1" }])(
    "refuses %j as a version",
    (value) => {
      expect(describeVersion(value)).toBeNull();
    },
  );
});

describe("describeReachable", () => {
  it("names the Lighthouse it reached", () => {
    expect(
      describeReachable({
        mode: "server",
        endpointUrl: "https://lighthouse.example.com",
        authMode: "disabled",
      }),
    ).toBe("Lighthouse at https://lighthouse.example.com is reachable.");
  });

  it("says the standalone Lighthouse is reachable", () => {
    expect(
      describeReachable({ mode: "standalone", authMode: "disabled" }),
    ).toBe("The standalone Lighthouse is reachable.");
  });
});
