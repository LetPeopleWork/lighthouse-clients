---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": minor
"@letpeoplework/lighthouse-mcp-core": minor
---

`lh metrics --metrics <name>` shows one metric, every day, in the dashboard's words

Under `--pretty`, `lh metrics team --id 3 --metrics throughput` now prints the heading
(`Gravity · Mon 7 Sep 2026 – Tue 6 Oct 2026 (30 days)`), the total as a sentence
(`Total Throughput: 31 Work Items, 1.0 / day`) and a table with one row per day, the count of Work Items
closed on it. Every other name `--metrics` accepts gets the same treatment:

- `arrivals`: the total started and the count started on each day.
- `wip`: under `Gravity · as of Tue 6 Oct 2026`, the count in progress and the System WIP Limit, each
  Work Item in progress (ID, Name, State, Work Item Age and since when it is blocked), oldest first, and
  the count in progress on each day.
- `cycleTime`: the Cycle Time percentiles, then each closed Work Item with the day it closed and its Cycle
  Time. With `--definition-id`, the sentence names the chosen cycle time definition
  (`Lead Time Percentiles: …`); when the Team's settings cannot be read it falls back to Cycle Time and the
  command still answers.
- `workItemAge`: under the "as of" heading, the Work Item Age percentiles, then each day's oldest Work
  Item and how many there were; every item of every day stays in `--json`.
- `totalWorkItemAge`: the total as on the latest day, then each day's total and its Work Items.
- `predictabilityScore`: the score, to one decimal, then the dashboard's own explanation of what it
  means.
- `blocked`: the blocked count from the first recorded day to the last, then each recorded day's count.
- `percentilesOverTime` and `processBehaviorOverTime`: each recorded day's 50th, 70th, 85th and 95th
  percentile of Cycle Time, and each recorded day's Throughput natural process limits.

Days are dated as Lighthouse recorded them, whatever the reader's time zone. A history with no recorded
day says so in the web's words instead of printing an empty table. A Portfolio counts Features, and an
instance that renamed its terms sees its own words.

A metric Lighthouse refuses and an answer in a shape the CLI does not recognise still print the generic
view, exit 0, as before. `--json` and `--toon` are unchanged. The client package gains a `describe…Days`
function per metric, `describeAsOfHeading`, `getTeamSettings` (`GET /teams/{id}/settings`) and
`readCycleTimeDefinitionName`; `readPercentilesOverTime` now also reads the history's
horizon, and `readWip` and `readCycleTime` also read each Work Item's ID, name, state, age, closed day and
blocked-since day when Lighthouse sends them.

With every term renamed, the day views print no seeded word of their own; Work Item names still print
exactly as Lighthouse sends them.

The per-metric MCP tools of a Team and a Portfolio now state their answer as `lh` heads it: the heading
and the sentence, never the table. An object answer (Throughput, Work Item Age, Total Work Item Age)
gains a `summary` field. A list answer (the Cycle Time and Work Item Age percentiles, the blocked
history, the percentiles over time and the process limits) keeps its facts block byte for byte and adds
a second text block, `summary: …`; an empty history says nothing is recorded yet, in the web's words. An
answer in a shape the tool does not recognise, or another percentile or process-limit family than the
one `lh` states, gets no summary, and a refusal stays the same error. The client package gains
`readRunChart`, `readCycleTimePercentiles`, `describeWorkItemAgePercentiles` and `describeMetricSummary`.
