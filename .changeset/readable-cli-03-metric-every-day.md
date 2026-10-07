---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": minor
"@letpeoplework/lighthouse-mcp-core": minor
---

`lh metrics --metrics <name>` shows one metric, every day, in the dashboard's words

Under `--pretty`, `lh metrics team --id 3 --metrics throughput` now prints the heading
(`Gravity · Mon 7 Sep 2026 – Tue 6 Oct 2026 (30 days)`), the total as a sentence
(`Total Throughput: 31 Work Items, 1.0 / day`) and a table with one row per day, the count of Work Items
closed on it. `--metrics totalWorkItemAge` states the total as on the latest day and lists each day's total
and its Work Items; `--metrics percentilesOverTime` lists each recorded day's 50th, 70th, 85th and 95th
percentile of Cycle Time, and `--metrics processBehaviorOverTime` each recorded day's Throughput natural
process limits. Days are dated as Lighthouse recorded them, whatever the reader's time zone. A history with
no recorded day says so in the web's words instead of printing an empty table. A Portfolio counts Features,
and an instance that renamed its terms sees its own words.

The other metric names, a metric Lighthouse refuses and an answer in a shape the CLI does not recognise
still print the generic view, exit 0, as before. `--json` and `--toon` are unchanged. The client package
gains `describeThroughputDays`, `describeTotalWorkItemAgeDays`, `describePercentilesOverTimeDays` and
`describeProcessBehaviorOverTimeDays`, and `readPercentilesOverTime` now also reads the history's horizon.
