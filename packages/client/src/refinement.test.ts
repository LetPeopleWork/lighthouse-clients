import { describe, expect, it } from "vitest";
import { createLighthouseClient } from "./index";

// Team Gravity on Tue 6 Oct: 3 Work Items ready against the 5–8 it is likely to pull from its next
// Refinement on Thu 8 Oct to the one after. The facts exactly as the server sends them.
const gravitysRefinement = {
  refinementConfigured: true,
  workItems: [
    {
      referenceId: "GR-051",
      name: "PDF export",
      url: null,
      state: "Refinement",
      parentReferenceId: "GR-010",
      voteCount: 2,
      myVote: null,
      split: { yes: 2, yesBut: 0, no: 0 },
      readiness: "MoreYesNeeded",
      missingVotes: 1,
      stage: null,
      signalsDisagree: false,
      hasComments: false,
      hasOpenQuestion: false,
    },
  ],
  yardstick: { source: "Sle", days: 7, probability: 85 },
  voterIdentity: "SelfDeclared",
  readyByVotesCount: 3,
  stagesConfigured: false,
  readyCount: 3,
  readySource: "Votes",
  nextRefinementDate: "2026-10-08",
  isRefinementDay: false,
  daysUntilNextRefinement: 2,
  need: {
    verdict: "Below",
    unavailableReason: null,
    low: 5,
    high: 8,
    lowPercentile: 50,
    highPercentile: 85,
    horizonWorkingDays: 5,
    cycleStart: "2026-10-08",
    cycleEnd: "2026-10-15",
  },
};

const renamedTerminology = [
  {
    id: 1,
    key: "workItem",
    description: "",
    defaultValue: "Work Item",
    value: "Story",
  },
  {
    id: 22,
    key: "refinement",
    description: "",
    defaultValue: "Refinement",
    value: "Grooming",
  },
];

const VERSION_PATH = "/v1/version/current";

// The last released Lighthouse that has no refinement read; every server newer than it has one.
const LAST_SERVER_WITHOUT_REFINEMENT = "v26.10.3.6";
const FIRST_SERVER_WITH_REFINEMENT = "v26.10.7.1";

type MockResponse = {
  readonly ok: boolean;
  readonly status: number;
  readonly text: () => Promise<string>;
  readonly json: () => Promise<unknown>;
};

const answering = (payload: unknown, status = 200): MockResponse => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () =>
    typeof payload === "string" ? payload : JSON.stringify(payload),
  json: async () => payload,
});

// One instance answering by path, so the test does not depend on the order the client asks in.
const aLighthouseAnswering = (
  serverVersion: string,
  answers: Readonly<Record<string, MockResponse>>,
) => {
  const requestedUrls: string[] = [];
  const fetch = async (url: string): Promise<MockResponse> => {
    requestedUrls.push(url);
    if (url.endsWith(VERSION_PATH)) {
      return answering(serverVersion);
    }
    const path = Object.keys(answers).find((candidate) =>
      url.endsWith(candidate),
    );
    return path === undefined ? answering("not found", 404) : answers[path];
  };
  const client = createLighthouseClient(
    {
      connection: { kind: "explicit", lighthouseUrl: "http://localhost:5000" },
    },
    { fetch },
  );
  const asksOtherThanTheVersion = () =>
    requestedUrls.filter((url) => !url.endsWith(VERSION_PATH));
  return { client, asksOtherThanTheVersion };
};

describe("the refinement need through the client", () => {
  it.skip("hands over the refinement facts for a Team exactly as the server sent them", async () => {
    const lighthouse = aLighthouseAnswering(FIRST_SERVER_WITH_REFINEMENT, {
      "/v1/teams/3/refinement": answering(gravitysRefinement),
    });

    const result = await lighthouse.client.getTeamRefinement(3);

    expect(result).toEqual({ ok: true, value: gravitysRefinement });
    expect(lighthouse.asksOtherThanTheVersion()).toEqual([
      "http://localhost:5000/api/v1/teams/3/refinement",
    ]);
  });

  it.skip("tells the caller to upgrade a Lighthouse that has no refinement yet, without asking it", async () => {
    const lighthouse = aLighthouseAnswering(LAST_SERVER_WITHOUT_REFINEMENT, {
      "/v1/teams/3/refinement": answering(gravitysRefinement),
    });

    const result = await lighthouse.client.getTeamRefinement(3);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected the client to refuse an older Lighthouse");
    }
    expect(result.error.category).toBe("misconfigured");
    expect(result.error.reason.toLowerCase()).toContain("refinement");
    expect(result.error.reason.toLowerCase()).toContain("upgrade lighthouse");
    expect(lighthouse.asksOtherThanTheVersion()).toEqual([]);
  });

  it.skip("hands over the words the instance uses for its terms", async () => {
    const lighthouse = aLighthouseAnswering(FIRST_SERVER_WITH_REFINEMENT, {
      "/v1/terminology/all": answering(renamedTerminology),
    });

    const result = await lighthouse.client.getTerminology();

    expect(result).toEqual({ ok: true, value: renamedTerminology });
  });

  it.skip("reports a failed terminology read as a failure the caller can fall back from", async () => {
    const lighthouse = aLighthouseAnswering(FIRST_SERVER_WITH_REFINEMENT, {
      "/v1/terminology/all": answering("boom", 500),
    });

    const result = await lighthouse.client.getTerminology();

    expect(result.ok).toBe(false);
  });
});
