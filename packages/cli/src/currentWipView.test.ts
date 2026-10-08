import { describe, expect, it } from "vitest";
import {
  gravityBeforeTheDaily,
  gravitysWorkInProgressToday,
  voyager,
  workInProgressWithoutBlockedFacts,
} from "../../../test-support/dailyFlowAnswers";
import {
  aFakeLighthouse,
  type FakeLighthouse,
} from "../../../test-support/fakeLighthouse";
import { gravitysMetrics } from "../../../test-support/metricsAnswers";
import {
  aMachine,
  connectedTo,
  lhOn,
  NO_TERMINAL,
} from "../test-support/lhSession";

// `lh metrics team --metrics wip` and the MCP read of what is in progress now share one wording, so the view
// lh prints gains the three sentences an assistant is told when there is less to say.

const RANGE = ["--start-date", "2026-09-09", "--end-date", "2026-10-08"];

const NO_WIP_LIMIT = "No System WIP Limit is set.";
const BLOCKED_NOT_KNOWN =
  "Lighthouse does not say which Work Items are Blocked.";
const NOTHING_IN_PROGRESS = "No Work Items are in progress.";

const aTeamsLighthouse = (id: number, team: unknown, workInProgress: unknown) =>
  aFakeLighthouse({
    replies: {
      [`GET /teams/${id}`]: { status: 200, body: team },
      [`GET /teams/${id}/metrics/wip`]: { status: 200, body: workInProgress },
      [`GET /teams/${id}/metrics/wipOverTime`]: {
        status: 200,
        body: wipOverTime(),
      },
    },
  });

const wipOf = async (lighthouse: FakeLighthouse, id: number) =>
  lhOn(await connectedTo(aMachine(), lighthouse.url), {
    terminal: NO_TERMINAL,
    env: { DO_NOT_TRACK: "1" },
  }).run([
    "metrics",
    "team",
    "--id",
    String(id),
    ...RANGE,
    "--metrics",
    "wip",
    "--pretty",
  ]);

const prose = (stdout: string): string => stdout.replaceAll(/\s+/gu, " ");

const wipOverTime = () => {
  const answer = gravitysMetrics().getTeamWipOverTime;
  return answer?.ok === true ? answer.value : null;
};

describe("lh says what an assistant is told when there is less to say about WIP", () => {
  // @error @real-io @contract-shape:bounded-change
  it("tells a Team without a System WIP Limit that none is set", async () => {
    const run = await wipOf(
      await aTeamsLighthouse(6, voyager(), gravitysWorkInProgressToday()),
      6,
    );

    expect(run.exitCode).toBe(0);
    expect(prose(run.stdout)).toContain(NO_WIP_LIMIT);
  });

  // @error @real-io @contract-shape:bounded-change
  // A Team that could not be read may well have a limit, so its absence is not claimed.
  it("says nothing about the System WIP Limit when the Team cannot be read", async () => {
    const lighthouse = await aFakeLighthouse({
      replies: {
        "GET /teams/3": { status: 500 },
        "GET /teams/3/metrics/wip": {
          status: 200,
          body: gravitysWorkInProgressToday(),
        },
        "GET /teams/3/metrics/wipOverTime": {
          status: 200,
          body: wipOverTime(),
        },
      },
    });

    const run = await wipOf(lighthouse, 3);

    expect(run.exitCode).toBe(0);
    expect(prose(run.stdout)).toContain("Work Items in Progress: 8");
    expect(prose(run.stdout)).not.toContain(NO_WIP_LIMIT);
  });

  // @error @real-io @contract-shape:bounded-change
  it("says Lighthouse does not tell which Work Items are Blocked, rather than showing none Blocked", async () => {
    const run = await wipOf(
      await aTeamsLighthouse(
        3,
        gravityBeforeTheDaily(),
        workInProgressWithoutBlockedFacts(),
      ),
      3,
    );

    expect(prose(run.stdout)).toContain(BLOCKED_NOT_KNOWN);
  });

  // @error @real-io @contract-shape:bounded-change
  it("says nothing is in progress when nothing is", async () => {
    const run = await wipOf(
      await aTeamsLighthouse(3, gravityBeforeTheDaily(), []),
      3,
    );

    expect(run.exitCode).toBe(0);
    expect(prose(run.stdout)).toContain(NOTHING_IN_PROGRESS);
  });

  // @real-io @contract-shape:bounded-change
  // A Team with a limit, Blocked facts and Work Items in progress gets none of the three: the view it gets
  // today is the view it keeps.
  it("adds none of them when there is everything to say", async () => {
    const run = await wipOf(
      await aTeamsLighthouse(
        3,
        gravityBeforeTheDaily(),
        gravitysWorkInProgressToday(),
      ),
      3,
    );

    for (const sentence of [
      NO_WIP_LIMIT,
      BLOCKED_NOT_KNOWN,
      NOTHING_IN_PROGRESS,
    ]) {
      expect(prose(run.stdout)).not.toContain(sentence);
    }
    expect(prose(run.stdout)).toContain("System WIP Limit: 6 Work Items");
  });
});
