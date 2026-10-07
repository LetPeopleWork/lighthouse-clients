---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": minor
"@letpeoplework/lighthouse-mcp-core": minor
---

`lh metrics --metrics cumulativeStateTime` reads like the dashboard's Time in State bar

Under `--pretty`, `lh metrics team --id 3 --metrics cumulativeStateTime` now prints the heading, the line
`Time in State across 42 Work Items`, and one row per state in workflow order: its total days, how many
Work Items spent time in it, how many of those are completed and ongoing, and the mean and median, as
Lighthouse sent them (`—` where there is no median). The list of Work Items the web offers to pick from
is never printed; it only gives the count. With `--item-ids` the count is the Work Items picked, and with
`--state Review` a second table lists the Work Items contributing to Review with the days each
contributed. A Time in State with no states says `No data yet.`

The metrics headline gains one line, `Time in State  4 states  across 42 Work Items`. An instance that
renamed its terms sees its own words. States that arrive without their workflow order, a refused read,
or an answer in a shape the CLI does not recognise still print the generic view, exit 0, as before.
`--json` and `--toon` are unchanged.

An assistant gets Time in State stated too. `lighthouse_team_metrics_cumulativeStateTime` and
`lighthouse_portfolio_metrics_cumulativeStateTime` return a `summary` beside the facts: the heading and
the line `Time in State`. The drill-down tools, `lighthouse_team_metrics_cumulativeStateTimeItems` and
`lighthouse_portfolio_metrics_cumulativeStateTimeItems`, state the heading and the title above the Work
Items, `Work Items contributing to Review`, and `No data yet.` when none contributed. Every other field is
the facts, unchanged. The candidates tools carry no summary, as `lh` never prints that list.

The client package gains `describeTimeInState`, `describeTimeInStateDays`,
`describeTimeInStateContributorDays`, `timeInStateItemCount`, `readTimeInStateBar`,
`readTimeInStateContributors` and `NO_DATA_YET`, and a day table can now carry a `title`.
