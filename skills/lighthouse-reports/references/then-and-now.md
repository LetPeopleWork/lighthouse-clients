# Then & Now: how Lighthouse shows it

A Then & Now report (`templateKey` `then-and-now`) sets two windows of a Team's or Portfolio's flow side by side:
Then, captured when the report was made, and Now. The answer you read holds raw values; Lighthouse's web app rounds
them, gives them their units and works out each change by the rules below. Follow them exactly, so that your page
shows what the Reports tab and its PDF show, never more precise and never rounded differently.

Every rule here is a copy of the web app's own, and each names where it is copied from, so that a change on either
side can be found from the other. The sources are in Lighthouse's repository,
https://github.com/LetPeopleWork/Lighthouse, under `Lighthouse.Frontend/src/pages/Common/Reports/`.

## Contents

1. [Where each rule comes from](#where-each-rule-comes-from)
2. [Which metrics, in which order](#which-metrics-in-which-order)
3. [The lines of each metric](#the-lines-of-each-metric)
4. [Rounding and units](#rounding-and-units)
5. [The change and the percent change](#the-change-and-the-percent-change)
6. [Marks](#marks)
7. [Dashes and their reasons](#dashes-and-their-reasons)
8. [The summary](#the-summary)
9. [The layout](#the-layout)

## Where each rule comes from

Paths are relative to `Lighthouse.Frontend/src/pages/Common/Reports/`.

| Rule | Source (file → symbol) |
|---|---|
| Which metrics, their titles and their order | `panels/reportPanelRegistry.ts` → `METRIC_CATALOG`, `reportPanelRegistry[*].titleOf`, `inCatalogOrder`; `panels/ReportPanels.tsx` |
| Which way is better | `panels/reportPanelRegistry.ts` → `reportPanelRegistry[*].directionOfGood` |
| Cycle Time's lines and decimals | `panels/CycleTimePanel.tsx` → `PERCENTILES`, `DECIMALS` |
| Throughput's lines, decimals and unit | `panels/ThroughputPanel.tsx` → `CHANGE_LINES`, `TOTAL_DECIMALS`, `PER_DAY_DECIMALS`, `perDayText`, `totalText`, `absenceNotesOf` |
| WIP's and Total Work Item Age's lines and decimals | `panels/DailySpreadPanel.tsx` → `SPREAD_LINES`, `DECIMALS` |
| Units | `panels/thenNowComparison.ts` → `daysText`; `panels/ThroughputPanel.tsx` → `perDayText`; `panels/WipPanel.tsx` → `plainNumber`; `panels/WorkItemAgePanel.tsx` → `daysText` |
| Rounding | `panels/thenNowComparison.ts` → `roundForDisplay`, `shownValue`, `shownText` |
| The change and the percent change, "No change" and "Then was 0" | `panels/thenNowComparison.ts` → `compareThenNow`, `changeText`, `signed`, `lineComparisonsOf`; `panels/ThenNowLineParts.tsx` → `LineChange`, `LineChanges` |
| Better, worse or neither, per line | `panels/thenNowComparison.ts` → `verdictOf`, `markOf` |
| Which mark goes with which change | `panels/ChangeMarkIcon.tsx` → `ICON_OF`, `SPOKEN_AS`; `ThenAndNowSummary.tsx` → `CHANGE_KIND_LOOK` |
| Dashes and their reasons | `panels/thenNowComparison.ts` → `DASH`, `reasonTexts`, `absenceTextOf`, `distinctAbsenceNotesOf`; `panels/UnsupportedMetricPanel.tsx` |
| The summary groups | `panels/changeSummary.ts` → `summariseChange`, `kindOf`, `KIND_ORDER`; `ThenAndNowSummary.tsx` → `CHANGE_KIND_LOOK`, `SummaryChange` |
| The window lines and how many Work Items closed | `ThenAndNowSummary.tsx` → `windowLineOf`, `closedCountOf`; `wizard/thenAndNow/thenAndNowDraft.ts` → `windowDaysOf` |

When any of these sources changes, or Then & Now gains a metric, this file changes with it and the skill's evals
run again.

## Which metrics, in which order

Show only the metrics the report lists in `shownMetricKeys`, always in this order, whatever order the list has
(`panels/reportPanelRegistry.ts` → `METRIC_CATALOG`, `inCatalogOrder`):

| Key | Title | Better when it is |
|---|---|---|
| `cycle-time` | Cycle Time | lower |
| `throughput` | Throughput | higher |
| `wip` | WIP | lower |
| `work-item-age` | Total Work Item Age ("Total" and the instance's word for Work Item Age) | lower |

Each title is the instance's own word for the metric (`titleOf`): an instance that calls Cycle Time "Lead Time" gets
a block titled "Lead Time", and nothing else. A key this list does not have comes from a newer Lighthouse: it goes
last, titled by its key, with the one line "This metric can't be shown in this version of Lighthouse."
(`panels/UnsupportedMetricPanel.tsx`). A listed metric the report holds no values for reads as a dash on every line
(`panels/ReportPanels.tsx` → `NOTHING_CAPTURED`).

## The lines of each metric

Each metric's lines, in this order. Each line's value is in `metrics.<key>.atThen.<field>.value` and
`metrics.<key>.atNow.<field>.value`.

| Metric | Line label | Field | Decimals | Compared |
|---|---|---|---|---|
| Cycle Time (`panels/CycleTimePanel.tsx` → `PERCENTILES`) | 95th | `p95` | 0 | yes |
| | 85th | `p85` | 0 | yes |
| | 70th | `p70` | 0 | yes |
| | 50th | `p50` | 0 | yes |
| Throughput (`panels/ThroughputPanel.tsx` → `CHANGE_LINES`) | Total | `total` | 0 (`TOTAL_DECIMALS`) | no |
| | Per day | `perDay` | 2 (`PER_DAY_DECIMALS`) | yes, the one compared line |
| WIP and Total Work Item Age (`panels/DailySpreadPanel.tsx` → `SPREAD_LINES`) | Average | `average` | 0 | yes |
| | Median | `median` | 0 | yes |
| | Min | `min` | 0 | yes |
| | Max | `max` | 0 | yes |

A line that is not compared has no change and no percent: Throughput's total is shown on both sides and its Change
cell stays empty.

## Rounding and units

**Rounding** (`panels/thenNowComparison.ts` → `roundForDisplay`, `shownValue`): round each value to its line's
decimals, halves away from zero, so 0.125 → 0.13 and −0.125 → −0.13. Show the rounded value only, never the raw one
and never with more decimals than its line has.

**Units**:

- Cycle Time and Total Work Item Age: "N days", and "1 day" for exactly one (`panels/thenNowComparison.ts` →
  `daysText`; `panels/WorkItemAgePanel.tsx`). "0 days", "1 day", "12 days".
- Throughput per day: the number with exactly two decimals, then "per day" (`panels/ThroughputPanel.tsx` →
  `perDayText`). "0.58 per day", "1.00 per day".
- Throughput total: the count and the instance's word for Work Items, singular for one (`totalText`). "52 Work
  Items", "1 Work Item".
- WIP: the plain number, no unit (`panels/WipPanel.tsx` → `plainNumber`). "9".

## The change and the percent change

Worked out from the **rounded** values, never the raw ones (`panels/thenNowComparison.ts` → `compareThenNow`,
`lineComparisonsOf`):

1. **Change** = rounded Now − rounded Then, rounded again to the line's decimals.
2. **Percent** = change ÷ rounded Then × 100, rounded to a whole number, halves away from zero.
3. **Which way is better** (`verdictOf`): a change of 0 is neither. A fall is better for a metric that is better
   lower (Cycle Time, WIP, Total Work Item Age) and worse for Throughput; a rise the other way round.

How each case reads (`changeText`, `signed`, and `panels/ThenNowLineParts.tsx` → `LineChange`):

| Case | Change cell | % cell |
|---|---|---|
| A fall | the mark ▼ and the size without a sign, in the line's unit: "▼ 9 days" | the percent signed with a true minus, a space before the sign: "−43 %" |
| A rise | "▲ 0.14 per day" | "+24 %" |
| A change whose percent rounds to nothing | "▲ 0.01 per day" | "0 %" (never "+0 %" or "−0 %") |
| Rounded Then is 0 | the change as usual: "▲ 3 days" | "Then was 0" (never a percent, never "Infinity") |
| Rounded values equal | "No change" | empty |
| Either side is a dash | "—" | empty |
| A line that is not compared | empty | empty |

The size in the Change cell is the change without its sign, in its unit at its decimals: "9 days", "0.14 per day",
"2" for WIP. The sign of a fall is the mark and the percent's true minus "−" (U+2212), never a hyphen.

## Marks

The web draws its marks as icons, so they look the same on every machine and in every PDF. A text answer writes the
same marks as characters (`panels/ChangeMarkIcon.tsx` → `ICON_OF` says which icon each kind of change gets):

| Kind | Web icon | Write |
|---|---|---|
| A line rose (`up`) | arrow up, read aloud as "rose" | ▲ |
| A line fell (`down`) | arrow down, read aloud as "fell" | ▼ |
| A line did not change (`none`) | a flat bar | nothing: "No change" says it, and a bar would read as a missing value's dash |
| A metric improved | a tick | ✔ |
| A metric got worse | a cross | ✘ |
| A metric is mixed | plus-minus | ± |
| A metric is unchanged | a flat bar | nothing: "Unchanged" says it |

The web colours only a change's mark and words: green for better, red for worse, grey for neither
(`panels/ThenNowLineParts.tsx` → `verdictColours`). Where your page has colour, colour the same way; the mark and the
words must carry the meaning without it.

## Dashes and their reasons

A value with no number (`value` null or missing) reads "—" (`panels/thenNowComparison.ts` → `DASH`, `shownText`),
never 0. Under that side's lines, say why, each reason once however many dashes share it
(`absenceTextOf`, `distinctAbsenceNotesOf`, `reasonTexts`):

| The value's `absentReason` | Reason to write |
|---|---|
| `no-finished-items` | "No finished Work Items in Then" or "No finished Work Items in Now", with the instance's word for Work Items |
| `unknown` | "Can't be shown in this version of Lighthouse" |
| none given | "Not captured for this report" |

Throughput writes one reason per side, preferring the one Lighthouse gave over "Not captured for this report"
(`panels/ThroughputPanel.tsx` → `absenceNotesOf`); a dashed total reads "—".

## The summary

The summary comes before the first metric (`ThenAndNowSummary.tsx`) and has three parts.

**Each window** (`windowLineOf`, `windowDaysOf`): its days and its length, "3 May – 31 Jul 2026 · 90 days". The
first day drops its year when both days fall in the same year, "28 Dec 2025 – 26 Mar 2026" otherwise; a length of
one reads "1 day".

**How many Work Items closed in each window** (`closedCountOf`): "52 Work Items closed" ("1 Work Item closed"),
with the instance's word. Take the count from Throughput's total for that side. A report without one falls back to
the `sampleSize` of the first Cycle Time line among `p85`, `p70`, `p50` that has one; with none, 0 when a Cycle Time
line's reason is `no-finished-items`, else leave this line out.

**Which way each shown metric moved** (`panels/changeSummary.ts` → `summariseChange`, `kindOf`; `ThenAndNowSummary.tsx`
→ `CHANGE_KIND_LOOK`), judged from its compared lines only, a dashed line counting for nothing:

- **Mixed** when at least one line is better and at least one worse.
- **Improved** when at least one line is better and none worse.
- **Got worse** when at least one line is worse and none better.
- **Unchanged** when every compared line has no change.
- In no group when none of its lines can be compared.

Write the groups in the order Improved, Got worse, Mixed, Unchanged, leaving out a group with no metric, each with
its metrics by title in the order above: "✔ Improved: Cycle Time, Throughput". Never call a metric improved when one
of its lines got worse. When no metric is in any group, the summary's change reads "—".

## The layout

The page follows the printed report from top to bottom. The same order serves a dashboard (one card per block) and
a document (one table per block). A Then & Now report read on 30 Oct 2026:

```text
Team Lightspeed — Then & Now — engagement start
Then 3 May – 31 Jul 2026 · Now 5 Jul – 2 Oct 2026
Read from Lighthouse on 30 Oct 2026

Summary
           Then                            Now
           3 May – 31 Jul 2026 · 90 days   5 Jul – 2 Oct 2026 · 90 days
           52 Work Items closed            65 Work Items closed
  Change   ✔ Improved: Cycle Time, Throughput
           ✘ Got worse: WIP
           ± Mixed: Total Work Item Age

Cycle Time | Then | Now | Change | %
  95th     | 34 days | 20 days | ▼ 14 days | −41 %
  85th     | 21 days | 12 days | ▼ 9 days  | −43 %
  70th     | 14 days | 9 days  | ▼ 5 days  | −36 %
  50th     | 8 days  | 6 days  | ▼ 2 days  | −25 %

Throughput | Then | Now | Change | %
  Total    | 52 Work Items | 65 Work Items |               |
  Per day  | 0.58 per day  | 0.72 per day  | ▲ 0.14 per day | +24 %

WIP        | Then | Now | Change | %
  Average  | 9  | 11 | ▲ 2       | +22 %
  Median   | 9  | 11 | ▲ 2       | +22 %
  Min      | 4  | 6  | ▲ 2       | +50 %
  Max      | 14 | 14 | No change |

Total Work Item Age | Then | Now | Change | %
  Average  | 96 days  | 70 days  | ▼ 26 days | −27 %
  Median   | 90 days  | 64 days  | ▼ 26 days | −29 %
  Min      | 12 days  | 15 days  | ▲ 3 days  | +25 %
  Max      | 210 days | 180 days | ▼ 30 days | −14 %

Assistant's view
  (only when the user asked for it)

Data from Lighthouse by LetPeopleWork
```

1. **The title line**: the owner as the `summary` names it, then the report's name, "Team Lightspeed — Then & Now —
   engagement start".
2. **Both windows on one line**, "Then {days} · Now {days}", each written as in the summary's window line, without
   its length.
3. **The day it was read**: "Read from Lighthouse on {the day you read the report}", written "30 Oct 2026". Working
   from a PDF or pasted values instead, say that here: "From the report PDF you shared", "From the values you
   pasted".
4. **The summary**, as the section above describes it.
5. **One block per shown metric**, in the order above, titled in the instance's words, each line as
   Then | Now | Change | %. Under a side whose lines hold a dash, that side's reason: "— No finished Work Items in
   Now".
6. **The assistant's view**, only when the user asked what you make of the report: after every metric block, under
   the heading "Assistant's view", in your own words. It never changes, re-colours or re-orders anything above it.
   Not asked, leave the heading out too.
7. **The credit**, always the page's last line, after everything else, word for word:

Data from Lighthouse by LetPeopleWork
