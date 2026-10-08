# Every MCP Tool, `lh` Command and Metric

Read this when the user asks for something `SKILL.md` does not show. It names everything the clients offer
and when to use it. If a read is not here, Lighthouse's clients do not offer it: say so, and never make up a
tool, a command or a metric.

Words: Lighthouse's defaults are Team, Portfolio, Feature, Work Item, Delivery, Cycle Time, Throughput,
WIP, Blocked and SLE. An instance may rename them. Answer in the words the tool's `summary` uses; they are
the user's own.

## Contents

1. [How answers come back](#how-answers-come-back)
2. [MCP tools](#mcp-tools)
3. [`lh` commands](#lh-commands)
4. [`--metrics` keys](#--metrics-keys)
5. [Reads only `lh` offers](#reads-only-lh-offers)
6. [An older Lighthouse](#an-older-lighthouse)

---

## How answers come back

- A tool with a `summary` states its answer there as the web does. Quote it as written; reason over the
  other fields, which are the facts.
- An object answer carries `summary` as a field. A list answer keeps its facts in the first text block and
  states `summary: …` in a second one (`summary: 3 Features`).
- Write tools confirm in a second block (`summary: Refresh queued: Team [id: 3]. Lighthouse updates it in the background.`).
  A blackout rule's own `summary` field inside the facts is Lighthouse's wording of its schedule, not the
  confirmation.
- `lh` prints `--pretty` by default, which is for people and may change in any release. Run every command
  whose output you read with `--json` and answer from its fields. Quote numbers and likelihoods exactly; never
  round them.

---

## MCP tools

`{id}` is the Team's or Portfolio's numeric id; see the ID table in `SKILL.md` for where it comes from.
Metric tools take optional `startDate` and `endDate` (`YYYY-MM-DD`, both inclusive), except
`lighthouse_team_metrics_wip` and `lighthouse_team_metrics_sleRisk`, which take only `{id}` and answer for today.

### Lighthouse itself

| Tool | Use it when |
|---|---|
| `lighthouse_health_check` | The user asks whether Lighthouse is reachable, or a call failed and you need to know why. |
| `lighthouse_version_get` | The user asks which version runs, or a read was refused as needing a newer Lighthouse. |
| `lighthouse_worktracking_list` | The user asks which Work Tracking Systems are connected. |
| `lighthouse_worktracking_get` | One connection by `{id}` from the list: its name and type. It never shows an option's value. |

### Teams

| Tool | Use it when |
|---|---|
| `lighthouse_team_list` | Every Team question starts here: names and ids. |
| `lighthouse_team_get` | A Team's settings, its SLE (`serviceLevelExpectationRange`, `…Probability`) and its System WIP Limit (`systemWIPLimit`). |
| `lighthouse_team_refresh` | Only when the user asks to refresh the Team's data. It queues the refresh and returns at once. |
| `lighthouse_team_metrics_throughput` | Work Items finished per day. `view: "filtered"` applies the Team's forecast filter. |
| `lighthouse_team_metrics_cycleTimePercentiles` | How long Work Items take (p50/p70/p85/p95). `definitionId` reads a named Cycle Time instead of the default. |
| `lighthouse_team_metrics_workItemAge` | Each in-progress Work Item's age per day. |
| `lighthouse_team_metrics_workItemAgePercentiles` | Work Item Age percentiles. Ages are as of the range's last day, not today, unless the range ends today. |
| `lighthouse_team_metrics_totalWorkItemAge` | The summed age of all WIP per day: the total WIP burden. |
| `lighthouse_team_metrics_wip` | What is in progress right now: each Work Item's age and state, whether it is Blocked and since when (`isBlocked`, `blockedSince`), and its link. Use it for "what is Blocked", "what is aging" and "are we over our WIP Limit" today. |
| `lighthouse_team_metrics_sleRisk` | Which Work Items in progress are likely to miss the Team's SLE today: Lighthouse's own risk per Work Item, with the finished Work Items behind it. At risk starts at 70%. Use it for "what will miss our SLE" and "what should we swarm on"; never work a risk out yourself. Needs a Lighthouse newer than v26.9.19.10. |
| `lighthouse_team_metrics_blockedCountHistory` | How many Work Items were Blocked on each day. For what is Blocked right now, use `lighthouse_team_metrics_wip`. |
| `lighthouse_team_metrics_percentilesOverTime` | How the percentiles moved, day by day. `metricType`: `CycleTime` or `WorkItemAge`. With `CycleTime` always pass `horizon` (30, 60 or 90): the rows do not say which horizon they are, so leaving it out mixes all three. |
| `lighthouse_team_metrics_processBehaviorChart` | One Process Behaviour Chart as Lighthouse computes it: the limits, every point (a day, or on `CycleTime` a finished Work Item), and the signals Lighthouse found (Large Change, Moderate Change, Moderate Shift, Small Shift) on the days they fired. `metricType` is required: `Throughput`, `Arrivals`, `Wip`, `WorkItemAge` (Total Work Item Age) or `CycleTime`. Use it for "is something unusual going on" and "did our process change"; never work a signal out yourself. |
| `lighthouse_team_metrics_processBehaviorOverTime` | How the process limits (UNPL, Average, LNPL) moved, day by day. `metricType`: `Throughput`, `WorkItemAge`, `Wip`, `CycleTime` or `Arrivals`. |
| `lighthouse_team_metrics_cumulativeStateTime` | Where the Team's Work Items spend their time (Time in State): days per workflow state. Use it for "where does our time go", "where do items wait", "which state is the bottleneck". Never answer that from general knowledge. |
| `lighthouse_team_metrics_cumulativeStateTimeItems` | Which Work Items made up one state's time, with `{id, state}`; `state` is a state name from the read above. |
| `lighthouse_team_metrics_cumulativeStateTimeCandidates` | The Work Items the user can narrow Time in State to; pass their ids as `itemIds` to the two reads above. |
| `lighthouse_team_refinement_get` | How many Work Items the Team should refine before its next Refinement, and how the votes stand. Quote its `summary`: it is what the Refinement tab says. |
| `lighthouse_team_refinement_vote` | Only after the user confirmed their own vote; see "Refinement votes" in `SKILL.md`. |
| `lighthouse_team_refinement_comment` | Only after the user confirmed their own comment or question. |
| `lighthouse_team_refinement_voteTakeBack` | Only when the user asks to take back their vote. |

### Portfolios, Features and Deliveries

| Tool | Use it when |
|---|---|
| `lighthouse_portfolio_list` | Every Portfolio question starts here. It also lists each Portfolio's Features (id and name). |
| `lighthouse_portfolio_get` | A Portfolio's settings. |
| `lighthouse_portfolio_refresh` | Only when the user asks to refresh the Portfolio's data. |
| `lighthouse_portfolio_metrics_throughput` | Features finished per day. |
| `lighthouse_portfolio_metrics_workItemAge` | Each in-progress Feature's age per day. |
| `lighthouse_portfolio_metrics_workItemAgePercentiles` | Feature age percentiles, as of the range's last day. |
| `lighthouse_portfolio_metrics_totalWorkItemAge` | The summed age of the Portfolio's WIP per day. |
| `lighthouse_portfolio_metrics_blockedCountHistory` | How many Features were Blocked on each day. |
| `lighthouse_portfolio_metrics_percentilesOverTime` | As the Team tool, for the Portfolio. Pass `horizon` with `CycleTime`. |
| `lighthouse_portfolio_metrics_processBehaviorOverTime` | As the Team tool; also takes `FeatureSize`. |
| `lighthouse_portfolio_metrics_processBehaviorChart` | As the Team tool; also takes `FeatureSize`, where every point is a finished Feature. |
| `lighthouse_portfolio_metrics_cumulativeStateTime` | Where the Portfolio's Features spend their time. |
| `lighthouse_portfolio_metrics_cumulativeStateTimeItems` | Which Features made up one state's time, with `{id, state}`. |
| `lighthouse_portfolio_metrics_cumulativeStateTimeCandidates` | The Features the user can narrow Time in State to. |
| `lighthouse_feature_get` | A Feature's detail (state, size, dates). Needs `ids` or `refs`; never call it empty. |
| `lighthouse_feature_workitems` | The Work Items of one Feature, each with its `workItemAge`. |
| `lighthouse_delivery_list` | A Portfolio's Deliveries, with `{id: <portfolio id>}`. |
| `lighthouse_delivery_metrics` | How a Delivery's scope and likelihood moved, one row per recorded day. Add `detail: "epics"` only when the question is the per-Feature split or the forecast distribution: it is far larger. |

### Forecasts and blackout rules

| Tool | Use it when |
|---|---|
| `lighthouse_forecast_manual` | "When will N Work Items be done?" (`remainingItems`), "How many by this date?" (`targetDate`), or both: "Will N be done by this date?". Quote the likelihood exactly. |
| `lighthouse_forecast_backtest` | "How good would a forecast have been?": forecast a past period from the history before it and compare with what was finished. |
| `lighthouse_blackout_list` | Which recurring non-working days forecasts skip. |
| `lighthouse_blackout_create` | Only when the user asks to add a rule. Premium, system admin only. |
| `lighthouse_blackout_update` | Only when the user asks to change a rule, by its id from the list. |
| `lighthouse_blackout_delete` | Only when the user asks to delete a rule, after they confirmed which one. |

### Over-time series

Percentiles and process limits over time hold the days Lighthouse recorded. An empty series on a recently
upgraded Lighthouse means nothing was recorded yet, not a fault. Where a System Admin switched on filling in
past days (a Preview), a read starts filling missing days in the background, so a later call may return more.
Days without a usable baseline are left out, never zeroed. Say so plainly instead of reporting no data as an
error.

---

## `lh` commands

Add `--json` to every command whose output you read.

| Command | Use it when |
|---|---|
| `lh connection connect` | Connecting; see `SKILL.md` for the modes. |
| `lh connection status` | Checking which Lighthouse `lh` talks to. |
| `lh connection disconnect` | Only when the user asks to forget the stored connection. |
| `lh team list` | Every Team question starts here. |
| `lh team get --id <id>` | A Team's settings, SLE and System WIP Limit. |
| `lh team refresh --id <id>` | Only when the user asks to refresh a Team. |
| `lh team create --payload-file <path>` | Only when the user asks to create a Team. Read an existing one with `lh team get` first to see the shape. `--payload-json <json>` works too. |
| `lh team update --id <id> --payload-file <path>` | Only when the user asks to change a Team's settings. |
| `lh team delete --id <id>` | Only when the user asks, after they confirmed which Team. It cannot be undone. |
| `lh portfolio list` | Every Portfolio question starts here. |
| `lh portfolio get --id <id>` | A Portfolio's settings. |
| `lh portfolio refresh --id <id>` | Only when the user asks to refresh a Portfolio. |
| `lh portfolio create --payload-file <path>` | Only when the user asks to create a Portfolio. |
| `lh portfolio update --id <id> --payload-file <path>` | Only when the user asks to change a Portfolio. |
| `lh portfolio delete --id <id>` | Only when the user asks, after they confirmed which Portfolio. |
| `lh feature get --ids <id,...>` | A Feature's detail; `--refs <ref,...>` takes references instead. |
| `lh feature workitems --id <id>` | The Work Items of one Feature. |
| `lh delivery list --portfolio-id <id>` | A Portfolio's Deliveries. |
| `lh delivery metrics --delivery-id <id>` | How a Delivery moved, one row per recorded day; `--detail epics` adds the per-Feature split and is far larger. |
| `lh metrics team --id <id>` | A Team's metrics; last 30 days unless `--start-date` / `--end-date` are given. Pick keys with `--metrics`; `--filter filtered` applies the forecast filter to Throughput and the Predictability Score. |
| `lh metrics portfolio --id <id>` | A Portfolio's metrics; last 90 days by default. |
| `lh forecast manual --team-id <id>` | With `--remaining <n>`, `--target-date <date>` or both. `--filter raw`, `filtered` or `team` (the default) chooses whether the Team's forecast filter applies. |
| `lh forecast backtest --team-id <id>` | With `--start-date`, `--end-date`, `--hist-start-date`, `--hist-end-date`. |
| `lh worktracking list` | The connected Work Tracking Systems. |
| `lh worktracking get --id <id>` | One connection's name and type. |
| `lh blackout list` | The recurring blackout rules. |
| `lh blackout create --payload-json <json>` | Only when the user asks. Payload `{ weekdays, intervalWeeks, start, end, description }`. |
| `lh blackout update --id <id> --payload-json <json>` | Only when the user asks to change a rule. |
| `lh blackout delete --id <id>` | Only when the user asks, after they confirmed which rule. |
| `lh refinement get --team-id <id>` | How many Work Items to refine, and how the votes stand. |
| `lh refinement vote --team-id <id> --work-item <ref> --answer yes` | Only after the user confirmed; `yes-but` needs `--comment`. `--as <name>` carries their name without sign-in. |
| `lh refinement comment --team-id <id> --work-item <ref> --text <text>` | Only after the user confirmed the comment. |
| `lh refinement take-back --team-id <id> --work-item <ref>` | Only when the user asks to take back their vote. |
| `lh health check` | Whether Lighthouse is reachable. |
| `lh version get` | Which Lighthouse version runs. |
| `lh config output` | Shows the stored output format; `lh config output set --format json` stores one. |
| `lh config voter` | Shows the name votes carry without sign-in; set it with `lh config voter set --name <name>`, using the name the user gave you. |
| `lh config usage-data` | Shows whether usage data is sent. Safe to run. Switching it `on` or `off` is the user's own decision; never do it unasked. |

---

## `--metrics` keys

`lh metrics team` and `lh metrics portfolio` take a comma-separated list; without `--metrics` they return all but `sleRisk` and `processBehaviorChart`,
which are read only when named.

| Key | Use it when | Over MCP |
|---|---|---|
| `--metrics throughput` | Work Items finished per day. | `lighthouse_team_metrics_throughput` |
| `--metrics wip` | What is in progress right now: each Work Item's age and state, whether it is Blocked (`isBlocked`, `blockedSince`), and the System WIP Limit. | `lighthouse_team_metrics_wip` (Teams only) |
| `--metrics cycleTime` | Cycle Time percentiles; `--definition-id <id>` for a named Cycle Time. | `lighthouse_team_metrics_cycleTimePercentiles` (Teams only) |
| `--metrics workItemAge` | Each in-progress Work Item's age per day. | `lighthouse_team_metrics_workItemAge` |
| `--metrics totalWorkItemAge` | The summed WIP age per day. | `lighthouse_team_metrics_totalWorkItemAge` |
| `--metrics arrivals` | Work Items started per day. | none |
| `--metrics predictabilityScore` | How predictable delivery has been. | none |
| `--metrics cumulativeStateTime` | Time in State; `--state <name>` adds one state's Work Items, `--item-ids <id,...>` narrows it. | `lighthouse_team_metrics_cumulativeStateTime` |
| `--metrics blocked` | How many Work Items were Blocked on each day. | `lighthouse_team_metrics_blockedCountHistory` |
| `--metrics percentilesOverTime` | Percentiles per recorded day; `lh` reads Cycle Time at the 30-day horizon. | `lighthouse_team_metrics_percentilesOverTime` |
| `--metrics processBehaviorOverTime` | Process limits per recorded day. | `lighthouse_team_metrics_processBehaviorOverTime` |
| `--metrics sleRisk` | Which Work Items in progress are likely to miss the Team's SLE today: each one's risk in percent, how many finished Work Items were still open at its age, and how many of those went on to miss. Teams only; reads today whatever the dates. | `lighthouse_team_metrics_sleRisk` (Teams only) |
| `--metrics processBehaviorChart` | Every Process Behaviour Chart of the Team (Throughput, Arrivals, WIP, Total Work Item Age, Cycle Time) or Portfolio (also Feature Size) at once, keyed by chart type, with the signals Lighthouse found on each. Use it for "is something unusual going on" across all charts; never work a signal out yourself. | `lighthouse_team_metrics_processBehaviorChart`, one chart per call |

`lh` also takes lower-case spellings (`--metrics cycletime`), `pbcovertime` for `processBehaviorOverTime`, and `pbc` or
`processbehaviourchart` for `processBehaviorChart`.

---

## Reads only `lh` offers

MCP has no tool for these. Over MCP, tell the user the read exists and name the command, for example:
"Gravity's Arrivals are read with `lh metrics team --id 3 --metrics arrivals`." Do not work the answer out
from other reads, and do not call a tool that is not in your tool list.

- Arrivals per day (`--metrics arrivals`); their signals are read over MCP with
  `lighthouse_team_metrics_processBehaviorChart` and `metricType: "Arrivals"`
- A Portfolio's current WIP and what is Blocked right now (`lh metrics portfolio --id <id> --metrics wip`)
- The Predictability Score (`--metrics predictabilityScore`)
- A Portfolio's Cycle Time percentiles (`lh metrics portfolio --id <id> --metrics cycleTime`)
- Creating, changing and deleting Teams and Portfolios (`lh team create`, `lh portfolio update`, …)
- The connection, output format, voter name and usage-data answer (`lh connection status`, `lh config output`, …)

---

## An older Lighthouse

Some reads need a newer Lighthouse than the user runs. The client then refuses with a message like
"This Lighthouse server (v26.6.7.1) does not support … it requires a version newer than …. Upgrade
Lighthouse to use this client feature."

Relay it as that: this Lighthouse is older than the read needs, and whoever runs it has to upgrade
Lighthouse to get the answer. It is not a fault in Lighthouse or in the client. Do not retry, and do not
guess the answer from other reads.
