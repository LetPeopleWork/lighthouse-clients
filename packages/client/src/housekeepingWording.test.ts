import { describe, expect, it } from "vitest";
import {
  describeBlackoutRuleCount,
  describeBlackoutRuleSchedule,
  describeConnectionSummary,
  describeNoBlackoutRules,
  describeOptionValue,
  describeReachable,
  describeVersion,
  describeWorkTrackingSystemCount,
  readBlackoutRules,
  readWorkTrackingConnection,
  readWorkTrackingConnections,
} from "./housekeepingWording";
import { SEEDED_TERMS, type Terms } from "./terminology";

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

const jiraConnection = (options: readonly Record<string, unknown>[]) => ({
  id: 1,
  name: "Letpeoplework Jira",
  workTrackingSystem: "Jira",
  authenticationMethodKey: "jira.cloud",
  availableAuthenticationMethods: [
    {
      key: "jira.cloud",
      options: [
        { key: "Jira Url", displayName: "Jira URL", isSecret: false },
        { key: "Api Token", displayName: "API Token", isSecret: true },
      ],
    },
  ],
  options,
});

describe("readWorkTrackingConnection", () => {
  it("hides a secret that arrives with its value", () => {
    const connection = readWorkTrackingConnection(
      jiraConnection([{ key: "Api Token", value: "leaked", isSecret: true }]),
    );

    expect(connection?.options).toEqual([
      { label: "API Token", isSecret: true },
    ]);
    expect(JSON.stringify(connection)).not.toContain("leaked");
    expect(connection?.options.map(describeOptionValue)).toEqual([
      "(secret, not shown)",
    ]);
  });

  it("shows a non-secret that arrives without a value as empty, never as a secret", () => {
    const connection = readWorkTrackingConnection(
      jiraConnection([
        { key: "Jira Url", value: "", isSecret: false },
        { key: "Custom", value: null, isSecret: false },
      ]),
    );

    expect(connection?.options).toEqual([
      { label: "Jira URL", isSecret: false, value: "" },
      { label: "Custom", isSecret: false, value: "" },
    ]);
  });

  it("hides an option the connection's method declares secret, even when the option itself says otherwise", () => {
    const connection = readWorkTrackingConnection(
      jiraConnection([{ key: "Api Token", value: "leaked", isSecret: false }]),
    );

    expect(connection?.options).toEqual([
      { label: "API Token", isSecret: true },
    ]);
  });

  it.each([
    null,
    jiraConnection([{ key: "Api Token", value: "leaked" }]),
    jiraConnection([{ value: "x", isSecret: false }]),
    jiraConnection([{ key: "Jira Url", value: 3, isSecret: false }]),
    { ...jiraConnection([]), options: undefined },
    { ...jiraConnection([]), name: undefined },
  ])("reads %j as unrecognised", (value) => {
    expect(readWorkTrackingConnection(value)).toBeNull();
  });
});

describe("readWorkTrackingConnections", () => {
  it("reads each connection's name and type, never its options", () => {
    expect(
      readWorkTrackingConnections([
        jiraConnection([{ key: "Api Token", value: "leaked", isSecret: true }]),
      ]),
    ).toEqual([
      { id: 1, name: "Letpeoplework Jira", workTrackingSystem: "Jira" },
    ]);
  });

  it.each([null, {}, [{ id: 1, name: "Jira" }]])(
    "reads %j as unrecognised",
    (value) => {
      expect(readWorkTrackingConnections(value)).toBeNull();
    },
  );
});

describe("describeWorkTrackingSystemCount", () => {
  const renamed: Terms = {
    ...SEEDED_TERMS,
    workTrackingSystem: "Tracker",
    workTrackingSystems: "Trackers",
  };

  it.each([
    { count: 0, terms: SEEDED_TERMS, says: "No Work Tracking Systems" },
    { count: 1, terms: SEEDED_TERMS, says: "1 Work Tracking System" },
    { count: 3, terms: SEEDED_TERMS, says: "3 Work Tracking Systems" },
    { count: 0, terms: renamed, says: "No Trackers" },
    { count: 1, terms: renamed, says: "1 Tracker" },
  ])("counts $count connections as '$says'", ({ count, terms, says }) => {
    expect(describeWorkTrackingSystemCount(count, terms)).toBe(says);
  });
});

describe("describeConnectionSummary", () => {
  it("names the connection and its type, and carries no option's value", () => {
    const summary = describeConnectionSummary(
      jiraConnection([
        {
          key: "Jira Url",
          value: "https://letpeoplework.atlassian.net",
          isSecret: false,
        },
        { key: "Api Token", value: "ATATT-leaked", isSecret: false },
      ]),
    );

    expect(summary).toBe("Letpeoplework Jira [id: 1]\nType: Jira");
    expect(summary).not.toContain("atlassian");
    expect(summary).not.toContain("ATATT");
  });

  it.each([null, [], { id: 1, name: "Jira" }])(
    "has nothing to say about %j",
    (value) => {
      expect(describeConnectionSummary(value)).toBeNull();
    },
  );
});
