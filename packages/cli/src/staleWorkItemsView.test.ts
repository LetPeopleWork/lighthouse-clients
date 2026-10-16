import { describe, expect, it } from "vitest";
import { gravityBeforeTheDaily } from "../../../test-support/dailyFlowAnswers";
import {
  aFakeLighthouse,
  WIP_READ_WITH_STALENESS,
  WIP_READ_WITHOUT_STALENESS,
} from "../../../test-support/fakeLighthouse";
import { gravitysMetrics } from "../../../test-support/metricsAnswers";
import {
  aMachine,
  connectedTo,
  lhOn,
  NO_TERMINAL,
} from "../test-support/lhSession";

// `lh metrics team` passes on which Work Items Lighthouse marks stale, from a Lighthouse on a real socket that
// answers the Team's WIP read with the backend's own contract fixture. lh works nothing out itself.

const TEAM = 7;

const STALE_NOT_KNOWN = "Lighthouse does not say which Work Items are Stale.";

const wipOverTime = () => {
  const answer = gravitysMetrics().getTeamWipOverTime;
  return answer?.ok === true ? answer.value : null;
};

const lhAgainst = async (wipRead: string) => {
  const lighthouse = await aFakeLighthouse({
    replies: {
      [`GET /teams/${TEAM}`]: { status: 200, body: gravityBeforeTheDaily() },
      [`GET /teams/${TEAM}/metrics/wip`]: { status: 200, text: wipRead },
      [`GET /teams/${TEAM}/metrics/wipOverTime`]: {
        status: 200,
        body: wipOverTime(),
      },
    },
  });
  const lh = lhOn(await connectedTo(aMachine(), lighthouse.url), {
    terminal: NO_TERMINAL,
    env: { DO_NOT_TRACK: "1" },
  });
  return (...flags: string[]) =>
    lh.run(["metrics", "team", "--id", String(TEAM), ...flags]);
};

// The headline pads its columns; a line reads the same with every run of spaces as one.
const linesOf = (stdout: string): string[] =>
  stdout.split("\n").map((line) => line.replaceAll(/\s+/gu, " ").trim());

describe("lh passes on which Work Items Lighthouse marks stale", () => {
  // @driving_port @us-03 @AC-1 @contract-shape:bounded-change
  // The Blocked line, which the Stale line sits under, is the headline's: `--metrics wip` lists the Work
  // Items themselves.
  it.skip("shows the stale count in the headline, below the Blocked line", async () => {
    const run = await (await lhAgainst(WIP_READ_WITH_STALENESS))("--pretty");

    expect(run.exitCode).toBe(0);
    const lines = linesOf(run.stdout);
    const blocked = lines.indexOf("Blocked Work Items 1");
    expect(blocked).toBeGreaterThan(-1);
    expect(lines[blocked + 1]).toBe("Stale Work Items 2");
  });

  // @driving_port @us-03 @AC-1 @contract-shape:bounded-change
  it.skip("passes the staleness fields through untouched in JSON", async () => {
    const run = await (await lhAgainst(WIP_READ_WITH_STALENESS))(
      "--metrics",
      "wip",
      "--json",
    );

    expect(run.exitCode).toBe(0);
    const items = JSON.parse(run.stdout).wip.current.items as Record<
      string,
      unknown
    >[];
    const sent = JSON.parse(WIP_READ_WITH_STALENESS) as Record<
      string,
      unknown
    >[];
    expect(
      items.map(({ isStale, staleReasons }) => ({ isStale, staleReasons })),
    ).toEqual(
      sent.map(({ isStale, staleReasons }) => ({ isStale, staleReasons })),
    );
  });

  // @driving_port @us-03 @AC-3 @error @contract-shape:bounded-change
  it.skip("says an older Lighthouse does not say which are stale, and shows no Stale count", async () => {
    const run = await (await lhAgainst(WIP_READ_WITHOUT_STALENESS))(
      "--metrics",
      "wip",
      "--pretty",
    );

    expect(run.exitCode).toBe(0);
    const lines = linesOf(run.stdout);
    expect(lines).toContain(STALE_NOT_KNOWN);
    expect(
      lines.filter((line) => /^Stale Work Items:? \d+$/u.test(line)),
    ).toEqual([]);
  });
});
