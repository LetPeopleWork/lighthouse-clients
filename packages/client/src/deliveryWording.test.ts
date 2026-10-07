import { describe, expect, it } from "vitest";
import {
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
  readDeliveryList,
  readDeliveryMetricsHistory,
} from "./deliveryWording";
import { resolveTerms, SEEDED_TERMS } from "./terminology";

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

describe("the Deliveries list's words", () => {
  const renamed = resolveTerms([
    { key: "delivery", defaultValue: "Delivery", value: "Release" },
    { key: "deliveries", defaultValue: "Deliveries", value: "Releases" },
    { key: "portfolio", defaultValue: "Portfolio", value: "Program" },
    { key: "features", defaultValue: "Features", value: "Outcomes" },
    { key: "workItem", defaultValue: "Work Item", value: "Ticket" },
    { key: "workItems", defaultValue: "Work Items", value: "Tickets" },
  ] as never);

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
  const renamed = resolveTerms([
    { key: "delivery", defaultValue: "Delivery", value: "Release" },
    { key: "feature", defaultValue: "Feature", value: "Outcome" },
  ] as never);
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
