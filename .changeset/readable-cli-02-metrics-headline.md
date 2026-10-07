---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": minor
---

`lh metrics` shows the dashboard's headline on one screen

`lh metrics team --id 3` and `lh metrics portfolio --id 2` without `--metrics` now read like the metrics
dashboard under `--pretty`: a heading with the Team's or Portfolio's name and the range
(`Gravity · Mon 7 Sep 2026 – Tue 6 Oct 2026 (30 days)`, both ends counted), then the headline numbers in the
dashboard's order — `Work Items in Progress` against the System WIP Limit (left out when none is set),
`Total Throughput` and `Total Arrivals` with their average per day, the blocked count, `Total Work Item Age`
across the items in progress, and the `Predictability Score` to one decimal. A Portfolio counts Features.
Below them, the Cycle Time and Work Item Age percentiles side by side, highest first (`1 day`, `12 days`,
and `—` where one side has no value), and one line per over-time metric (the Cycle Time 85th percentile,
the Throughput process limits and the blocked count) from the first recorded day to the last, with how
many days were recorded and the `--metrics <name>` command that shows every day. An over-time metric with
nothing recorded says so in the web's words. Everything is said in the instance's own terminology.

A metric Lighthouse refused prints its reason on its own line and every other number still prints. A
metric in a shape this version of `lh` does not recognise prints `shown only with --json (unknown shape)`
in its place, and the rest renders. The work distribution placeholder is not shown; `--json` keeps it.
The extra reads of the Team or Portfolio and of the Terminology happen only under `--pretty` and can never
fail the command: the seeded words and `Team [id: 3]` stand in.

`--json` and `--toon` are unchanged, byte for byte, and ask Lighthouse nothing more. The client package
gains a reader for each section of the metrics composite (`readThroughput`, `readArrivals`, `readWip`,
`readCycleTime`, `readWorkItemAge`, `readWorkItemAgePercentiles`, `readTotalWorkItemAge`,
`readPredictabilityScore`, `readCumulativeStateTime`, `readBlocked`, `readPercentilesOverTime`,
`readProcessBehaviorOverTime`) and the headline's `describe…` wording.
