import { encode } from "@toon-format/toon";
import { describe, expect, it } from "vitest";
import {
  aBlackoutRule,
  aConnection,
  EVERY_TERM_RENAMED,
  ok,
  refused,
  seededWordsIn,
  terminology,
  threeConnections,
} from "../../../test-support/lighthouseAnswers";
import {
  aLighthouse,
  looksLikeTheGenericView,
  NEVER_PRINTED,
  shownLines,
} from "../test-support/cliHarness";

// Story 6218, slice 09 (US-09): the housekeeping commands read as the web's settings pages, its footer, or a
// plain sentence.

const HACKATHON = aBlackoutRule({
  id: 6,
  weekdays: ["Monday", "Tuesday"],
  intervalWeeks: 1,
  start: "2026-12-01",
  end: "2026-12-22",
  description: "Hackathon",
  summary:
    "Every Monday, Tuesday — weekly — from 2026-12-01 — until 2026-12-22",
});

const LEAKED_TOKEN = "ATATT-leaked-token";

// A server that wrongly hands a secret's value back.
const aLeakyConnection = () =>
  aConnection({
    options: aConnection().options.map((option) =>
      option.isSecret ? { ...option, value: LEAKED_TOKEN } : option,
    ),
  });

const sofiasLighthouse = (reads = {}, options = {}) =>
  aLighthouse(
    {
      getRecurringBlackoutRules: ok([aBlackoutRule(), HACKATHON]),
      listWorkTrackingConnections: ok(threeConnections()),
      getWorkTrackingConnection: ok(aConnection()),
      getVersion: ok("v26.10.3.6"),
      ...reads,
    },
    options,
  );

describe("lh blackout list --pretty", () => {
  // @driving_port @US-09 @contract-shape:pure-function — BlackoutSettings.tsx
  it("shows Sofia the recurring blackout rules as the settings page lists them", async () => {
    const lighthouse = sofiasLighthouse();

    const result = await lighthouse.run(["blackout", "list"]);

    expect(result.exitCode).toBe(0);
    expect(shownLines(result.stdout)).toEqual([
      "Recurring blackout rules",
      "Schedule Description",
      "[id: 5] Every Friday — every 2 weeks — from 2026-10-09 — no end Focus Friday",
      "[id: 6] Every Monday, Tuesday — weekly — from 2026-12-01 — until 2026-12-22 Hackathon",
    ]);
  });

  // @boundary @US-09 — chosen wording
  it("says so when there are no recurring blackout rules", async () => {
    const lighthouse = sofiasLighthouse({ getRecurringBlackoutRules: ok([]) });

    const result = await lighthouse.run(["blackout", "list"]);

    expect(result.exitCode).toBe(0);
    expect(shownLines(result.stdout)).toEqual(["No recurring blackout rules."]);
  });

  // @boundary @US-09 — a rule without a description
  it("leaves the Description cell empty for a rule without one", async () => {
    const lighthouse = sofiasLighthouse({
      getRecurringBlackoutRules: ok([aBlackoutRule({ description: "" })]),
    });

    const result = await lighthouse.run(["blackout", "list"]);

    expect(shownLines(result.stdout)[2]).toBe(
      "[id: 5] Every Friday — every 2 weeks — from 2026-10-09 — no end",
    );
    for (const word of NEVER_PRINTED) {
      expect(result.stdout).not.toContain(word);
    }
  });
});

describe("lh worktracking --pretty", () => {
  // @driving_port @US-09 @contract-shape:pure-function — OverviewDashboard.tsx connectionColumns
  it("shows Sofia the Work Tracking Systems as the Overview lists them", async () => {
    const lighthouse = sofiasLighthouse();

    const result = await lighthouse.run(["worktracking", "list"]);

    expect(result.exitCode).toBe(0);
    expect(shownLines(result.stdout)).toEqual([
      "Work Tracking Systems",
      "Name Type",
      "Letpeoplework Jira [id: 1] Jira",
      "Lighthouse ADO [id: 2] AzureDevOps",
      "Linear Demo [id: 3] Linear",
    ]);
  });

  // @driving_port @US-09 @contract-shape:pure-function — EditConnection.tsx, field names as the editor labels them
  it("shows Sofia one connection with its options as the editor labels them", async () => {
    const lighthouse = sofiasLighthouse();

    const result = await lighthouse.run(["worktracking", "get", "--id", "1"]);

    expect(result.exitCode).toBe(0);
    expect(shownLines(result.stdout)).toEqual([
      "Letpeoplework Jira [id: 1]",
      "Type: Jira",
      "Option Value",
      "Jira URL https://letpeoplework.atlassian.net",
      "Username (Email) benj@letpeoplework.com",
      "API Token (secret, not shown)",
    ]);
  });

  // @error @security @US-09 @contract-shape:unbounded-preservation — AC-09.2, the slice's risk carrier
  it("never prints a secret's value, even when Lighthouse wrongly sends it", async () => {
    const lighthouse = sofiasLighthouse({
      getWorkTrackingConnection: ok(aLeakyConnection()),
    });

    const result = await lighthouse.run(["worktracking", "get", "--id", "1"]);
    const list = await sofiasLighthouse({
      listWorkTrackingConnections: ok([aLeakyConnection()]),
    }).run(["worktracking", "list"]);

    expect(result.exitCode).toBe(0);
    expect(shownLines(result.stdout)).toContain(
      "API Token (secret, not shown)",
    );
    expect(result.stdout).not.toContain(LEAKED_TOKEN);
    expect(list.stdout).not.toContain(LEAKED_TOKEN);
  });

  // @error @version-skew @US-09 — an option the editor has no label for
  it("labels an option by its key when the connection's method does not name it", async () => {
    const lighthouse = sofiasLighthouse({
      getWorkTrackingConnection: ok(
        aConnection({ availableAuthenticationMethods: [] }),
      ),
    });

    const result = await lighthouse.run(["worktracking", "get", "--id", "1"]);

    expect(shownLines(result.stdout).slice(2)).toEqual([
      "Option Value",
      "Jira Url https://letpeoplework.atlassian.net",
      "Username benj@letpeoplework.com",
      "Api Token (secret, not shown)",
    ]);
  });

  // @US-09 @kpi — KPI-5
  it("titles the list in the word an instance has renamed Work Tracking Systems to", async () => {
    const lighthouse = sofiasLighthouse({
      getTerminology: ok(terminology(EVERY_TERM_RENAMED)),
    });

    const result = await lighthouse.run(["worktracking", "list"]);

    expect(shownLines(result.stdout)[0]).toBe("Trackers");
    expect(seededWordsIn(result.stdout)).toEqual([]);
  });

  // @error @infrastructure-failure @US-09 — D4: the view survives a failed terminology read
  it("titles the list in the seeded words when the instance's terms cannot be read", async () => {
    const lighthouse = sofiasLighthouse({
      getTerminology: refused("unexpected", "Terminology is unavailable"),
    });

    const result = await lighthouse.run(["worktracking", "list"]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(shownLines(result.stdout)[0]).toBe("Work Tracking Systems");
  });

  // @error @version-skew @US-09 — D5 + M1
  it("shows a connection as it came when it arrives without its options", async () => {
    const recognised = await sofiasLighthouse().run([
      "worktracking",
      "get",
      "--id",
      "1",
    ]);
    expect(shownLines(recognised.stdout)[1]).toBe("Type: Jira");
    const { options: _notSent, ...withoutOptions } = aConnection();
    const lighthouse = sofiasLighthouse({
      getWorkTrackingConnection: ok(withoutOptions),
    });

    const result = await lighthouse.run(["worktracking", "get", "--id", "1"]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(looksLikeTheGenericView(result.stdout)).toBe(true);
  });
});

describe("lh version get and lh health check --pretty", () => {
  // @driving_port @US-09 @contract-shape:pure-function — LighthouseVersion.tsx
  it("shows the version as the footer does", async () => {
    const result = await sofiasLighthouse().run(["version", "get"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("Lighthouse v26.10.3.6");
  });

  // @driving_port @US-09 @contract-shape:pure-function — chosen wording
  it("says the Lighthouse it is connected to is reachable", async () => {
    const result = await sofiasLighthouse().run(["health", "check"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(
      "Lighthouse at https://lighthouse.letpeoplework.com is reachable.",
    );
  });

  // @boundary @US-09 — chosen wording
  it("says the standalone Lighthouse is reachable", async () => {
    const lighthouse = sofiasLighthouse(
      {},
      { connection: { mode: "standalone" } },
    );

    const result = await lighthouse.run(["health", "check"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("The standalone Lighthouse is reachable.");
  });
});

// Guards, green today and on every slice after (D4, AC-09.3, AC-09.4, KPI-2).
describe("lh housekeeping keeps the facts formats and failures as they are", () => {
  // @error @infrastructure-failure @US-09 @contract-shape:unbounded-preservation — AC-09.3
  it("reports an unreachable Lighthouse as before", async () => {
    const lighthouse = sofiasLighthouse(
      {},
      { reachable: { category: "unreachable", reason: "connection refused" } },
    );

    const result = await lighthouse.run(["health", "check"]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("unreachable: connection refused");
  });

  // @driving_port @US-09 @contract-shape:unbounded-preservation — DSN-12
  it.each([["--json"], ["--toon"]])(
    "keeps today's health line under %s",
    async (format) => {
      const lighthouse = sofiasLighthouse();

      const result = await lighthouse.run(["health", "check", format]);

      expect([result.exitCode, result.stdout]).toEqual([0, "success"]);
      expect(lighthouse.asked()).toEqual(["checkConnectivity"]);
    },
  );

  // @driving_port @US-09 @contract-shape:unbounded-preservation — AC-09.4
  it.each([
    { args: ["blackout", "list"], answer: () => [aBlackoutRule(), HACKATHON] },
    { args: ["worktracking", "list"], answer: () => threeConnections() },
    { args: ["worktracking", "get", "--id", "1"], answer: () => aConnection() },
    { args: ["version", "get"], answer: () => "v26.10.3.6" },
  ])(
    "hands scripts `lh $args` unchanged with --json and --toon",
    async ({ args, answer }) => {
      const lighthouse = sofiasLighthouse();

      const json = await lighthouse.run([...args, "--json"]);
      const toon = await lighthouse.run([...args, "--toon"]);

      expect(json.stdout).toBe(JSON.stringify(answer()));
      expect(toon.stdout).toBe(encode(answer() as never));
      expect(lighthouse.asked()).not.toContain("getTerminology");
    },
  );

  // @error @security @US-09 — the facts formats hand over what Lighthouse sent, as today
  it("hands scripts a connection exactly as Lighthouse sent it", async () => {
    const lighthouse = sofiasLighthouse({
      getWorkTrackingConnection: ok(aLeakyConnection()),
    });

    const json = await lighthouse.run([
      "worktracking",
      "get",
      "--id",
      "1",
      "--json",
    ]);

    expect(json.stdout).toBe(JSON.stringify(aLeakyConnection()));
  });

  // @error @US-09 — errors keep today's form
  it("passes a refused connection read straight through", async () => {
    const lighthouse = sofiasLighthouse({
      getWorkTrackingConnection: refused("not-found", "Connection 9 not found"),
    });

    const result = await lighthouse.run(["worktracking", "get", "--id", "9"]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("not-found: Connection 9 not found");
  });
});
