import { describe, expect, it } from "vitest";
import {
  describeArchivedDeliveriesTitle,
  describeArchivedDeliveryHeadings,
  describeArchivedDeliveryRow,
  describeDeliveryCount,
  describeDeliveryDone,
  describeDeliveryFeatureHeadings,
  describeDeliveryFeatureRow,
  describeDeliveryListHeadings,
  describeDeliveryListTitle,
  describeDeliveryMetricsHeading,
  describeDeliveryRow,
  describeNoDeliveries,
  describeRecordedDayRow,
  latestRecordedDay,
  readArchivedDeliveryItem,
  readDeliveryList,
  readDeliveryMetricsHistory,
  readPortfolioDeliveries,
} from "./deliveryWording";
import { SEEDED_TERMS, type Terms } from "./terminology";

const lunarProbe = {
  id: 31,
  name: "Lunar Probe",
  date: "2027-01-12T00:00:00Z",
  features: [1, 2],
  totalWork: 40,
  remainingWork: 10,
  likelihoodPercentage: 64.4,
  teamsWithoutForecast: [],
  hasSufficientData: true,
  isOverdue: false,
  completionDates: [
    { probability: 50, expectedDate: "2027-01-04T00:00:00Z" },
    { probability: 85, expectedDate: "2027-01-19T00:00:00Z" },
  ],
};

describe("readDeliveryList", () => {
  it("picks each Delivery's header facts and its 85% date", () => {
    expect(readDeliveryList([lunarProbe])).toEqual([
      {
        id: 31,
        name: "Lunar Probe",
        date: "2027-01-12T00:00:00Z",
        featureCount: 2,
        totalWork: 40,
        remainingWork: 10,
        likelihood: 64.4,
        cannotBeForecast: false,
        hasSufficientData: true,
        isOverdue: false,
        likelyBy: "2027-01-19T00:00:00Z",
      },
    ]);
  });

  it("leaves what an older Lighthouse does not send undefined", () => {
    const {
      isOverdue: _a,
      hasSufficientData: _b,
      features: _c,
      completionDates: _d,
      ...older
    } = lunarProbe;

    expect(readDeliveryList([older])?.[0]).toMatchObject({
      featureCount: undefined,
      hasSufficientData: undefined,
      isOverdue: undefined,
      likelyBy: undefined,
    });
  });

  it.each(["id", "name", "date", "totalWork", "remainingWork"])(
    "reads no list when one Delivery comes without its %s",
    (fact) => {
      const { [fact as keyof typeof lunarProbe]: _notSent, ...partial } =
        lunarProbe;

      expect(readDeliveryList([lunarProbe, partial])).toBeNull();
    },
  );

  it("reads no list from an answer that is not one", () => {
    expect(readDeliveryList({ deliveries: [] })).toBeNull();
  });
});

const pilotLaunch = {
  id: 12,
  name: "Pilot Launch",
  date: "2026-08-30T00:00:00Z",
  portfolioId: 2,
  archivedOn: "2026-09-02T09:15:00Z",
  progress: 90,
  totalWork: 20,
  doneWork: 18,
  remainingWork: 2,
  likelihoodPercentage: 97.5,
  hasSufficientData: true,
  teamsWithoutForecast: [],
};

describe("readArchivedDeliveryItem", () => {
  it("picks the facts the archived table states", () => {
    expect(readArchivedDeliveryItem(pilotLaunch)).toEqual({
      id: 12,
      name: "Pilot Launch",
      date: "2026-08-30T00:00:00Z",
      archivedOn: "2026-09-02T09:15:00Z",
      totalWork: 20,
      doneWork: 18,
      likelihood: 97.5,
      cannotBeForecast: false,
      hasSufficientData: true,
    });
  });

  it("works the done work out of the remaining work when only that was sent, and leaves an unsent likelihood null", () => {
    const {
      doneWork: _done,
      likelihoodPercentage: _likelihood,
      ...older
    } = pilotLaunch;

    expect(readArchivedDeliveryItem(older)).toMatchObject({
      doneWork: 18,
      likelihood: null,
    });
  });

  it.each(["id", "name", "date", "archivedOn", "totalWork"])(
    "reads no row when the archived Delivery comes without its %s",
    (fact) => {
      const { [fact as keyof typeof pilotLaunch]: _notSent, ...partial } =
        pilotLaunch;

      expect(readArchivedDeliveryItem(partial)).toBeNull();
    },
  );

  it("reads no row when neither its done nor its remaining work was sent", () => {
    const { doneWork: _d, remainingWork: _r, ...partial } = pilotLaunch;

    expect(readArchivedDeliveryItem(partial)).toBeNull();
  });

  it("reads no row from an answer that is not one", () => {
    expect(readArchivedDeliveryItem("Pilot Launch")).toBeNull();
  });
});

describe("the archived Deliveries table", () => {
  const archived = (facts: Record<string, unknown> = {}) => {
    const item = readArchivedDeliveryItem({ ...pilotLaunch, ...facts });
    if (item === null) {
      throw new Error("the archived Delivery should read");
    }
    return item;
  };

  it("heads it and its columns in the instance's words", () => {
    const terms: Terms = {
      ...SEEDED_TERMS,
      delivery: "Release",
      deliveries: "Releases",
    };

    expect(describeArchivedDeliveriesTitle(terms)).toBe("Archived Releases");
    expect(describeArchivedDeliveryHeadings(terms)).toEqual([
      "Name",
      "Release Date",
      "Archived On",
      "Done",
      "Likelihood",
    ]);
  });

  it("states what the Delivery had reached the day it was archived", () => {
    expect(describeArchivedDeliveryRow(archived(), SEEDED_TERMS)).toEqual([
      "Pilot Launch [id: 12]",
      "Sun 30 Aug 2026",
      "Wed 2 Sep 2026",
      "18 of 20 Work Items",
      ">95%",
    ]);
  });

  it.each([
    {
      why: "it finished all its work",
      facts: { doneWork: 20, likelihoodPercentage: 100 },
      likelihood: "100%",
    },
    {
      why: "Lighthouse gave it no likelihood",
      facts: { likelihoodPercentage: null },
      likelihood: "Cannot forecast",
    },
    {
      why: "a team in it could not be forecast",
      facts: { teamsWithoutForecast: [7] },
      likelihood: "Cannot forecast",
    },
    {
      why: "work remained and the history was too thin",
      facts: { hasSufficientData: false, likelihoodPercentage: 40 },
      likelihood: "Not enough data",
    },
    {
      why: "work remained and the history was enough",
      facts: { hasSufficientData: true, likelihoodPercentage: 40 },
      likelihood: "40%",
    },
    {
      why: "the history was thin but no work remained",
      facts: {
        hasSufficientData: false,
        doneWork: 20,
        likelihoodPercentage: 100,
      },
      likelihood: "100%",
    },
  ])(
    "reads its likelihood as '$likelihood' when $why",
    ({ facts, likelihood }) => {
      expect(
        describeArchivedDeliveryRow(archived(facts), SEEDED_TERMS)[4],
      ).toBe(likelihood);
    },
  );
});

describe("readPortfolioDeliveries", () => {
  it("reads the active Deliveries and the archived ones apart", () => {
    expect(
      readPortfolioDeliveries({
        active: [lunarProbe],
        archived: [pilotLaunch],
      }),
    ).toEqual({
      active: [
        {
          id: 31,
          name: "Lunar Probe",
          date: "2027-01-12T00:00:00Z",
          featureCount: 2,
          totalWork: 40,
          remainingWork: 10,
          likelihood: 64.4,
          cannotBeForecast: false,
          hasSufficientData: true,
          isOverdue: false,
          likelyBy: "2027-01-19T00:00:00Z",
        },
      ],
      archived: [
        {
          id: 12,
          name: "Pilot Launch",
          date: "2026-08-30T00:00:00Z",
          archivedOn: "2026-09-02T09:15:00Z",
          totalWork: 20,
          doneWork: 18,
          likelihood: 97.5,
          cannotBeForecast: false,
          hasSufficientData: true,
        },
      ],
    });
  });

  it("reads nothing when one archived Delivery comes without a fact it needs", () => {
    const { archivedOn: _notSent, ...partial } = pilotLaunch;

    expect(
      readPortfolioDeliveries({
        active: [lunarProbe],
        archived: [pilotLaunch, partial],
      }),
    ).toBeNull();
  });

  it("reads nothing when one active Delivery comes without a fact it needs", () => {
    const { id: _notSent, ...partial } = lunarProbe;

    expect(
      readPortfolioDeliveries({ active: [partial], archived: [] }),
    ).toBeNull();
  });

  it.each([
    ["a list", [lunarProbe]],
    ["null", null],
    ["no archived list", { active: [lunarProbe] }],
  ])("reads nothing from %s", (_label, answer) => {
    expect(readPortfolioDeliveries(answer)).toBeNull();
  });
});

describe("the Deliveries list's words", () => {
  const renamed: Terms = {
    ...SEEDED_TERMS,
    delivery: "Release",
    deliveries: "Releases",
    portfolio: "Program",
    features: "Outcomes",
    workItem: "Ticket",
    workItems: "Tickets",
  };

  it("heads the list with the Portfolio's name, or its id when the name could not be read", () => {
    expect(
      describeDeliveryListTitle({ id: 4, name: "Lunar" }, SEEDED_TERMS),
    ).toBe(`Lunar · ${SEEDED_TERMS.deliveries}`);
    expect(describeDeliveryListTitle({ id: 4, name: undefined }, renamed)).toBe(
      "Program [id: 4] · Releases",
    );
  });

  it("names the columns and the empty list in the instance's words", () => {
    expect(describeDeliveryListHeadings(renamed)).toEqual([
      "Name",
      "Release Date",
      "Outcomes",
      "Done",
      "Likelihood",
      "Forecast 85%",
    ]);
    expect(describeNoDeliveries(renamed)).toBe("No Releases");
  });

  it.each([
    { count: 0, terms: SEEDED_TERMS, says: "No Deliveries" },
    { count: 1, terms: SEEDED_TERMS, says: "1 Delivery" },
    { count: 4, terms: SEEDED_TERMS, says: "4 Deliveries" },
    { count: 0, terms: renamed, says: "No Releases" },
    { count: 1, terms: renamed, says: "1 Release" },
  ])("counts $count Deliveries as '$says'", ({ count, terms, says }) => {
    expect(describeDeliveryCount(count, terms)).toBe(says);
  });

  it("counts the work done out of the whole", () => {
    expect(
      describeDeliveryDone({ totalWork: 40, remainingWork: 10 }, renamed),
    ).toBe("30 of 40 Tickets");
    expect(
      describeDeliveryDone({ totalWork: 1, remainingWork: 1 }, renamed),
    ).toBe("0 of 1 Ticket");
  });

  it("states a Delivery overdue and impossible to forecast as both", () => {
    const [stuck] =
      readDeliveryList([
        { ...lunarProbe, isOverdue: true, teamsWithoutForecast: ["Apollo"] },
      ]) ?? [];

    expect(describeDeliveryRow(stuck, renamed)).toEqual([
      "Lunar Probe [id: 31]",
      "Tue 12 Jan 2027",
      "2",
      "30 of 40 Tickets",
      "Overdue · Cannot forecast",
      "Tue 19 Jan 2027",
    ]);
  });
});

describe("a Delivery's recorded days", () => {
  const renamed: Terms = {
    ...SEEDED_TERMS,
    delivery: "Release",
    feature: "Outcome",
  };
  const aDay = (date: string, doneWork: number) => ({
    date,
    targetDateAtSnapshot: null,
    totalWork: 40,
    doneWork,
    remainingWork: 40 - doneWork,
    estimatedItemCount: null,
    forecastHowMany: null,
    likelihoodPercentage: 97.4,
    whenDistribution: null,
    featureBreakdown: [],
  });
  const lunarProbeDays = {
    deliveryDate: "2027-01-12T00:00:00Z",
    firstSnapshotDate: "2026-11-02T00:00:00Z",
    points: [
      aDay("2026-11-02T00:00:00Z", 4),
      aDay("2026-11-20T00:00:00Z", 22),
      aDay("2026-11-09T00:00:00Z", 9),
    ],
  };

  it("reads the history whole, and none when a day comes without its date", () => {
    expect(readDeliveryMetricsHistory(lunarProbeDays)).toBe(lunarProbeDays);
    const { date: _notSent, ...undated } = aDay("2026-11-03T00:00:00Z", 5);
    expect(
      readDeliveryMetricsHistory({ ...lunarProbeDays, points: [undated] }),
    ).toBeNull();
    const { deliveryDate: _gone, ...undue } = lunarProbeDays;
    expect(readDeliveryMetricsHistory(undue)).toBeNull();
  });

  it("picks the latest recorded day whatever order the days arrive in, and none before the first", () => {
    expect(latestRecordedDay(lunarProbeDays)?.doneWork).toBe(22);
    expect(
      latestRecordedDay({
        ...lunarProbeDays,
        firstSnapshotDate: null,
        points: [],
      }),
    ).toBeUndefined();
  });

  it("heads a Delivery with no recorded day by its id and date alone", () => {
    expect(
      describeDeliveryMetricsHeading(
        { ...lunarProbeDays, firstSnapshotDate: null, points: [] },
        31,
        renamed,
      ),
    ).toBe("Release [id: 31] · Release Date Tue 12 Jan 2027");
  });

  it("caps an open day's likelihood and leaves a size never recorded unknown", () => {
    expect(describeRecordedDayRow(aDay("2026-11-20T00:00:00Z", 22))).toEqual([
      "Fri 20 Nov 2026",
      "22",
      "18",
      "40",
      "0",
      ">95%",
    ]);
    expect(describeDeliveryFeatureHeadings(renamed)[0]).toBe("Outcome Name");
    expect(
      describeDeliveryFeatureRow({
        referenceId: "LP-3",
        name: "Lander telemetry",
        completion: 50,
        likelihood: 98,
      }),
    ).toEqual(["LP-3 Lander telemetry", "50%", ">95%", "—"]);
  });
});

describe("what a Delivery's facts must look like to be stated", () => {
  const aFeature = {
    referenceId: "LP-3",
    name: "Lander telemetry",
    completion: 50,
    likelihood: 64,
  };
  const aChance = { probability: 85, expectedDate: "2027-01-19T00:00:00Z" };
  const aDay = {
    date: "2026-11-20T00:00:00Z",
    targetDateAtSnapshot: null,
    estimatedItemCount: null,
    forecastHowMany: null,
    totalWork: 40,
    doneWork: 22,
    remainingWork: 18,
    likelihoodPercentage: 64.4,
    whenDistribution: [aChance],
    featureBreakdown: [aFeature],
  };
  const historyWith = (day: unknown) => ({
    deliveryDate: "2027-01-12T00:00:00Z",
    firstSnapshotDate: "2026-11-02T00:00:00Z",
    points: [aDay, day],
  });

  it("reads a history whose days carry every fact", () => {
    const history = historyWith(aDay);
    expect(readDeliveryMetricsHistory(history)).toBe(history);
    expect(
      readDeliveryMetricsHistory({ ...history, firstSnapshotDate: null }),
    ).not.toBeNull();
  });

  it.each([
    ["a recorded day that is not one", null],
    ["a day without its total", { ...aDay, totalWork: "40" }],
    ["a day without its done work", { ...aDay, doneWork: undefined }],
    ["a day without its remaining work", { ...aDay, remainingWork: null }],
    [
      "a likelihood that is not a number",
      { ...aDay, likelihoodPercentage: "64" },
    ],
    ["a Feature that is not one", { ...aDay, featureBreakdown: [null] }],
    [
      "a Feature without its reference",
      { ...aDay, featureBreakdown: [{ ...aFeature, referenceId: 3 }] },
    ],
    [
      "a Feature without its name",
      { ...aDay, featureBreakdown: [{ ...aFeature, name: undefined }] },
    ],
    [
      "a Feature without its completion",
      { ...aDay, featureBreakdown: [{ ...aFeature, completion: "50" }] },
    ],
    [
      "a Feature whose likelihood is not a number",
      { ...aDay, featureBreakdown: [{ ...aFeature, likelihood: "64" }] },
    ],
    ["a chance list that is not a list", { ...aDay, whenDistribution: "85" }],
    ["a chance that is not one", { ...aDay, whenDistribution: [null] }],
    [
      "a chance without its probability",
      { ...aDay, whenDistribution: [{ ...aChance, probability: "85" }] },
    ],
    [
      "one bad chance among good ones",
      { ...aDay, whenDistribution: [aChance, { probability: 95 }] },
    ],
  ])("reads no history with %s", (_case, day) => {
    expect(readDeliveryMetricsHistory(historyWith(day))).toBeNull();
  });

  it("reads no history whose first recorded day is not a date", () => {
    expect(
      readDeliveryMetricsHistory({
        ...historyWith(aDay),
        firstSnapshotDate: 5,
      }),
    ).toBeNull();
  });

  it("states no likelihood for a Delivery whose likelihood is not a number", () => {
    const [delivery] =
      readDeliveryList([{ ...lunarProbe, likelihoodPercentage: "64.4" }]) ?? [];

    expect(delivery.likelihood).toBeNull();
  });

  it("marks the Feature count as not sent when an older Lighthouse leaves the Features out", () => {
    const { features: _notSent, ...older } = lunarProbe;
    const [delivery] = readDeliveryList([older]) ?? [];

    expect(describeDeliveryRow(delivery, SEEDED_TERMS)[2]).toBe("—");
  });

  it("states a finished day's or Feature's likelihood without the cap an open one gets", () => {
    expect(
      describeRecordedDayRow({
        ...aDay,
        doneWork: 40,
        remainingWork: 0,
        likelihoodPercentage: 98.6,
        featureBreakdown: [],
      })[5],
    ).toBe("99%");
    expect(
      describeDeliveryFeatureRow({
        ...aFeature,
        completion: 100,
        likelihood: 98.6,
      })[2],
    ).toBe("99%");
  });
});
