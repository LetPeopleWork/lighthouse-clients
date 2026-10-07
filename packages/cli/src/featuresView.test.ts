import { encode } from "@toon-format/toon";
import { describe, expect, it } from "vitest";
import {
  aFeature,
  EVERY_TERM_RENAMED,
  oe002sWorkItems,
  ok,
  refused,
  seededWordsIn,
  terminology,
  threeOceanExplorerFeatures,
} from "../../../test-support/lighthouseAnswers";
import {
  aLighthouse,
  looksLikeTheGenericView,
  shownLines,
} from "../test-support/cliHarness";

// Story 6218, slice 07 (US-07): Features as the Feature list shows them, and a Feature's Work Items.
// Every scenario but the format guards is pending until DELIVER slice 07 un-skips it.

const threeFeaturesByReference = [
  "feature",
  "get",
  "--refs",
  "OE-001,OE-002,OE-007",
];
const workItemsOfOE002 = ["feature", "workitems", "--id", "2"];

const marcosLighthouse = (reads = {}) =>
  aLighthouse({
    getFeaturesByReferences: ok(threeOceanExplorerFeatures()),
    getFeaturesByIds: ok([aFeature()]),
    getFeatureWorkItems: ok(oe002sWorkItems()),
    ...reads,
  });

const FEATURE_LIST_HEADER =
  "Feature Name Progress Forecasted Start Forecasted Completion (85%) State";

describe("lh feature get --pretty", () => {
  // @driving_port @US-07 @contract-shape:pure-function
  it.skip("shows Marco his Features as the Feature list shows them", async () => {
    const lighthouse = marcosLighthouse();

    const result = await lighthouse.run(threeFeaturesByReference);

    expect(result.exitCode).toBe(0);
    const lines = shownLines(result.stdout);
    expect(lines.slice(0, 3)).toEqual([
      FEATURE_LIST_HEADER,
      "OE-001 Sonar mapping 12 of 12 Work Items — — Done",
      "OE-002 Deep-sea camera stream 8 of 13 Work Items Mon 28 Sep 2026 Fri 20 Nov 2026 In Progress",
    ]);
    expect(lines[3]).toMatch(
      /^OE-007 Pressure alarms 4 of 10 Work Items .*Cannot forecast Planned$/u,
    );
    expect(lighthouse.asked().sort()).toEqual([
      "getFeaturesByReferences",
      "getTerminology",
    ]);
  });

  // @boundary @US-07 — ForecastedStartCell.tsx: an observed start outranks "cannot forecast"
  it.skip.each([
    {
      start: "an observed start",
      feature: {
        startForecast: {
          source: "Observed",
          observedDate: "2026-09-28T00:00:00Z",
          percentiles: [],
        },
        teamsWithoutForecast: ["Zenith"],
      },
      reads: "Mon 28 Sep 2026",
    },
    {
      start: "a forecast start",
      feature: {
        startForecast: {
          source: "Forecast",
          observedDate: null,
          percentiles: [50, 70, 85, 95].map((probability, index) => ({
            probability,
            expectedDate: `2026-10-${12 + index}T00:00:00Z`,
            filterApplied: false,
            excludedSummary: null,
          })),
        },
      },
      reads: "Wed 14 Oct 2026",
    },
    {
      start: "no start Lighthouse can name",
      feature: {
        startForecast: {
          source: "Unknown",
          observedDate: null,
          percentiles: [],
        },
      },
      reads: "—",
    },
    {
      start: "a Team without history and nothing observed",
      feature: {
        startForecast: {
          source: "Unknown",
          observedDate: null,
          percentiles: [],
        },
        teamsWithoutForecast: ["Zenith"],
        forecasts: [],
      },
      reads: "Cannot forecast",
    },
  ])(
    "reads the Forecasted Start of a Feature with $start as '$reads'",
    async ({ feature, reads }) => {
      const lighthouse = marcosLighthouse({
        getFeaturesByReferences: ok([aFeature(feature)]),
      });

      const lines = shownLines(
        (await lighthouse.run(["feature", "get", "--refs", "OE-002"])).stdout,
      );

      expect(lines[1]).toContain(` 8 of 13 Work Items ${reads} `);
    },
  );

  // @error @US-07 — D13: '—' when Lighthouse sends no 85% date
  it.skip("says '—' for the completion when Lighthouse sends no 85% date", async () => {
    const lighthouse = marcosLighthouse({
      getFeaturesByIds: ok([aFeature({ forecasts: [] })]),
    });

    const lines = shownLines(
      (await lighthouse.run(["feature", "get", "--ids", "2"])).stdout,
    );

    expect(lines[0]).toBe(FEATURE_LIST_HEADER);
    expect(lines[1]).toBe(
      "OE-002 Deep-sea camera stream 8 of 13 Work Items Mon 28 Sep 2026 — In Progress",
    );
  });

  // @US-07 @kpi — KPI-5
  it.skip("says it in the words an instance has renamed every term to", async () => {
    const lighthouse = marcosLighthouse({
      getTerminology: ok(terminology(EVERY_TERM_RENAMED)),
    });

    const list = await lighthouse.run(threeFeaturesByReference);
    const workItems = await lighthouse.run(workItemsOfOE002);

    expect(shownLines(list.stdout)[0]).toBe(
      "Outcome Name Progress Forecasted Start Forecasted Completion (85%) State",
    );
    expect(list.stdout).toContain("8 of 13 Tickets");
    expect(shownLines(workItems.stdout)[0]).toBe(
      "OE-002 Deep-sea camera stream · 3 Tickets",
    );
    expect(seededWordsIn(`${list.stdout}\n${workItems.stdout}`)).toEqual([]);
  });

  // @error @version-skew @US-07 — D5 + M1
  it.skip("shows the Features as they came when one arrives without its per-Team work", async () => {
    const recognised = await marcosLighthouse().run(threeFeaturesByReference);
    expect(shownLines(recognised.stdout)[0]).toBe(FEATURE_LIST_HEADER);
    const { totalWork: _notSent, ...withoutWork } = aFeature();
    const lighthouse = marcosLighthouse({
      getFeaturesByReferences: ok([withoutWork]),
    });

    const result = await lighthouse.run(threeFeaturesByReference);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(looksLikeTheGenericView(result.stdout)).toBe(true);
  });
});

describe("lh feature workitems --pretty", () => {
  // @driving_port @US-07 @contract-shape:pure-function — WorkItemsDialog.tsx
  it.skip("shows Marco the Work Items of OE-002 under the Feature's name", async () => {
    const lighthouse = marcosLighthouse();

    const result = await lighthouse.run(workItemsOfOE002);

    expect(result.exitCode).toBe(0);
    const lines = shownLines(result.stdout);
    expect(lines[0]).toBe("OE-002 Deep-sea camera stream · 3 Work Items");
    expect(lines[1].startsWith("ID Name Type State")).toBe(true);
    expect(lines[2]).toContain(
      "GR-061 Export flow report as PDF User Story In Progress",
    );
    expect(lines[3]).toContain(
      "VO-112 Stream reconnect on drop User Story Done",
    );
    expect(lines[4]).toContain("GR-070 Camera bitrate setting Bug Review");
    expect(lighthouse.asked().sort()).toEqual([
      "getFeatureWorkItems",
      "getFeaturesByIds",
      "getTerminology",
    ]);
  });

  // @error @infrastructure-failure @US-07 — C14: the heading survives a failed name read
  it.skip.each([
    {
      why: "is refused",
      answer: refused("forbidden", "You may not read this Feature"),
    },
    { why: "finds no Feature", answer: ok([]) },
  ])(
    "heads the Work Items with the Feature's id when the name read $why",
    async ({ answer }) => {
      const lighthouse = marcosLighthouse({ getFeaturesByIds: answer });

      const result = await lighthouse.run(workItemsOfOE002);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");
      expect(shownLines(result.stdout)[0]).toBe(
        "Feature [id: 2] · 3 Work Items",
      );
    },
  );
});

// Guards, green today and on every slice after (D4, KPI-2).
describe("lh feature keeps the facts formats as they are", () => {
  // @driving_port @US-07 @contract-shape:unbounded-preservation
  it("hands scripts the Features unchanged with --json and --toon", async () => {
    const lighthouse = marcosLighthouse();

    const json = await lighthouse.run([...threeFeaturesByReference, "--json"]);
    const toon = await lighthouse.run([...threeFeaturesByReference, "--toon"]);

    expect(json.stdout).toBe(JSON.stringify(threeOceanExplorerFeatures()));
    expect(toon.stdout).toBe(encode(threeOceanExplorerFeatures() as never));
    expect(lighthouse.asked()).toEqual([
      "getFeaturesByReferences",
      "getFeaturesByReferences",
    ]);
  });

  // @driving_port @US-07 @contract-shape:unbounded-preservation — AC-07.3: no Feature-name read
  it("hands scripts the Work Items unchanged with --json and --toon, without reading the Feature", async () => {
    const lighthouse = marcosLighthouse();

    const json = await lighthouse.run([...workItemsOfOE002, "--json"]);
    const toon = await lighthouse.run([...workItemsOfOE002, "--toon"]);

    expect(json.stdout).toBe(JSON.stringify(oe002sWorkItems()));
    expect(toon.stdout).toBe(encode(oe002sWorkItems() as never));
    expect(lighthouse.asked()).toEqual([
      "getFeatureWorkItems",
      "getFeatureWorkItems",
    ]);
  });
});
