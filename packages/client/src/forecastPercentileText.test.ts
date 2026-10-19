import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  describeDeliveryChanceRow,
  describeDeliveryRow,
  readDeliveryList,
  readDeliveryMetricsHistory,
} from "./deliveryWording";
import {
  describeFeatureCompletion,
  describeFeatureStart,
  readFeatureList,
} from "./featureWording";
import {
  describePercentileDate,
  moreThanYearsText,
  yearsBeyondHorizon,
} from "./forecastPercentileText";
import { readManualForecast } from "./forecastWording";
import { SEEDED_TERMS } from "./terminology";

const STAND_IN = "2031-10-19T00:00:00Z";

describe("describePercentileDate", () => {
  it("says more than the horizon's years for a percentile beyond it, never its stand-in date", () => {
    expect(
      describePercentileDate({
        expectedDate: STAND_IN,
        beyondHorizon: true,
        horizonYears: 5,
      }),
    ).toBe("More than 5 years");
  });

  it("takes the number from horizonYears, never a fixed 5", () => {
    expect(
      describePercentileDate({
        expectedDate: STAND_IN,
        beyondHorizon: true,
        horizonYears: 7,
      }),
    ).toBe("More than 7 years");
  });

  it("states the day of a percentile within the horizon", () => {
    expect(
      describePercentileDate({
        expectedDate: STAND_IN,
        beyondHorizon: false,
        horizonYears: 5,
      }),
    ).toBe("Sun 19 Oct 2031");
  });

  it("states the day exactly as before when an older Lighthouse sends no flag", () => {
    expect(describePercentileDate({ expectedDate: STAND_IN })).toBe(
      "Sun 19 Oct 2031",
    );
  });

  it("keeps the day when the flag comes without a horizon to name", () => {
    expect(
      describePercentileDate({
        expectedDate: STAND_IN,
        beyondHorizon: true,
        horizonYears: null,
      }),
    ).toBe("Sun 19 Oct 2031");
  });
});

describe("yearsBeyondHorizon", () => {
  it.each([
    { percentile: undefined, years: undefined },
    {
      percentile: { beyondHorizon: "true", horizonYears: 5 },
      years: undefined,
    },
    {
      percentile: { beyondHorizon: true, horizonYears: "5" },
      years: undefined,
    },
    { percentile: { beyondHorizon: false, horizonYears: 5 }, years: undefined },
    { percentile: { beyondHorizon: true, horizonYears: 5 }, years: 5 },
  ])("reads $percentile as $years", ({ percentile, years }) => {
    expect(yearsBeyondHorizon(percentile)).toBe(years);
  });
});

describe("moreThanYearsText", () => {
  it("names the horizon in the web app's words", () => {
    expect(moreThanYearsText(5)).toBe("More than 5 years");
  });
});

// Consumer-driven contract: the answers a Lighthouse that marks the horizon sends, and one that does not,
// built from the server's WhenForecastDto, FeatureStartDto, DeliveryWithLikelihoodDto and
// WhenDistributionPointDto.
const recorded = (name: string) =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../../test-support/forecastHorizonContract/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ) as Record<string, unknown>;

const WITH_HORIZON = recorded("forecasts-with-horizon");
const WITHOUT_HORIZON = recorded("forecasts-without-horizon");

describe("a Lighthouse that marks the horizon", () => {
  it("still has its manual forecast read, flags and all", () => {
    const forecast = readManualForecast(WITH_HORIZON.manualForecast);

    expect(forecast?.whenForecasts.map(describePercentileDate)).toEqual([
      "Mon 4 Mar 2030",
      "Mon 10 Feb 2031",
      "More than 5 years",
      "More than 5 years",
    ]);
  });

  it("says more than 5 years where a Feature starts or ends beyond it", () => {
    const [feature] = readFeatureList(WITH_HORIZON.features) ?? [];

    expect(feature && describeFeatureStart(feature)).toBe("More than 5 years");
    expect(feature && describeFeatureCompletion(feature)).toBe(
      "More than 5 years",
    );
  });

  it("says more than 5 years in a Delivery's 85% column", () => {
    const [delivery] = readDeliveryList(WITH_HORIZON.deliveries) ?? [];

    expect(delivery && describeDeliveryRow(delivery, SEEDED_TERMS)).toContain(
      "More than 5 years",
    );
  });

  it("says more than 5 years for a recorded day's chance beyond it", () => {
    const history = readDeliveryMetricsHistory(
      WITH_HORIZON.deliveryMetricsHistory,
    );

    expect(
      history?.points[0]?.whenDistribution?.map(describeDeliveryChanceRow),
    ).toEqual([
      ["50%", "Mon 4 Mar 2030"],
      ["85%", "More than 5 years"],
    ]);
  });
});

describe("an older Lighthouse that sends no horizon", () => {
  it("has its manual forecast read and dated exactly as before", () => {
    const forecast = readManualForecast(WITHOUT_HORIZON.manualForecast);

    expect(forecast?.whenForecasts.map(describePercentileDate)).toEqual([
      "Mon 4 Mar 2030",
      "Mon 10 Feb 2031",
      "Sun 19 Oct 2031",
      "Sun 19 Oct 2031",
    ]);
  });

  it("dates a Feature's start and end as before", () => {
    const [feature] = readFeatureList(WITHOUT_HORIZON.features) ?? [];

    expect(feature && describeFeatureStart(feature)).toBe("Sun 19 Oct 2031");
    expect(feature && describeFeatureCompletion(feature)).toBe(
      "Sun 19 Oct 2031",
    );
  });

  it("dates a Delivery's 85% column as before", () => {
    const [delivery] = readDeliveryList(WITHOUT_HORIZON.deliveries) ?? [];

    expect(delivery && describeDeliveryRow(delivery, SEEDED_TERMS)).toContain(
      "Sun 19 Oct 2031",
    );
  });

  it("dates a recorded day's chances as before", () => {
    const history = readDeliveryMetricsHistory(
      WITHOUT_HORIZON.deliveryMetricsHistory,
    );

    expect(
      history?.points[0]?.whenDistribution?.map(describeDeliveryChanceRow),
    ).toEqual([
      ["50%", "Mon 4 Mar 2030"],
      ["85%", "Sat 18 Oct 2031"],
    ]);
  });
});
