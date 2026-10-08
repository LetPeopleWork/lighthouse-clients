import { encode } from "@toon-format/toon";
import { describe, expect, it } from "vitest";
import {
  aDelivery,
  EVERY_TERM_RENAMED,
  oceanExplorer,
  oceanExplorersDeliveries,
  ok,
  q4ReleaseHistory,
  refused,
  seededWordsIn,
  terminology,
} from "../../../test-support/lighthouseAnswers";
import {
  aLighthouse,
  inTimeZone,
  looksLikeTheGenericView,
  shownLines,
} from "../test-support/cliHarness";

// Deliveries read like the Delivery cards, one row each, and a Delivery's recorded days read as a table.

const deliveriesOfOceanExplorer = ["delivery", "list", "--portfolio-id", "2"];
const daysOfTheQ4Release = ["delivery", "metrics", "--delivery-id", "11"];

const oceanExplorersLighthouse = (reads = {}) =>
  aLighthouse({
    getPortfolio: ok(oceanExplorer()),
    listDeliveries: ok(oceanExplorersDeliveries()),
    getDeliveryMetricsHistory: ok(q4ReleaseHistory()),
    ...reads,
  });

const likelihoodCellOf = async (delivery: Record<string, unknown>) => {
  const lighthouse = oceanExplorersLighthouse({
    listDeliveries: ok([aDelivery(delivery)]),
  });
  const lines = shownLines(
    (await lighthouse.run(deliveriesOfOceanExplorer)).stdout,
  );
  return lines.find((line) => line.startsWith("Q4 Release [id: 11]")) ?? "";
};

describe("lh delivery list --pretty", () => {
  it("shows Lena every Delivery of Ocean Explorer in one table, each with the card's answer", async () => {
    const lighthouse = oceanExplorersLighthouse();

    const result = await lighthouse.run(deliveriesOfOceanExplorer);

    expect(result.exitCode).toBe(0);
    expect(shownLines(result.stdout)).toEqual([
      "Ocean Explorer · Deliveries",
      "Name Delivery Date Features Done Likelihood Forecast 85%",
      "Q4 Release [id: 11] Tue 15 Dec 2026 5 34 of 55 Work Items 78% Wed 16 Dec 2026",
      "Pilot Launch [id: 12] Fri 30 Oct 2026 2 18 of 20 Work Items >95% Tue 27 Oct 2026",
      "Beta Drop [id: 14] Fri 2 Oct 2026 3 9 of 14 Work Items Overdue Thu 15 Oct 2026",
      "Spring Rollout [id: 15] Tue 9 Mar 2027 4 0 of 31 Work Items Not enough data —",
    ]);
    expect(lighthouse.asked().sort()).toEqual([
      "getPortfolio",
      "getTerminology",
      "listDeliveries",
    ]);
  });

  // As on the card's header chip, Cannot forecast outranks Not enough data
  it.each([
    {
      why: "a Team has no throughput history",
      delivery: {
        teamsWithoutForecast: ["Lightspeed"],
        hasSufficientData: false,
      },
    },
    {
      why: "Lighthouse gives no likelihood",
      delivery: { likelihoodPercentage: null },
    },
  ])("says 'Cannot forecast' when $why", async ({ delivery }) => {
    expect(await likelihoodCellOf(delivery)).toContain(" Cannot forecast ");
  });

  // Thin history matters only while work remains
  it("states the likelihood of a finished Delivery even on thin history", async () => {
    const cell = await likelihoodCellOf({
      hasSufficientData: false,
      remainingWork: 0,
      likelihoodPercentage: 100,
    });

    expect(cell).toContain(" 100% ");
    expect(cell).not.toContain("Not enough data");
  });

  // Overdue only when Lighthouse says so, never worked out from the date
  it("never calls a Delivery overdue when an older Lighthouse does not say", async () => {
    const { isOverdue: _notSent, ...older } = aDelivery({
      date: "2026-10-02T00:00:00Z",
      likelihoodPercentage: 12,
    });
    const lighthouse = oceanExplorersLighthouse({
      listDeliveries: ok([older]),
    });

    const result = await lighthouse.run(deliveriesOfOceanExplorer);

    expect(shownLines(result.stdout)).toContain(
      "Q4 Release [id: 11] Fri 2 Oct 2026 5 34 of 55 Work Items 12% Wed 16 Dec 2026",
    );
    expect(result.stdout).not.toContain("Overdue");
  });

  it("says '—' for the 85% forecast when Lighthouse sends none", async () => {
    const cell = await likelihoodCellOf({
      completionDates: [
        {
          probability: 50,
          expectedDate: "2026-12-09T00:00:00Z",
          filterApplied: false,
          excludedSummary: null,
        },
      ],
    });

    expect(cell.endsWith(" 78% —")).toBe(true);
  });

  // The web's own words for a Portfolio without Deliveries
  it("says Ocean Explorer has no Deliveries when the list is empty", async () => {
    const lighthouse = oceanExplorersLighthouse({ listDeliveries: ok([]) });

    const result = await lighthouse.run(deliveriesOfOceanExplorer);

    expect(result.exitCode).toBe(0);
    expect(shownLines(result.stdout)).toEqual([
      "Ocean Explorer · Deliveries",
      "No Deliveries",
    ]);
  });

  // The Portfolio is read only for its name, so losing it never loses the list
  it("heads the list with the Portfolio's id when its name cannot be read", async () => {
    const lighthouse = oceanExplorersLighthouse({
      getPortfolio: refused("forbidden", "You may not read this Portfolio"),
    });

    const result = await lighthouse.run(deliveriesOfOceanExplorer);

    expect(result.exitCode).toBe(0);
    expect(shownLines(result.stdout)[0]).toBe("Portfolio [id: 2] · Deliveries");
  });

  it("says it in the words an instance has renamed every term to", async () => {
    const lighthouse = oceanExplorersLighthouse({
      getTerminology: ok(terminology(EVERY_TERM_RENAMED)),
    });

    const result = await lighthouse.run(deliveriesOfOceanExplorer);

    const lines = shownLines(result.stdout);
    expect(lines[0]).toBe("Ocean Explorer · Releases");
    expect(lines[1]).toBe(
      "Name Release Date Outcomes Done Likelihood Forecast 85%",
    );
    expect(lines[2]).toContain("34 of 55 Tickets");
    expect(seededWordsIn(result.stdout)).toEqual([]);
  });

  // A calendar day is never shifted by the reader's time zone
  it.each(["America/Adak", "Pacific/Kiritimati"])(
    "dates each Delivery as Lighthouse does for a reader in %s",
    async (zone) => {
      const result = await inTimeZone(zone, () =>
        oceanExplorersLighthouse().run(deliveriesOfOceanExplorer),
      );

      expect(shownLines(result.stdout)[2]).toContain(
        "Tue 15 Dec 2026 5 34 of 55 Work Items 78% Wed 16 Dec 2026",
      );
    },
  );

  // A list the view cannot fully read prints as it came, never with a hole in it
  it("shows the list as it came when a Delivery arrives without its date", async () => {
    const recognised = await oceanExplorersLighthouse().run(
      deliveriesOfOceanExplorer,
    );
    expect(shownLines(recognised.stdout)[0]).toBe(
      "Ocean Explorer · Deliveries",
    );
    const { date: _notSent, ...undated } = aDelivery();
    const lighthouse = oceanExplorersLighthouse({
      listDeliveries: ok([undated]),
    });

    const result = await lighthouse.run(deliveriesOfOceanExplorer);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(looksLikeTheGenericView(result.stdout)).toBe(true);
  });
});

describe("lh delivery metrics --pretty", () => {
  // The metrics read carries no Delivery name, so its id heads the view
  it("shows Lena the Q4 Release day by day", async () => {
    const lighthouse = oceanExplorersLighthouse();

    const result = await lighthouse.run(daysOfTheQ4Release);

    expect(result.exitCode).toBe(0);
    expect(shownLines(result.stdout)).toEqual([
      "Delivery [id: 11] · Delivery Date Tue 15 Dec 2026 · recorded since Tue 15 Sep 2026",
      "Date Done Remaining Total Features Likelihood",
      "Tue 15 Sep 2026 12 43 55 5 41%",
      "Wed 16 Sep 2026 13 42 55 5 43%",
      "Tue 6 Oct 2026 34 21 55 3 78%",
    ]);
    expect(lighthouse.asked().sort()).toEqual([
      "getDeliveryMetricsHistory",
      "getTerminology",
    ]);
  });

  // Only the latest day in detail; every day's detail stays in --json
  it("adds the latest day's Features and chances with --detail epics", async () => {
    const lighthouse = oceanExplorersLighthouse();

    const result = await lighthouse.run([
      ...daysOfTheQ4Release,
      "--detail",
      "epics",
    ]);

    expect(result.exitCode).toBe(0);
    const lines = shownLines(result.stdout);
    expect(lines).toContain("Tue 6 Oct 2026 34 21 55 3 78%");
    const day = lines.indexOf("On Tue 6 Oct 2026");
    expect(lines.slice(day, day + 10)).toEqual([
      "On Tue 6 Oct 2026",
      "Feature Name Done Likelihood Size",
      "OE-001 Sonar mapping 100% — 12",
      "OE-002 Deep-sea camera stream 62% 81% 13",
      "OE-007 Pressure alarms 40% 74% 10 (default size)",
      "Chance Done by",
      "50% Wed 9 Dec 2026",
      "70% Mon 14 Dec 2026",
      "85% Wed 16 Dec 2026",
      "95% Tue 22 Dec 2026",
    ]);
  });

  // Days are recorded forward only, so a new Delivery has none to show yet
  it.each([
    { how: "summarised", flags: [] as string[] },
    { how: "in detail", flags: ["--detail", "epics"] },
  ])(
    "says 'No data yet.' under the heading before a first day is recorded ($how)",
    async ({ flags }) => {
      const lighthouse = oceanExplorersLighthouse({
        getDeliveryMetricsHistory: ok(
          q4ReleaseHistory({ firstSnapshotDate: null, points: [] }),
        ),
      });

      const result = await lighthouse.run([...daysOfTheQ4Release, ...flags]);

      expect(result.exitCode).toBe(0);
      expect(shownLines(result.stdout)).toEqual([
        "Delivery [id: 11] · Delivery Date Tue 15 Dec 2026",
        "No data yet.",
      ]);
    },
  );
});

// Scripts read --json and --toon, so the pretty views must never change them.
describe("lh delivery keeps the facts formats as they are", () => {
  it("hands scripts the Deliveries unchanged with --json and --toon, and asks only for them", async () => {
    const lighthouse = oceanExplorersLighthouse();

    const json = await lighthouse.run([...deliveriesOfOceanExplorer, "--json"]);
    const toon = await lighthouse.run([...deliveriesOfOceanExplorer, "--toon"]);

    expect(json.stdout).toBe(JSON.stringify(oceanExplorersDeliveries()));
    expect(toon.stdout).toBe(encode(oceanExplorersDeliveries() as never));
    expect(lighthouse.asked()).toEqual(["listDeliveries", "listDeliveries"]);
  });

  it("hands scripts the recorded days unchanged with --json, summarised and in detail", async () => {
    const lighthouse = oceanExplorersLighthouse();

    const summarised = await lighthouse.run([...daysOfTheQ4Release, "--json"]);
    const detailed = await lighthouse.run([
      ...daysOfTheQ4Release,
      "--detail",
      "epics",
      "--json",
    ]);

    expect(summarised.stdout).toMatchInlineSnapshot(
      `"[{"date":"2026-09-15T00:00:00Z","totalWork":55,"doneWork":12,"remainingWork":43,"epicCount":5,"estimatedItemCount":null,"likelihoodPercentage":41.2},{"date":"2026-09-16T00:00:00Z","totalWork":55,"doneWork":13,"remainingWork":42,"epicCount":5,"estimatedItemCount":null,"likelihoodPercentage":43},{"date":"2026-10-06T00:00:00Z","totalWork":55,"doneWork":34,"remainingWork":21,"epicCount":3,"estimatedItemCount":null,"likelihoodPercentage":78.2}]"`,
    );
    expect(detailed.stdout).toBe(JSON.stringify(q4ReleaseHistory()));
    expect(lighthouse.asked()).toEqual([
      "getDeliveryMetricsHistory",
      "getDeliveryMetricsHistory",
    ]);
  });
});
