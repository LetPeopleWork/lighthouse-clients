import { encode } from "@toon-format/toon";
import { describe, expect, it } from "vitest";
import {
  aPortfolio,
  aTeam,
  EVERY_TERM_RENAMED,
  fivePortfolios,
  gravity,
  oceanExplorer,
  ok,
  seededWordsIn,
  sevenTeams,
  terminology,
} from "../../../test-support/lighthouseAnswers";
import {
  aLighthouse,
  inTimeZone,
  looksLikeTheGenericView,
  shownLines,
} from "../test-support/cliHarness";

// Story 6218, slice 05 (US-05): Teams and Portfolios as the Overview's tables and the Team page's settings.
// Every scenario but the format guards is pending until DELIVER slice 05 un-skips it. Timestamps are read
// in Zurich, where 05:14 UTC on 6 Oct is 07:14 — the sketch's clock.

const READERS_ZONE = "Europe/Zurich";

const inZurich = <T>(body: () => Promise<T>) => inTimeZone(READERS_ZONE, body);

describe("lh team list --pretty", () => {
  // @driving_port @US-05 @contract-shape:pure-function
  it("shows Lena every Team in the Overview's table, with the id beside the name", async () => {
    const lighthouse = aLighthouse({ listTeams: ok(sevenTeams()) });

    const result = await inZurich(() => lighthouse.run(["team", "list"]));

    expect(result.exitCode).toBe(0);
    const lines = shownLines(result.stdout);
    expect(lines.slice(0, 5)).toEqual([
      "Teams",
      "Name Features Tags Last Updated",
      "Equinox [id: 1] 3 Features Tue 6 Oct 2026, 07:14",
      "Lightspeed [id: 2] 1 Feature Tue 6 Oct 2026, 07:14",
      "Gravity [id: 3] 6 Features Tue 6 Oct 2026, 07:14",
    ]);
    expect(lines).toHaveLength(9);
    expect(lighthouse.asked().sort()).toEqual(["getTerminology", "listTeams"]);
  });

  // @US-05 — the Tags column the web shows; Lighthouse sends no tags today, so it stays empty until one does
  it("lists a Team's tags when Lighthouse sends them", async () => {
    const lighthouse = aLighthouse({
      listTeams: ok([aTeam({ tags: ["mobile", "payments"] })]),
    });

    const result = await inZurich(() => lighthouse.run(["team", "list"]));

    expect(shownLines(result.stdout)).toContain(
      "Gravity [id: 3] 6 Features mobile, payments Tue 6 Oct 2026, 07:14",
    );
  });

  // @error @US-05 — AC-05.4: a missing cell says —
  it("says '—' for a Team Lighthouse sent without a last update", async () => {
    const { lastUpdated: _notSent, ...pulsar } = aTeam({
      name: "Pulsar",
      id: 5,
    });
    const lighthouse = aLighthouse({ listTeams: ok([gravity(), pulsar]) });

    const result = await inZurich(() => lighthouse.run(["team", "list"]));

    expect(shownLines(result.stdout)).toContain("Pulsar [id: 5] 6 Features —");
    expect(result.stdout).not.toContain("undefined");
  });

  // @error @version-skew @US-05 — AC-05.4 + M1: one item without name and id sends the whole list to the generic view
  it("shows the list as it came when a Team in it has no name or id", async () => {
    const recognised = await aLighthouse({ listTeams: ok(sevenTeams()) }).run([
      "team",
      "list",
    ]);
    expect(shownLines(recognised.stdout)[0]).toBe("Teams");
    const { name: _no, id: _neither, ...anonymous } = aTeam();
    const lighthouse = aLighthouse({ listTeams: ok([gravity(), anonymous]) });

    const result = await lighthouse.run(["team", "list"]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(looksLikeTheGenericView(result.stdout)).toBe(true);
    expect(result.stdout).not.toContain("Last Updated");
  });

  // @boundary @US-05 @reader-time-zone — D15: Last Updated is the reader's local time
  it.each([
    { zone: "America/Adak", reads: "Mon 5 Oct 2026, 20:14" },
    { zone: "Pacific/Kiritimati", reads: "Tue 6 Oct 2026, 19:14" },
  ])(
    "shows the last update at $reads for a reader in $zone",
    async ({ zone, reads }) => {
      const lighthouse = aLighthouse({ listTeams: ok([gravity()]) });

      const result = await inTimeZone(zone, () =>
        lighthouse.run(["team", "list"]),
      );

      expect(shownLines(result.stdout)).toContain(
        `Gravity [id: 3] 6 Features ${reads}`,
      );
    },
  );
});

describe("lh team get --pretty", () => {
  // @driving_port @US-05 @contract-shape:pure-function
  it("tells Lena Gravity's settings as the Team page states them", async () => {
    const lighthouse = aLighthouse({ getTeam: ok(gravity()) });

    const result = await inZurich(() =>
      lighthouse.run(["team", "get", "--id", "3"]),
    );

    expect(result.exitCode).toBe(0);
    expect(shownLines(result.stdout)).toEqual([
      "Gravity [id: 3]",
      "Last Updated on Tue 6 Oct 2026, 07:14",
      "Service Level Expectation: 85% of Work Items within 12 days or less",
      "System WIP Limit: 10 Work Items",
      "Feature WIP: 2 Features",
      "Throughput: Mon 7 Sep 2026 to Tue 6 Oct 2026 (rolling)",
      "Portfolios: Apollo [id: 1], Ocean Explorer [id: 2]",
      "Features: 6",
      "Work Item Types: User Story, Bug",
    ]);
  });

  // @error @US-05 — SleQuickSetting.tsx, SystemWipQuickSetting.tsx, FeatureWipQuickSetting.tsx
  it("says 'Not set' for each setting Meridian has left unset", async () => {
    const lighthouse = aLighthouse({
      getTeam: ok(
        aTeam({
          name: "Meridian",
          id: 4,
          serviceLevelExpectationProbability: 0,
          serviceLevelExpectationRange: 0,
          systemWIPLimit: 0,
          featureWip: 0,
        }),
      ),
    });

    const result = await lighthouse.run(["team", "get", "--id", "4"]);

    const lines = shownLines(result.stdout);
    expect(lines).toContain("Service Level Expectation: Not set");
    expect(lines).toContain("System WIP Limit: Not set");
    expect(lines).toContain("Feature WIP: Not set");
  });

  // @boundary @US-05 — C15: the resolved dates, rolling or fixed; one Feature in the singular
  it("says the Throughput dates are fixed, and counts a single Feature WIP in the singular", async () => {
    const lighthouse = aLighthouse({
      getTeam: ok(
        aTeam({
          useFixedDatesForThroughput: true,
          throughputStartDate: "2026-07-01T00:00:00Z",
          throughputEndDate: "2026-09-30T00:00:00Z",
          featureWip: 1,
        }),
      ),
    });

    const lines = shownLines(
      (await lighthouse.run(["team", "get", "--id", "3"])).stdout,
    );

    expect(lines).toContain(
      "Throughput: Wed 1 Jul 2026 to Wed 30 Sep 2026 (fixed dates)",
    );
    expect(lines).toContain("Feature WIP: 1 Feature");
  });

  // @US-05 @kpi — KPI-5
  it("says it in the words an instance has renamed every term to", async () => {
    const lighthouse = aLighthouse({
      getTeam: ok(gravity()),
      listTeams: ok(sevenTeams()),
      getTerminology: ok(terminology(EVERY_TERM_RENAMED)),
    });

    const get = await lighthouse.run(["team", "get", "--id", "3"]);
    const list = await lighthouse.run(["team", "list"]);

    const lines = shownLines(get.stdout);
    expect(lines).toContain("Promise: 85% of Tickets within 12 days or less");
    expect(lines).toContain("System Load Limit: 10 Tickets");
    expect(lines).toContain("Outcome Load: 2 Outcomes");
    expect(lines).toContain(
      "Programmes: Apollo [id: 1], Ocean Explorer [id: 2]",
    );
    expect(shownLines(list.stdout)[0]).toBe("Squads");
    expect(seededWordsIn(`${get.stdout}\n${list.stdout}`)).toEqual([]);
  });
});

describe("lh portfolio list and get --pretty", () => {
  // @driving_port @US-05 — D10: a hint instead of one Delivery read per Portfolio
  it.skip("lists the Portfolios and points at their Deliveries without fetching them", async () => {
    const lighthouse = aLighthouse({ listPortfolios: ok(fivePortfolios()) });

    const result = await inZurich(() => lighthouse.run(["portfolio", "list"]));

    expect(result.exitCode).toBe(0);
    const lines = shownLines(result.stdout);
    expect(lines.slice(0, 2)).toEqual([
      "Portfolios",
      "Name Features Tags Last Updated",
    ]);
    expect(lines).toContain(
      "Ocean Explorer [id: 2] 8 Features Tue 6 Oct 2026, 06:58",
    );
    expect(lines.at(-1)).toBe(
      "Deliveries per Portfolio: lh delivery list --portfolio-id <id>",
    );
    expect(lighthouse.asked()).not.toContain("listDeliveries");
  });

  // @driving_port @US-05 — PortfolioFeatureWipQuickSetting.tsx counts the involved Teams
  it.skip("tells Lena Ocean Explorer's settings as the Portfolio page states them", async () => {
    const lighthouse = aLighthouse({ getPortfolio: ok(oceanExplorer()) });

    const result = await inZurich(() =>
      lighthouse.run(["portfolio", "get", "--id", "2"]),
    );

    expect(result.exitCode).toBe(0);
    expect(shownLines(result.stdout)).toEqual([
      "Ocean Explorer [id: 2]",
      "Last Updated on Tue 6 Oct 2026, 06:58",
      "Service Level Expectation: 85% of Features within 45 days or less",
      "System WIP Limit: 5 Features",
      "Feature WIP: 3 Teams",
      "Teams: Gravity [id: 3], Voyager [id: 6], Zenith [id: 7]",
      "Features: 8",
    ]);
  });

  // @error @US-05 — a Portfolio no Team works on
  it.skip("says 'Not set' for the Feature WIP of a Portfolio no Team works on", async () => {
    const lighthouse = aLighthouse({
      getPortfolio: ok(aPortfolio({ involvedTeams: [] })),
    });

    const result = await lighthouse.run(["portfolio", "get", "--id", "2"]);

    expect(shownLines(result.stdout)).toContain("Feature WIP: Not set");
  });
});

// Guards, green today and on every slice after (D4, KPI-2).
describe("lh team and portfolio keep the facts formats as they are", () => {
  // @driving_port @US-05 @contract-shape:unbounded-preservation
  it.each([
    {
      args: ["team", "list"],
      read: "listTeams",
      answer: sevenTeams,
    },
    {
      args: ["team", "get", "--id", "3"],
      read: "getTeam",
      answer: gravity,
    },
    {
      args: ["portfolio", "list"],
      read: "listPortfolios",
      answer: fivePortfolios,
    },
    {
      args: ["portfolio", "get", "--id", "2"],
      read: "getPortfolio",
      answer: oceanExplorer,
    },
  ])(
    "hands scripts `lh $args` unchanged with --json and --toon, and asks only $read",
    async ({ args, read, answer }) => {
      const lighthouse = aLighthouse({ [read]: ok(answer()) });

      const json = await lighthouse.run([...args, "--json"]);
      const toon = await lighthouse.run([...args, "--toon"]);

      expect(json.stdout).toBe(JSON.stringify(answer()));
      expect(toon.stdout).toBe(encode(answer() as never));
      expect(lighthouse.asked()).toEqual([read, read]);
    },
  );
});
