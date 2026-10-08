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
  hideConnectionSecrets,
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
    [{ ...focusFriday, weekdays: ["Fryday"] }],
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

describe("hideConnectionSecrets", () => {
  const HIDDEN = "(secret, not shown)";

  it("shows only the values of options that say they are not secret and are not declared secret", () => {
    const hidden = hideConnectionSecrets(
      jiraConnection([
        { key: "Jira Url", value: "https://jira", isSecret: false },
        { key: "Port", value: 443, isSecret: false },
        { key: "Api Token", value: "leaked", isSecret: false },
        { key: "Password", value: "leaked", isSecret: true },
        { key: "Extra", value: "leaked" },
        { key: "Odd", value: "leaked", isSecret: "no" },
      ]),
    );

    expect(hidden).toEqual(
      jiraConnection([
        { key: "Jira Url", value: "https://jira", isSecret: false },
        { key: "Port", value: 443, isSecret: false },
        { key: "Api Token", value: HIDDEN, isSecret: false },
        { key: "Password", value: HIDDEN, isSecret: true },
        { key: "Extra", value: HIDDEN },
        { key: "Odd", value: HIDDEN, isSecret: "no" },
      ]),
    );
  });

  it("hides an option that is not an object, and options that are not a list", () => {
    expect(hideConnectionSecrets(jiraConnection(["leaked" as never]))).toEqual(
      jiraConnection([HIDDEN as never]),
    );
    expect(
      hideConnectionSecrets({
        ...jiraConnection([]),
        options: { a: "leaked" },
      }),
    ).toEqual({ ...jiraConnection([]), options: HIDDEN });
  });

  it("hides the secrets of every connection in a list, and leaves the answer it was given untouched", () => {
    const leaky = jiraConnection([
      { key: "Api Token", value: "leaked", isSecret: true },
    ]);
    const answer = [leaky, { ...leaky, name: null }];

    const hidden = hideConnectionSecrets(answer);

    expect(JSON.stringify(hidden)).not.toContain("leaked");
    expect(answer[1]).toEqual({ ...leaky, name: null });
    expect(JSON.stringify(answer)).toContain("leaked");
  });

  it.each([null, "text", 3, { id: 1 }])(
    "passes %j through as it is",
    (value) => {
      expect(hideConnectionSecrets(value)).toEqual(value);
    },
  );
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

describe("what housekeeping answers must look like to be stated", () => {
  it("reads a rule on any day of the week, and none naming a day the week does not have", () => {
    const everyDay = {
      ...focusFriday,
      weekdays: [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
    };

    expect(readBlackoutRules([everyDay])).toEqual([everyDay]);
    expect(
      readBlackoutRules([{ ...focusFriday, weekdays: ["Friday", "Funday"] }]),
    ).toBeNull();
  });

  it("reads no connection list when a connection comes without its id", () => {
    expect(
      readWorkTrackingConnections([
        { id: "1", name: "Letpeoplework Jira", workTrackingSystem: "Jira" },
      ]),
    ).toBeNull();
  });

  it("labels an option by the connection's own method, whatever else the list holds", () => {
    const connection = readWorkTrackingConnection({
      ...jiraConnection([
        { key: "Jira Url", value: "https://x", isSecret: false },
      ]),
      availableAuthenticationMethods: [
        null,
        {
          key: "jira.server",
          options: [{ key: "Jira Url", displayName: "Server URL" }],
        },
        ...jiraConnection([]).availableAuthenticationMethods,
      ],
    });

    expect(connection?.options).toEqual([
      { label: "Jira URL", isSecret: false, value: "https://x" },
    ]);
  });
});

it("labels an option even when its method declares an option that is not one", () => {
  const connection = readWorkTrackingConnection({
    ...jiraConnection([{ key: "Api Token", value: "x", isSecret: false }]),
    availableAuthenticationMethods: [
      {
        key: "jira.cloud",
        options: [
          null,
          { key: "Api Token", displayName: "API Token", isSecret: true },
        ],
      },
    ],
  });

  expect(connection?.options).toEqual([{ label: "API Token", isSecret: true }]);
});
