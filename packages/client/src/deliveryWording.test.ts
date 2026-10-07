import { describe, expect, it } from "vitest";
import {
  describeDeliveryDone,
  describeDeliveryListHeadings,
  describeDeliveryListTitle,
  describeDeliveryRow,
  describeNoDeliveries,
  readDeliveryList,
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
