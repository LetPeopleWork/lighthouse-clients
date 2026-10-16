import { describe, expect, it } from "vitest";
import {
  WIP_READ_WITH_STALENESS,
  WIP_READ_WITHOUT_STALENESS,
} from "../../../test-support/fakeLighthouse";
import { FEATURE_REQUIRES_SERVER_NEWER_THAN } from "./index";
import {
  describeStaleNow,
  describeWhatWipLeavesUnsaid,
  type InProgressItem,
  type InProgressNowView,
  type MetricLine,
  readInProgressItems,
} from "./metricsWording";
import { SEEDED_TERMS } from "./terminology";

// Lighthouse decides which Work Items are stale and says why; the client reads its answer and passes it on,
// never working staleness out itself. An older Lighthouse says nothing, which is not the same as none stale.

const TODAY = "2026-10-09";

const readOf = (body: string): InProgressNowView => {
  const now = readInProgressItems(JSON.parse(body), TODAY);
  if (now === null) {
    throw new Error("the WIP read was not read");
  }
  return now;
};

const withStaleness = () => readOf(WIP_READ_WITH_STALENESS);
const withoutStaleness = () => readOf(WIP_READ_WITHOUT_STALENESS);

const itemOf = (
  now: InProgressNowView,
  referenceId: string,
): InProgressItem => {
  const item = now.items.find((entry) => entry.referenceId === referenceId);
  if (item === undefined) {
    throw new Error(`${referenceId} was not read`);
  }
  return item;
};

// A headline line as the headline lays it out: the label, two spaces, the number.
const lineOf = (line: MetricLine | null): string | null =>
  line === null
    ? null
    : [line.label, line.value, line.detail]
        .filter((cell) => cell !== "")
        .join("  ");

describe("the client reads which Work Items Lighthouse marks stale", () => {
  // @us-03 @AC-1 @contract-shape:pure-function
  it("keeps a stale Work Item's reasons on the way through", () => {
    const now = withStaleness();

    expect(itemOf(now, "GR-058").isStale).toBe(true);
    expect(itemOf(now, "GR-058").staleReasons).toEqual([
      { kind: "TimeInState", days: 12, stateName: "Review" },
    ]);
    expect(itemOf(now, "GR-061").isStale).toBe(true);
    expect(itemOf(now, "GR-061").staleReasons).toEqual([
      { kind: "BlockedDuration", days: 6 },
      { kind: "TimeInStateWhileBlocked", days: 12, stateName: "In Progress" },
    ]);
    expect(itemOf(now, "GR-063").isStale).toBe(false);
    expect(itemOf(now, "GR-063").staleReasons).toEqual([]);
  });

  // @us-03 @AC-1 @error @contract-shape:pure-function
  it("drops a reason of a kind it does not know and keeps the Work Item", () => {
    const [stale] = JSON.parse(WIP_READ_WITH_STALENESS) as Record<
      string,
      unknown
    >[];
    const now = readInProgressItems(
      [
        {
          ...stale,
          isStale: true,
          staleReasons: [
            { kind: "SomethingNewer", days: 3 },
            { kind: "TimeInState", days: 12, stateName: "Review" },
          ],
        },
      ],
      TODAY,
    );

    expect(now?.items).toHaveLength(1);
    expect(now?.items[0]?.isStale).toBe(true);
    expect(now?.items[0]?.staleReasons).toEqual([
      { kind: "TimeInState", days: 12, stateName: "Review" },
    ]);
  });

  // @us-03 @AC-1 @error @contract-shape:pure-function
  it("reads an isStale that is not a boolean as not saying, and keeps the Work Item", () => {
    const [stale] = JSON.parse(WIP_READ_WITH_STALENESS) as Record<
      string,
      unknown
    >[];
    const now = readInProgressItems([{ ...stale, isStale: "yes" }], TODAY);

    expect(now?.items).toHaveLength(1);
    expect(now?.items[0]?.isStale).toBeUndefined();
  });

  // @us-03 @AC-3 @error @contract-shape:pure-function
  it("reads an older Lighthouse that says nothing about staleness as saying nothing", () => {
    const now = withoutStaleness();

    expect(now.items).toHaveLength(3);
    expect(now.items.map((item) => item.isStale)).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });
});

describe("the WIP headline counts the stale Work Items", () => {
  // @us-03 @AC-1 @contract-shape:pure-function
  it("carries the line 'Stale Work Items  2'", () => {
    expect(
      lineOf(describeStaleNow(withStaleness(), "team", SEEDED_TERMS)),
    ).toBe("Stale Work Items  2");
  });

  // @us-03 @AC-3 @error @contract-shape:pure-function
  it("carries no Stale line against an older Lighthouse", () => {
    expect(
      describeStaleNow(withoutStaleness(), "team", SEEDED_TERMS),
    ).toBeNull();
  });
});

describe("what the WIP answer leaves unsaid about staleness", () => {
  // @us-03 @AC-3 @error @contract-shape:pure-function
  it("says an older Lighthouse does not say which Work Items are stale", () => {
    expect(
      describeWhatWipLeavesUnsaid(withoutStaleness(), "team", SEEDED_TERMS, 6),
    ).toContain("Lighthouse does not say which Work Items are Stale.");
  });

  // @us-03 @AC-3 @contract-shape:pure-function
  it("does not call a Lighthouse that says silent", () => {
    expect(
      describeWhatWipLeavesUnsaid(
        withStaleness(),
        "team",
        SEEDED_TERMS,
        6,
      ).filter((sentence) => sentence.includes("Stale")),
    ).toEqual([]);
  });
});

describe("the version gate for staleness", () => {
  // @us-03 @AC-5 @contract-shape:pure-function
  // The fields first ship after this release; an older server is still read, as one that does not say.
  it("names the last Lighthouse release without the staleness fields", () => {
    expect(FEATURE_REQUIRES_SERVER_NEWER_THAN).toMatchObject({
      staleness: "v26.10.16.6",
    });
  });
});
