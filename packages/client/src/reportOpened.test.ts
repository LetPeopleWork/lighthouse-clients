import { describe, expect, it } from "vitest";
import type { LighthouseApiResult } from "./index";
import { reportOpenedOccurrencesOf } from "./usageData";

// Only a report Lighthouse sent, of a type this version names, counts as opened, and only by its type.
describe("which report a read opened", () => {
  it("counts a Then & Now report by its type and nothing else", () => {
    expect(
      reportOpenedOccurrencesOf({
        ok: true,
        value: { id: 1, name: "Engagement start", templateKey: "then-and-now" },
      }),
    ).toEqual([{ name: "ReportOpened", reportTemplate: "ThenAndNow" }]);
  });

  it.each<[string, LighthouseApiResult<unknown>]>([
    [
      "a refused read",
      { ok: false, error: { category: "unauthorized", reason: "no access" } },
    ],
    ["an answer that is no report", { ok: true, value: null }],
    ["a list", { ok: true, value: [{ templateKey: "then-and-now" }] }],
    [
      "a report of a type it does not know",
      { ok: true, value: { templateKey: "signals" } },
    ],
    ["a report without its type", { ok: true, value: { id: 1 } }],
    [
      "a report whose type is the web's word",
      { ok: true, value: { templateKey: "ThenAndNow" } },
    ],
  ])("counts nothing for %s", (_what, answered) => {
    expect(reportOpenedOccurrencesOf(answered)).toEqual([]);
  });
});
