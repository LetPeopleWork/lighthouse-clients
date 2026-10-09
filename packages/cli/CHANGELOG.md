# @letpeoplework/lighthouse-cli

## 1.8.0

### Minor Changes

- [`92dcba7`](https://github.com/LetPeopleWork/lighthouse-clients/commit/92dcba78798a43179e6b610da647d70df7d78642) Thanks [@huserben](https://github.com/huserben)! - An assistant can now read what a Team has in progress right now with `lighthouse_team_metrics_wip`: each
  Work Item with its age, state, whether it is Blocked and since when, and its link, with a summary of how
  many are in progress against the System WIP Limit and how many are Blocked.
  
  When there is less to say, the summary and `lh metrics team --metrics wip --pretty` say so in the same
  words: that no System WIP Limit is set, that Lighthouse does not say which Work Items are Blocked (an older
  server, never read as none Blocked), or that no Work Items are in progress. When the Team itself cannot be read,
  `lh` and the summary say nothing about its System WIP Limit or its SLE rather than calling them missing.
  
  `lh metrics team --metrics sleRisk` reads which Work Items in progress are likely to miss the Team's SLE, with
  Lighthouse's own numbers handed over unchanged for `--json` and `--toon`. It is read only when named, needs a
  Lighthouse newer than v26.9.19.10, and a Portfolio is told SLE Risk is for Teams. Lighthouse only ever computes
  SLE Risk for today, so `--end-date` moves neither its heading nor the Work Items and ages it is shown with.
  
  With `--pretty` it says how many Work Items in progress are at risk of missing the SLE, counting from the
  same 70% the web's SLE Risk widget counts from, then lists every Work Item highest risk first with its name,
  age, risk and the finished Work Items behind it ("6 of 11 finished Work Items that reached this age went past
  7 days"), or that it is already past the SLE. A Team without an SLE is told it has no SLE Risk, and when the
  names cannot be read every risk is still listed by its reference.
  
  An assistant can read the same SLE Risk with `lighthouse_team_metrics_sleRisk`: Lighthouse's numbers for each
  Work Item unchanged, beside a summary in the words `lh --pretty` uses, every Work Item flush at the start of its
  line. An older Lighthouse's refusal comes back as the upgrade it asks for.
  
  An assistant can read one Process Behaviour Chart of a Team or Portfolio with
  `lighthouse_team_metrics_processBehaviorChart` and `lighthouse_portfolio_metrics_processBehaviorChart`,
  naming the chart with `metricType` (Feature Size for Portfolios only). Lighthouse's chart comes back unchanged,
  beside a summary that names each signal Lighthouse found with the days it fired ("Large Change on Wed 7 Oct,
  Thu 8 Oct"), or says there are no signals. A day is named once, even on the Cycle Time and Feature Size charts,
  where each finished Work Item or Feature is a point of its own and several can share a day, as the tools now
  tell the assistant.
  
  A chart whose limits mean little names no signal: a chart without a baseline says no baseline is set and that
  its limits come from the range shown, and a chart Lighthouse could not compute says why, in Lighthouse's own
  words. A blackout day is listed as one and never as a signal. A chart from a Lighthouse that predates blackout
  days and baselines still has its signals named, and the chart itself always comes back unchanged.
  
  `lh metrics team --metrics processBehaviorChart` reads every Process Behaviour Chart of the Team at once, and
  `lh metrics portfolio` reads Feature Size too. `--json` and `--toon` hand over each chart unchanged, keyed by
  chart type, with the range; a chart Lighthouse cannot answer carries its refusal while the others still come
  back. The charts are read only when named, and `pbc`, `processbehaviorchart` and `processbehaviourchart` name
  them too.
  
  With `--pretty` it prints one line per chart under the range, each titled as the web titles it ("Throughput
  Process Behaviour Chart", "Total Work Item Age Process Behaviour Chart", in the instance's own words), followed
  by the same sentence the assistant's summary gives: the signals with their days, "No signals", that no baseline
  is set, or why Lighthouse could not compute it. A chart that cannot be read says so on its own line and leaves
  every other chart in place.
  
  `lh metrics team` and `lh metrics portfolio` without `--metrics` print and read exactly what they did before.

- [`d624b34`](https://github.com/LetPeopleWork/lighthouse-clients/commit/d624b34c91cae9a7fd0d6fd5651d5662bbcccb69) Thanks [@huserben](https://github.com/huserben)! - The client reads a forecast's level and likelihood the way the web does
  
  The client package gains the web's forecast display rules, so the CLI and the MCP summaries can say what
  the browser says: `levelOf` names a chance `Risky` (up to 50%), `Realistic` (up to 70%), `Confident` (up
  to 85%) or `Certain`, and gives no level when there is no forecast; `formatLikelihood` shows `>95%` only
  while work remains, otherwise the value rounded or to two decimals; and `likelihoodAnswer` gives the one
  answer a likelihood has, in the web's order: `Cannot forecast`, then `Not enough data` (only while work
  remains), then the number.
  
  `lh forecast manual` now reads like the Forecast tab under `--pretty`: a heading with the Team's name,
  the When and How Many tables with each chance's level named as the Forecast tab's icon names it (`Certain`,
  `Confident`, `Realistic`, `Risky`) and days written as `Mon 9 Nov 2026`, and the likelihood sentence, all
  in the instance's own terminology. The likelihood reads as the web states it: `Cannot forecast` when there
  is no likelihood (even on thin history), the web's "Not enough data yet" sentence in its place when the
  Team's history is too thin, and otherwise the number, capped at `>95%` while work remains. An older
  Lighthouse that does not say whether the history is enough gets the number as usual.
  The heading names only what was asked (`Gravity · 25 Work Items` for `--remaining` alone, `Gravity · target
  Fri 30 Oct 2026` for `--target-date` alone, which also show only the When or only the How Many table) and
  ends with `Use filtered Throughput` when the forecast used the Team's filtered Throughput. Neither extra
  read can fail the command: when the Terminology cannot be read the seeded words are used, and when the
  Team cannot be read the heading starts `Team [id: 3]`.
  An instance that has renamed every term sees its own word for each one throughout the forecast.
  
  `lh forecast backtest` now reads like Backtest Results under `--pretty`: `Gravity · Backtest Results`, the
  period and its historical data as calendar days, and the forecast percentiles from 50% to 95%, with the
  actual drawn as a `── Actual Throughput: 21 Work Items ──` line where it fell among them, the way the
  chart draws its dashed line: first when it beat the 50% value, last when it fell short of the 95% value,
  and after a percentile it equals. The web's Average bar is not shown. When the Team cannot be read the
  heading starts `Team [id: 3]`.
  
  The MCP tools `lighthouse_forecast_manual` and `lighthouse_forecast_backtest` now return a `summary` beside
  their facts: the same heading and sentence `lh` prints for the same answer (the manual forecast's heading and
  likelihood sentence; the backtest's heading, period and actual Throughput), in the instance's own
  terminology. Every other field is the facts exactly as before. Reading the words and the Team's name never
  fails the tool, and an answer in a shape the tool does not recognise comes back as it always did, without a
  summary.
  
  `--pretty` is for people and its layout may change in any minor release; `--json`, `--toon` and the MCP tools'
  facts are the contract that scripts and agents read.
  
  `--json` and `--toon` are unchanged, and an answer in a shape the CLI does not recognise still prints the
  generic view. The client package gains `resolveTerms` / `readTerms`, `formatCalendarDay` /
  `formatTimestamp`, `readAnswerWording`, `readManualForecast` with its `describe…` wording, and
  `readBacktest` with `placeActualAmongPercentiles` and its `describeBacktest…` wording.

- [`8dbc106`](https://github.com/LetPeopleWork/lighthouse-clients/commit/8dbc1062877fc9e3067623b000a94466717b3515) Thanks [@huserben](https://github.com/huserben)! - `lh metrics` shows the dashboard's headline on one screen
  
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

- [`7641927`](https://github.com/LetPeopleWork/lighthouse-clients/commit/7641927e0101b9c66e1cbf776715c68f71ec53ea) Thanks [@huserben](https://github.com/huserben)! - `lh metrics --metrics <name>` shows one metric, every day, in the dashboard's words
  
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

- [`45aa6be`](https://github.com/LetPeopleWork/lighthouse-clients/commit/45aa6be764d20c6773a596e5cb0eba531cf116bf) Thanks [@huserben](https://github.com/huserben)! - `lh metrics --metrics cumulativeStateTime` reads like the dashboard's Time in State bar
  
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

- [`004f43f`](https://github.com/LetPeopleWork/lighthouse-clients/commit/004f43f8b9f28050b06876f8bf04468d4b88e581) Thanks [@huserben](https://github.com/huserben)! - `lh team list` and `lh portfolio list` read like the Overview's tables, and `lh team get` and `lh portfolio get` like their pages
  
  Under `--pretty`, `lh team list` now prints the title `Teams` and a table with the Overview's columns:
  the Team's name with its id beside it (`Gravity [id: 3]`), how many Features it owns (`1 Feature`,
  `6 Features`), its tags, and when it was last updated, in the reader's own time zone
  (`Tue 6 Oct 2026, 07:14`). A Team never updated says `—`, and the Tags cell stays empty when
  Lighthouse sends no tags. An instance that renamed its terms sees its own words. A list in which any
  Team arrives without its name or id still prints the generic view, exit 0, as before. `--json` and
  `--toon` are unchanged.
  
  Under `--pretty`, `lh team get` states the Team as its page does: its name and id, when it was last
  updated, then its settings one per line — the Service Level Expectation (`85% of Work Items within 12
  days or less`), the System WIP Limit (`10 Work Items`), the Feature WIP (`1 Feature`, `2 Features`),
  the Throughput dates with `(rolling)` or `(fixed dates)`, the Portfolios it works for, how many
  Features it owns, its tags when it has some, and its Work Item Types. A setting left unset reads
  `Not set`, as on the web, and an instance that renamed its terms sees its own words. A Team that
  arrives without its name or id prints the generic view, exit 0. `--json` and `--toon` are unchanged.
  
  Under `--pretty`, `lh portfolio list` prints the title `Portfolios` and the same table, then one line
  pointing at each Portfolio's Deliveries: `Deliveries per Portfolio: lh delivery list --portfolio-id <id>`.
  The web shows the Deliveries in the table; the CLI points at them instead, so the list stays a single
  read however many Portfolios there are.
  
  Under `--pretty`, `lh portfolio get` states the Portfolio as its page does: its name and id, when it
  was last updated, then the Service Level Expectation (`85% of Features within 45 days or less`), the
  System WIP Limit (`5 Features`), the Feature WIP as the number of Teams working on it (`3 Teams`, or
  `Not set` when no Team does), those Teams by name and id, and how many Features it owns. An instance
  that renamed its terms sees its own words. A Portfolio that arrives without its name or id prints the
  generic view, exit 0. `--json` and `--toon` are unchanged.
  
  Over MCP, `lighthouse_team_list` and `lighthouse_portfolio_list` return their facts block exactly as
  before, then a second text block counting them in the instance's words: `summary: 7 Teams`,
  `summary: 1 Team`, `summary: No Portfolios`. When the instance's terms cannot be read the count uses the
  seeded words, and the tool never fails for it. A list in which any Team or Portfolio arrives without its
  name or id returns only the facts block, as before.
  
  Over MCP, `lighthouse_team_get` and `lighthouse_portfolio_get` return the same facts as before with one
  more field, `summary`: the page's heading and settings, one per line, as `lh team get` and
  `lh portfolio get` print them (`Gravity [id: 3]`, `Service Level Expectation: 85% of Work Items within
  12 days or less`, `Feature WIP: 3 Teams`), in the instance's words. When the instance's terms cannot be
  read the summary uses the seeded words; a Team or Portfolio that arrives without its name or id returns
  the facts alone, and the tool never fails for its summary. The descriptions of all four tools say what
  `summary` holds.
  
  The client package gains `readOwnerList`, `describeOwnerListTitle`, `describeOwnerListHeadings`, `describeOwnerCount`,
  `describeOwnerName`, `describeFeatureCount`, `describeTags`, `describeLastUpdated`, `NOT_SENT`,
  `readTeam`, `describeTeamSummary`, `readPortfolio`, `describePortfolioSummary`, `NOT_SET` and the
  `TeamSummary`, `PortfolioSummary`, `ThroughputDates` and `OwnerReference` types.

- [`a31f95f`](https://github.com/LetPeopleWork/lighthouse-clients/commit/a31f95fd24bfb8455a56c74362fd6a5cb9235192) Thanks [@huserben](https://github.com/huserben)! - `lh delivery list` reads like the Portfolio's Delivery cards
  
  Under `--pretty`, `lh delivery list --portfolio-id <id>` now heads the list with the Portfolio's name
  (`Ocean Explorer · Deliveries`) and prints one row per Delivery: its name with its id beside it, its
  Delivery Date, how many Features it holds, how much of its work is done (`34 of 55 Work Items`), the
  card's likelihood answer, and the date it is 85% likely to be done by. The likelihood reads as the card's
  does: the percentage (`78%`, capped at `>95%` while work remains), `Not enough data` on thin history,
  `Cannot forecast` when a Team has no throughput or Lighthouse gives no likelihood, and `Overdue` once the
  Delivery's date has passed (`Overdue · Cannot forecast` when both hold). An older Lighthouse that does not
  say whether a Delivery is overdue never shows `Overdue`, and a Delivery without an 85% date shows `—`. A
  Portfolio without Deliveries prints the heading, then `No Deliveries`. When the Portfolio's name cannot be
  read the heading names it by its id, and the list still prints. An instance that renamed its terms sees
  its own words. A list in which any Delivery arrives without its name, id, date or work prints the generic
  view, exit 0, as before. `--json` and `--toon` are unchanged.
  
  `lh delivery metrics --delivery-id <id>` reads day by day
  
  Under `--pretty`, `lh delivery metrics --delivery-id <id>` heads the view with the Delivery, its Delivery
  Date and the first recorded day (`Delivery [id: 11] · Delivery Date Tue 15 Dec 2026 · recorded since Tue
  15 Sep 2026`; the read carries no Delivery name, so its id stands in), then prints one row per recorded
  day: Date, Done, Remaining, Total, how many Features, and the likelihood. With `--detail epics` it adds the
  latest recorded day in detail: `On Tue 6 Oct 2026`, a table of its Features (name, done, likelihood, size,
  with `(default size)` where Lighthouse assumed one), and the four chances with the day each is likely done
  by. The flag keeps its name; the output says Features. Every day's detail stays in `--json`. A Delivery
  with no recorded day prints the heading, then `No data yet.` A history in a shape the view cannot fully
  read prints the generic view, exit 0, as before. `--json` and `--toon` are unchanged.
  
  The Delivery tools state their answer
  
  `lighthouse_delivery_list` keeps its facts block and adds a second block counting the Deliveries in the
  instance's words: `summary: 4 Deliveries`, `summary: 1 Delivery`, or `summary: No Deliveries`.
  `lighthouse_delivery_metrics` states the Delivery, its Delivery Date and its first recorded day as
  `lh delivery metrics` heads them: in a second block beside the day-by-day rows, or as a `summary` field
  beside the facts when `detail` is `"epics"`. When the answer is in a shape the summary cannot read, the
  facts go out exactly as before, and the tool never fails because of it.
  
  The client package gains `readDeliveryList`, `describeDeliveryListTitle`, `describeNoDeliveries`, `describeDeliveryCount`,
  `describeDeliveryListHeadings`, `describeDeliveryDone`, `describeDeliveryLikelihood`,
  `describeDeliveryRow`, `deliveryLikelihoodAnswer`, `OVERDUE_SHORT` and the `DeliveryListItem` and
  `DeliveryListOwner` types, and for the recorded days `readDeliveryMetricsHistory`, `latestRecordedDay`,
  `describeDeliveryMetricsHeading`, `describeRecordedDayHeadings`, `describeRecordedDayRow`,
  `describeRecordedDayTitle`, `describeDeliveryFeatureHeadings`, `describeDeliveryFeatureRow`,
  `describeDeliveryChanceHeadings` and `describeDeliveryChanceRow`.

- [`6451f2e`](https://github.com/LetPeopleWork/lighthouse-clients/commit/6451f2ef9929f66f93fd8189020ca9014bbb286e) Thanks [@huserben](https://github.com/huserben)! - `lh feature get` reads like the Feature list
  
  Under `--pretty`, `lh feature get --ids` and `--refs` now print one row per Feature as the web's Feature
  list shows it: its reference, name, how much of its work is done over every Team (`8 of 13 Work Items`),
  its Forecasted Start, the date it is 85% likely to be done by, and its state. The Forecasted Start follows
  the web: a day work already began outranks `Cannot forecast`; otherwise the 85% start, `—` when nothing is
  known. Every term follows the instance's own Terminology. A Lighthouse whose answer lacks a Feature's
  per-Team work gets today's generic view, and `--json` / `--toon` are unchanged.
  
  `lh feature workitems --id <id>` now heads its list with the Feature it belongs to,
  `OE-002 Deep-sea camera stream · 3 Work Items`, and shows each Work Item's ID, name, type and state. When
  the Feature's name cannot be read, the heading says `Feature [id: 2]` instead and the list still shows.
  `--json` / `--toon` still ask for the Work Items alone.
  
  The Feature tools state their answer
  
  `lighthouse_feature_get` keeps its facts block and adds a second block counting the Features in the
  instance's words: `summary: 3 Features`, `summary: 1 Feature`, or `summary: No Features`.
  `lighthouse_feature_workitems` adds the heading `lh feature workitems` prints,
  `summary: OE-002 Deep-sea camera stream · 3 Work Items`, or `summary: Feature [id: 2] · 3 Work Items` when
  the Feature's name cannot be read. When the answer is in a shape the summary cannot read, the facts go out
  exactly as before, and the tool never fails because of it.
  
  `--pretty` is for people and its layout may change in any minor release; `--json`, `--toon` and the MCP
  tools' facts are the contract that scripts and agents read.
  
  The client package gains `readFeatureList`, `describeFeatureListCount`, `describeFeatureListHeadings`,
  `describeFeatureProgress`, `describeFeatureStart`, `describeFeatureCompletion`, `describeFeatureRow`,
  `readFeatureWorkItems`, `describeFeatureTitle`, `describeFeatureWorkItemsHeading`,
  `describeFeatureWorkItemHeadings`, `describeFeatureWorkItemRow` and the `FeatureListItem`, `FeatureStart`
  and `FeatureWorkItem` types.

- [`2f4a0c1`](https://github.com/LetPeopleWork/lighthouse-clients/commit/2f4a0c1898e51540962cf92b3e70a522db1c35c4) Thanks [@huserben](https://github.com/huserben)! - Every write confirms in one line
  
  The client package gains the write confirmations: `describeOwnerWriteConfirmation` says `Created: Team
  Lightspeed [id: 9].`, `Updated: …` or `Deleted: Team [id: 9].` in the instance's own word for a Team or
  Portfolio, `describeRefreshConfirmation` says a refresh was queued, and
  `describeBlackoutRuleWriteConfirmation` confirms a recurring blackout rule with Lighthouse's own summary of
  its schedule, word for word. `readWrittenOwner` and `readWrittenBlackoutRule` read what a write answered
  with.
  
  Under `--pretty`, `lh team`, `lh portfolio` and `lh blackout` create, update and delete, and the Team and
  Portfolio refresh, now print that one line, for example `Refresh queued: Team [id: 3]. Lighthouse updates
  it in the background.` A refresh used to say `Team refreshed: 3`, though Lighthouse only queues it. Under
  `--json` and `--toon` nothing changes: create and update hand back the written record, and delete and
  refresh keep today's lines (`Team deleted: 9`, `Team refreshed: 3`, …).
  
  A confirmation never fails on a word: an answer without a name is confirmed by its id (`Created: Team [id:
  9].`), a rule without a description by its schedule alone, and when the instance's terms cannot be read the
  seeded words stand in.
  
  The write tools confirm in one line
  
  `lighthouse_team_refresh` and `lighthouse_portfolio_refresh` keep their facts block (`team refreshed: 3`)
  and add the CLI's confirmation as a second block, `summary: Refresh queued: Team [id: 3]. Lighthouse
  updates it in the background.`, in the instance's word for a Team or Portfolio. `lighthouse_blackout_create`,
  `lighthouse_blackout_update` and `lighthouse_blackout_delete` do the same (`summary: Created: recurring
  blackout rule [id: 5] — Every Friday — every 2 weeks — from 2026-10-09 — no end (Focus Friday).`); the
  rule's own `summary` field, Lighthouse's wording of its schedule, stays in the facts untouched. When the
  answer is in a shape the confirmation cannot read, the facts go out exactly as before, and the tool never
  fails because of it.
  
  `--pretty` is for people and its layout may change in any minor release; `--json`, `--toon` and the MCP
  tools' facts are the contract that scripts and agents read.

- [`8f750d3`](https://github.com/LetPeopleWork/lighthouse-clients/commit/8f750d3debbea58b2eea130376f30117370f46f3) Thanks [@huserben](https://github.com/huserben)! - Blackout rules, the version and the health check read like the web
  
  The client package gains the housekeeping wording: `readBlackoutRules` reads the recurring blackout rules,
  `describeBlackoutRuleSchedule` names a rule by its id and Lighthouse's own summary of its schedule, word
  for word, `describeBlackoutRuleCount` counts them (`2 recurring blackout rules`), `describeVersion` says
  `Lighthouse v26.10.3.6` and `describeReachable` says which Lighthouse a health check reached.
  
  Under `--pretty`, `lh blackout list` lists the rules as the settings page does, under `Recurring blackout
  rules` with a Schedule and a Description column, or says `No recurring blackout rules.`; `lh version get`
  prints `Lighthouse v26.10.3.6`, as the footer shows it; and `lh health check` says `Lighthouse at
  https://… is reachable.` or `The standalone Lighthouse is reachable.` instead of `success`. Under `--json`
  and `--toon` nothing changes: the health check still prints `success`, and a failed one still reports
  `unreachable: connection refused` with exit code 1.
  
  The client package also gains `readWorkTrackingConnections` and `readWorkTrackingConnection`, which label
  each option as the connection editor does (from the connection's authentication method, the key when the
  method does not name it) and keep a secret's value out of what they return, decided by the secret flag
  alone. Under `--pretty`, `lh worktracking list` lists the Work Tracking Systems as the Overview does, with
  a Name and a Type column, titled in the instance's own word for them; `lh worktracking get` prints the
  connection's name and id, `Type: Jira` and an Option · Value table, where every secret reads
  `(secret, not shown)`, even if Lighthouse sends its value. Under `--json` and `--toon` a connection is
  still handed over exactly as Lighthouse sent it.
  
  The housekeeping tools state their answer
  
  `lighthouse_health_check` keeps `connectivity: success` and adds a second block,
  `summary: Lighthouse is reachable.`; `lighthouse_version_get` keeps `version: v26.10.3.6` and adds
  `summary: Lighthouse v26.10.3.6`. `lighthouse_worktracking_list` and `lighthouse_blackout_list` keep their
  facts block and add a second one counting the answer: `summary: 3 Work Tracking Systems` in the instance's
  own word for them, `summary: 2 recurring blackout rules`, the singular for one and `No …` for none.
  `lighthouse_worktracking_get` carries a `summary` naming the connection and its type,
  `Letpeoplework Jira [id: 1]` and `Type: Jira`, and never an option's value. When the answer is in a shape
  the summary cannot read, the facts go out exactly as before, and the tool never fails because of it; a
  failed check or a refused read carries no summary.
  
  `--pretty` is for people and its layout may change in any minor release; `--json`, `--toon` and the MCP
  tools' facts are the contract that scripts and agents read.
  
  The client package also gains `describeWorkTrackingSystemCount`, `describeConnectionSummary` and
  `LIGHTHOUSE_IS_REACHABLE`.

- [`c113a1e`](https://github.com/LetPeopleWork/lighthouse-clients/commit/c113a1ee4b61cfc1501092a71a1a5b5ad277c94c) Thanks [@huserben](https://github.com/huserben)! - Ask how much to refine from the terminal and from an assistant
  
  "How many Work Items should we refine before the next Refinement?" was answered only on a Team's
  Refinement tab in the browser. Now `lh` and the MCP tools answer it too, in exactly the words the
  web page uses and in the instance's own terminology, so a renamed "Story" or "Grooming" reads the
  same everywhere. A term left blank, or terminology that cannot be read, reads as the default word, and a Team
  read without a name is called by the instance's word for a Team and its id ("Squad 3").
  Needs a Lighthouse newer than v26.10.3.6; an older server is told to upgrade and is never asked.
  
  - `lh refinement get --team-id <id>` states the next Refinement, how many Work Items are ready
    against the range the Team is likely to pull, and how many more to refine. It then lists the
    Work Items in refinement with the needed ones numbered and the "enough for the next Refinement"
    line where the web draws it. Without a number it says why: no Refinement cadence, not enough data
    yet, or no refinement states. Like the web page, it states a verdict only with every fact it is
    said with — the next Refinement, the cycle and its likelihoods — and otherwise gives no number,
    no numbered Work Items and no line. With nothing in refinement it says only "No Work Items in
    Refinement states right now", as the web page does. `--json` and `--toon` return the facts unchanged.
  - The MCP tool `lighthouse_team_refinement_get` (input `{ id }`) returns the same facts plus a
    `summary` holding the sentence the web page states. Its description explains the verdict, the
    range and the cycle it covers, whether today is a Refinement day, how many days remain until the
    next one, and whether the ready count comes from votes or from stages.
  - The client gains `getTeamRefinement(teamId)`, `getTerminology()` and the shared wording both
    surfaces use: `readRefinementWording` reads the Team's name and the instance's terms, and
    `describeRefinementSummary` and friends state the need in them.
  
  This release also carries the runtime dependency updates held back since the last one:
  `@modelcontextprotocol/sdk` 1.31.0, `undici` 8.11.2, `zod` 4 and `@toon-format/toon` 4. The TOON
  update changes what `--toon` and the MCP tool results look like in two places, while decoding to the
  same data: a list of records whose nested objects hold only plain values is now one table row per
  record (for example `split{yes,yesBut,no}` in the header), and an empty list prints as `[]`. A
  parser built on TOON 2 cannot read those tables; one built on TOON 4 reads them back exactly.

- [`4dc896a`](https://github.com/LetPeopleWork/lighthouse-clients/commit/4dc896accfc148665c8d3e6fd26f5d5b26b70d98) Thanks [@huserben](https://github.com/huserben)! - See how the refinement votes stand, and vote, from the terminal and from an assistant
  
  Saying whether a Work Item is ready, and seeing whether the Team agrees, happened only on a Team's
  Refinement tab in the browser. Now `lh` and the MCP tools show how the votes stand on every Work Item in
  refinement, and let a person cast a vote, add a comment and take their vote back, under the same identity
  rules as the web page and in its words. Needs a Lighthouse newer than v26.10.3.6; an older server is told to
  upgrade and is never asked.
  
  - `lh refinement get` lists three more columns: **Votes** (the split, such as `1 Yes · 1 Yes, if…`, with a
    `*` where you have voted, or `No votes`), **Readiness** (`Ready`, `2 more Yes needed`, `Needs discussion`,
    as the web says it) and **Warnings** (`open question`, `stage disagrees`).
  - `lh refinement vote --team-id <id> --work-item <ref> --answer yes|yes-but|no [--comment <text>] [--as <name>]`,
    `lh refinement comment … --text <text>` and `lh refinement take-back …` answer in one line, such as
    `Recorded: Ana Lima — Yes on GR-073. That made GR-073 Ready.` A "Yes, if…" needs its condition. Lighthouse's
    refusals of a vote come back in plain words; any other refusal (a Team that is not there, a role that may
    not vote) reads `<category>: <reason>`, as in every other `lh` command. `--json` and `--toon` return the Work Item as the vote left it. A
    take-back names the answer it saw, so a vote changed since from somewhere else stays, and says whose vote it
    took back by the name that vote was cast under ("your vote" with sign-in, or when the log cannot say).
  - With sign-in, a vote is the signed-in account's; `lh` goes by what Lighthouse says, not by what was answered
    when the connection was saved. Without it, a vote carries the name given with `--as` or
    stored once with `lh config voter set --name <name>` (`lh config voter` shows it); `lh` never guesses a name.
    The first vote mints a random voter key for that Lighthouse and keeps it in `voter-keys.json` beside the CLI
    config, so the vote can be taken back from that machine. The file is its owner's alone (on Linux and
    macOS); `lh` and a local MCP server saving at the same moment both keep their keys, and a file that cannot
    be read is refused with a message naming it, never written over.
  - The MCP tools `lighthouse_team_refinement_vote` (`{ id, workItem, answer, comment?, voterName? }`, answer
    `Yes`, `YesBut` or `No`), `lighthouse_team_refinement_comment` and `lighthouse_team_refinement_voteTakeBack`
    are registered as writes. Their descriptions tell the assistant to confirm with the user first and to ask
    for the user's name rather than infer it. Each result carries a `summary` in the same words as `lh`.
    `lighthouse_team_refinement_get` marks the user's own vote. Like `lh`, the tools go by what Lighthouse says
    about sign-in: with it they send no name and keep no key, and a signed-in vote can be taken back; without
    it a vote or comment without `voterName` is refused before anything is sent or kept.
  - mcp-stdio keeps its voter key in the same file as `lh`, so a person is one voter whichever they use, and
    however each was given the URL (`HTTPS://Lighthouse.example:443/` and `https://lighthouse.example/api` are
    one Lighthouse).
    mcp-http, shared by many people, refuses votes on a Lighthouse without sign-in and points to the web page,
    `lh` or a local MCP server. With sign-in it votes only with the caller's own API key or token; a request
    that would fall back to the server's `LIGHTHOUSE_API_KEY` is refused, so nobody votes as the operator.
  - The client gains `castRefinementVote`, `addRefinementComment`, `takeBackRefinementVote` (with the `answer` it saw),
    `getRefinementLog` (a Work Item's sizing log, the caller's own entries marked `isMine`), a `voterKey` option
    on `getTeamRefinement`, `mintVoterKey`, `createFileVoterKeyStore` and the shared vote wording. A refusal's
    `LighthouseApiError` now also carries the `problemCode` and `problemTitle` Lighthouse sent.

- [`c4d52b9`](https://github.com/LetPeopleWork/lighthouse-clients/commit/c4d52b9f12120bb71418f5c333be35280feae160) Thanks [@huserben](https://github.com/huserben)! - `lh` now asks once per Lighthouse, on stderr after a command that reached it, whether to send anonymous usage data to that Lighthouse. **Nothing is sent without a yes**: only `y` or `yes` counts, and anything else is a No kept on your machine and never sent. `lh` asks only when stdin, stdout and stderr are all a terminal (never in scripts, pipes or CI), only a Lighthouse that takes usage data from `lh`, and never under `DO_NOT_TRACK` (set to anything but `0`, `false` or empty), which always wins. After a yes, `lh forecast manual` is counted as a manual forecast run from the command line. Answers are kept in `usage-data.json` beside `voter-keys.json`, readable by you only. `lh config usage-data` shows your answer and what your Lighthouse allows; `lh config usage-data on` says yes without a question (also on a build agent), and `lh config usage-data off` withdraws a yes at your Lighthouse and keeps a No. Usage data never changes what `lh` prints or its exit code, and a Lighthouse slow to answer about it delays a command by at most a second. Details: https://docs.lighthouse.letpeople.work/settings/usagedata.html
  
  When a yes cannot be recorded, `lh` names the Lighthouse as `lh config usage-data` does: its URL, or "the standalone Lighthouse".
  
  A yes turned off with `lh config usage-data off` while another `lh` was renewing it stays off: the renewal sends nothing and withdraws the grant it was given.
  
  A yes Lighthouse granted but your machine could not keep (another answer was kept first, or the answers file could not be written) is withdrawn at Lighthouse rather than left granted with nobody holding it.
  
  A yes whose confirmation date lies in the future, as after a clock set wrong, is checked with Lighthouse again like a day-old one instead of counting as confirmed forever.
  
  While another `lh` or the MCP server holds the answers file, renewing a yes after a command waits no longer than the one-second usage data budget; when the budget runs out, nothing is sent for that command.

- [`25fc147`](https://github.com/LetPeopleWork/lighthouse-clients/commit/25fc14711eaf2af0f855a306d942c687cc20ed53) Thanks [@huserben](https://github.com/huserben)! - After a yes to usage data, more `lh` commands are counted, each under the name the web already counts the same action by, and only once Lighthouse accepted it; a refused or failed command counts nothing.
  
  - `lh team create`, `lh team delete`, `lh portfolio create` and `lh portfolio delete` count as a Team or Portfolio created or deleted; `lh team refresh` and `lh portfolio refresh` as a refresh by hand. Nothing about the Team or Portfolio is sent: no id, name or number.
  - `lh refinement vote` counts as a sizing vote cast, and also as a Work Item made Ready when Lighthouse says this vote made it Ready. Each says only whether it happened on the Team's Refinement day, on another day, or for a Team with no Refinement cadence, as Lighthouse's answer tells it, never this machine's clock.
  - `lh refinement get` on a Team's Refinement day, with at least one Work Item listed, counts as the Refinement day's verdict shown (below, in or above the range, or no number).
  
  Every other command counts nothing. Usage data still never changes what `lh` prints or its exit code, and it asks Lighthouse for nothing beyond the usage data itself: the usage data calls no longer check the version first.

### Patch Changes

- [`a7f21d8`](https://github.com/LetPeopleWork/lighthouse-clients/commit/a7f21d8eb0147c2f60bf820d27196310283e7caf) Thanks [@huserben](https://github.com/huserben)! - An empty list says so in words under `--pretty`
  
  `lh team list`, `lh portfolio list`, `lh feature get` and `lh worktracking list` printed a table with
  headings and no rows when there was nothing to list. They now say `No Teams.`, `No Portfolios.`,
  `No Features.` or `No Work Tracking Systems.` in the instance's own words, as `lh blackout list` already
  says `No recurring blackout rules.`. `--json` and `--toon` are unchanged.

- [`d10bd08`](https://github.com/LetPeopleWork/lighthouse-clients/commit/d10bd086de111130b84a80be0f965419288e9792) Thanks [@huserben](https://github.com/huserben)! - `lh worktracking get` and `lh worktracking list` no longer print a secret under `--pretty` when the
  connection arrives in a shape the readable view does not recognise
  
  When one option of a connection was in an unexpected shape (a number for a value, or no secret flag), or
  one connection in the list had no name, `--pretty` fell back to the generic view and printed every
  option's value as Lighthouse sent it, including a secret Lighthouse should never have sent. That generic
  view now reads `(secret, not shown)` for every option value that is not known to be safe: only an option
  that says it is not secret, and that its authentication method does not declare secret, keeps its value.
  `--json` and `--toon` still hand a connection over exactly as Lighthouse sent it.
  
  The client package gains `hideConnectionSecrets`, which makes that copy of a connection or a list of them.

- [`92d0743`](https://github.com/LetPeopleWork/lighthouse-clients/commit/92d0743a591e9669bc3adacbc40fd00d65c066ae) Thanks [@huserben](https://github.com/huserben)! - A Terminology answer whose term is not a word no longer breaks `--pretty` or an MCP summary
  
  `resolveTerms` now takes an instance's value, then its default, only when it is non-empty text, and falls
  back to the seeded word otherwise. Before, a number or an object in a term made `--pretty` fail with
  `cell.padEnd is not a function`, or print `[object Object]`, and made an MCP summary read
  `3 [object Object]`. `--pretty` also no longer fails at all when a readable view cannot cope with an
  answer: it shows that answer in the generic view instead, with exit code 0.

- [`45578ee`](https://github.com/LetPeopleWork/lighthouse-clients/commit/45578eeb899945d9cc1d50ca8f8c0f9411be1103) Thanks [@huserben](https://github.com/huserben)! - Remove an unused browser-opening helper from the command dependencies; no command ever called it.
- Updated dependencies [[`92dcba7`](https://github.com/LetPeopleWork/lighthouse-clients/commit/92dcba78798a43179e6b610da647d70df7d78642), [`d624b34`](https://github.com/LetPeopleWork/lighthouse-clients/commit/d624b34c91cae9a7fd0d6fd5651d5662bbcccb69), [`8dbc106`](https://github.com/LetPeopleWork/lighthouse-clients/commit/8dbc1062877fc9e3067623b000a94466717b3515), [`7641927`](https://github.com/LetPeopleWork/lighthouse-clients/commit/7641927e0101b9c66e1cbf776715c68f71ec53ea), [`45aa6be`](https://github.com/LetPeopleWork/lighthouse-clients/commit/45aa6be764d20c6773a596e5cb0eba531cf116bf), [`004f43f`](https://github.com/LetPeopleWork/lighthouse-clients/commit/004f43f8b9f28050b06876f8bf04468d4b88e581), [`a31f95f`](https://github.com/LetPeopleWork/lighthouse-clients/commit/a31f95fd24bfb8455a56c74362fd6a5cb9235192), [`6451f2e`](https://github.com/LetPeopleWork/lighthouse-clients/commit/6451f2ef9929f66f93fd8189020ca9014bbb286e), [`2f4a0c1`](https://github.com/LetPeopleWork/lighthouse-clients/commit/2f4a0c1898e51540962cf92b3e70a522db1c35c4), [`8f750d3`](https://github.com/LetPeopleWork/lighthouse-clients/commit/8f750d3debbea58b2eea130376f30117370f46f3), [`d10bd08`](https://github.com/LetPeopleWork/lighthouse-clients/commit/d10bd086de111130b84a80be0f965419288e9792), [`92d0743`](https://github.com/LetPeopleWork/lighthouse-clients/commit/92d0743a591e9669bc3adacbc40fd00d65c066ae), [`c113a1e`](https://github.com/LetPeopleWork/lighthouse-clients/commit/c113a1ee4b61cfc1501092a71a1a5b5ad277c94c), [`4dc896a`](https://github.com/LetPeopleWork/lighthouse-clients/commit/4dc896accfc148665c8d3e6fd26f5d5b26b70d98), [`c4d52b9`](https://github.com/LetPeopleWork/lighthouse-clients/commit/c4d52b9f12120bb71418f5c333be35280feae160), [`25fc147`](https://github.com/LetPeopleWork/lighthouse-clients/commit/25fc14711eaf2af0f855a306d942c687cc20ed53)]:
  - @letpeoplework/lighthouse-client@1.9.0

## 1.7.1

### Patch Changes

- [`1ceb8e6`](https://github.com/LetPeopleWork/lighthouse-clients/commit/1ceb8e6bdc6dea7fea52c462efc11195b37e250b) Thanks [@huserben](https://github.com/huserben)! - The over-time series no longer claim Lighthouse "never backfills". A System Admin can now switch on filling in past days (a Preview, off by default); on such a server a read that finds missing days starts filling them in the background, so a later call may return more days. The client docs, CLI comments, MCP tool descriptions and the skill now say what is true either way. No request or response shape changed.

- Updated dependencies [[`1ceb8e6`](https://github.com/LetPeopleWork/lighthouse-clients/commit/1ceb8e6bdc6dea7fea52c462efc11195b37e250b)]:
  - @letpeoplework/lighthouse-client@1.8.1

## 1.7.0

### Minor Changes

- [`501ceb1`](https://github.com/LetPeopleWork/lighthouse-clients/commit/501ceb13c60668d194e9f970a935ae4529c371ec) Thanks [@huserben](https://github.com/huserben)! - Read a delivery's recorded trend from the client, the CLI and MCP

  Lighthouse has recorded a daily snapshot per delivery since v26.6.7.1 — total, done and
  remaining work, the forecast, and one entry per epic — but `metrics-history` was exposed
  nowhere outside the browser, so every over-time delivery chart was unanswerable from a
  terminal or an assistant.

  - client: `getDeliveryMetricsHistory(deliveryId)`, gated on a server newer than v26.5.29.5
    (the last release without the endpoint). The per-epic `totalItems` and `isUsingDefaultSize`
    are optional, so a server that predates them parses cleanly and simply reports no sizes.
    `summariseDeliveryMetricsHistory` projects a history to one row per day.
  - cli: `lh delivery metrics --delivery-id <id> [--detail epics]`. A `--detail` with no value is
    refused rather than treated as absent, which would have printed the summary the caller asked
    to step past.
  - mcp-core: read-only `lighthouse_delivery_metrics`.

  The CLI and the MCP tool summarise by default: a 90-day window over fifteen epics is well
  over a thousand breakdown objects plus a forecast distribution per day, which is more than
  a terminal can show and more than an assistant should be handed to answer "how has the
  scope moved?". The client itself returns the payload whole — dropping data is the caller's
  choice, not the library's.

### Patch Changes

- Updated dependencies [[`501ceb1`](https://github.com/LetPeopleWork/lighthouse-clients/commit/501ceb13c60668d194e9f970a935ae4529c371ec)]:
  - @letpeoplework/lighthouse-client@1.8.0

## 1.6.0

### Minor Changes

- [`5bcb2a6`](https://github.com/LetPeopleWork/lighthouse-clients/commit/5bcb2a6996c1b7e09b78ef4c82b44811e6d7e498) Thanks [@huserben](https://github.com/huserben)! - Expose the two over-time trend series — percentiles and process-behaviour limits (Lighthouse Epic 5427).

  Lighthouse records a daily snapshot of its percentile quartet and its natural process limits, so you can ask "how has this been trending?" instead of only "what is it right now?". Both series are now readable from the client, the CLI and MCP.

  - **Client**: `getTeamPercentilesOverTime` / `getPortfolioPercentilesOverTime` return the dated `p50/p70/p85/p95` quartet for a metric family (`CycleTime`, `WorkItemAge`), and `getTeamProcessBehaviorOverTime` / `getPortfolioProcessBehaviorOverTime` return the dated `unpl/average/lnpl` triple for a process-behaviour family (`Throughput`, `WorkItemAge`, `Wip`, `CycleTime`, `Arrivals`, and — portfolio only — `FeatureSize`). Both are gated on a Lighthouse server newer than v26.7.11.4.
  - **CLI**: two new `metrics` selections, `--metrics percentilesOverTime` and `--metrics processBehaviorOverTime`.
  - **MCP**: `lighthouse_{team,portfolio}_metrics_percentilesOverTime` and `lighthouse_{team,portfolio}_metrics_processBehaviorOverTime`.

  Two things worth knowing, because they change how an empty answer should be read:

  **Recording is forward-only.** Lighthouse starts capturing the day the feature is deployed and never backfills history it did not observe, so a freshly upgraded server returns an empty series until it has recorded some days. That is honest emptiness, not an error. Process-behaviour days without a usable baseline are omitted rather than recorded as zeroes, so an empty series never means "a process pinned at zero".

  **Ask for one cycle-time horizon at a time.** Cycle-time percentiles are recorded per horizon (30/60/90 days), but the row shape carries no horizon field — so a `CycleTime` request that omits `horizon` returns all three interleaved with no way to separate them. Pass an explicit `horizon` whenever you ask for `CycleTime`. Work item age is always as-of-today and has no horizon, so one is ignored if sent. The CLI pins horizon 30, matching the dashboard's default view.

### Patch Changes

- Updated dependencies [[`5bcb2a6`](https://github.com/LetPeopleWork/lighthouse-clients/commit/5bcb2a6996c1b7e09b78ef4c82b44811e6d7e498), [`9db487b`](https://github.com/LetPeopleWork/lighthouse-clients/commit/9db487bb4ed87409e8f264751a7f1b6a64b10499)]:
  - @letpeoplework/lighthouse-client@1.7.0

## 1.5.0

### Minor Changes

- [`5b8f305`](https://github.com/LetPeopleWork/lighthouse-clients/commit/5b8f305c33c5029bbde42fc9d02f1e39f03d8c9c) Thanks [@huserben](https://github.com/huserben)! - Expose blocked items to the clients (Lighthouse Epic 5074).

  - **Client**: new version-gated `getTeamBlockedCountHistory` / `getPortfolioBlockedCountHistory` methods returning the blocked-items-over-time trend (`BlockedCountSnapshot[]`). Gated on a Lighthouse server newer than `v26.7.3.1`.
  - **CLI**: new `blocked` metric for the `metrics` command (`--metrics blocked`) surfacing the blocked-over-time history; replaces the former static "unavailable" placeholder.
  - **MCP**: new `lighthouse_team_metrics_blockedCountHistory` and `lighthouse_portfolio_metrics_blockedCountHistory` tools.

  To see what is blocked _right now_ and for how long, read the current WIP snapshot — each item carries `isBlocked` and, when blocked, a `blockedSince` timestamp (server newer than `v26.7.3.1`).

### Patch Changes

- Updated dependencies [[`5b8f305`](https://github.com/LetPeopleWork/lighthouse-clients/commit/5b8f305c33c5029bbde42fc9d02f1e39f03d8c9c)]:
  - @letpeoplework/lighthouse-client@1.6.0

## 1.4.1

### Patch Changes

- Updated dependencies [[`c2efcf1`](https://github.com/LetPeopleWork/lighthouse-clients/commit/c2efcf1dede34a766b26f50003ec0bf2dbd698ab)]:
  - @letpeoplework/lighthouse-client@1.5.0

## 1.4.0

### Minor Changes

- [`c462875`](https://github.com/LetPeopleWork/lighthouse-clients/commit/c4628751c08cf3e1cc46906a4abe1d81f76f41db) Thanks [@huserben](https://github.com/huserben)! - Support named cycle times (premium) on cycle-time percentiles.

  `getTeamCycleTimePercentiles` / `getPortfolioCycleTimePercentiles` gain an optional
  `definitionId` argument that returns the percentiles for a named cycle time instead of
  the default cycle time. The CLI exposes it as `--definition-id <id>` on `lh metrics ...`
  (cycleTime metric), and the MCP `lighthouse_team_metrics_cycleTimePercentiles` tool gains
  an optional `definitionId`. The change is additive — an older Lighthouse server ignores
  the parameter and returns the default percentiles, so no version gate is required. The
  per-item named durations already flow through `cycleTimeData` unchanged.

- [`f8d5d04`](https://github.com/LetPeopleWork/lighthouse-clients/commit/f8d5d0495d5c93d158a580abaca15b9f6c3d514e) Thanks [@huserben](https://github.com/huserben)! - Add version-gated work-item-age percentiles (team + portfolio).

  `getTeamWorkItemAgePercentiles` / `getPortfolioWorkItemAgePercentiles` wrap the new
  `/metrics/workItemAgePercentiles` endpoint. The CLI surfaces the percentiles under the
  `workItemAge` metric (new `workItemAgePercentiles` payload key), and the MCP gains
  `lighthouse_team_metrics_workItemAgePercentiles` /
  `lighthouse_portfolio_metrics_workItemAgePercentiles` tools. The endpoint requires a
  Lighthouse server newer than `v26.6.7.1`; older servers fail fast with an
  "upgrade Lighthouse" error and never issue the request, while dev/unparseable versions
  are allowed through.

### Patch Changes

- Updated dependencies [[`c462875`](https://github.com/LetPeopleWork/lighthouse-clients/commit/c4628751c08cf3e1cc46906a4abe1d81f76f41db), [`f8d5d04`](https://github.com/LetPeopleWork/lighthouse-clients/commit/f8d5d0495d5c93d158a580abaca15b9f6c3d514e)]:
  - @letpeoplework/lighthouse-client@1.4.0

## 1.3.0

### Minor Changes

- [`1e4f59e`](https://github.com/LetPeopleWork/lighthouse-clients/commit/1e4f59ef92d4176cb3c559bc169401d8552cec0c) Thanks [@huserben](https://github.com/huserben)! - Add recurring blackout-rule support across the client, CLI, and MCP surfaces.

  Wraps the new Lighthouse `recurring-blackout-rules` endpoint family — recurring
  non-working days (pick weekdays, an every-X-weeks interval, a start date, and an
  optional open end) that forecasts skip automatically, just like one-off blackout
  dates.

  - **client**: `getRecurringBlackoutRules`, `createRecurringBlackoutRule`,
    `updateRecurringBlackoutRule`, and `deleteRecurringBlackoutRule`, with the
    `RecurringBlackoutRule` / `DayOfWeek` / `RecurringBlackoutRuleInput` types.
  - **cli**: a `blackout` command group — `list`, `create`, `update`, `delete`.
  - **mcp**: four tools — `lighthouse_blackout_list`, `lighthouse_blackout_create`,
    `lighthouse_blackout_update`, `lighthouse_blackout_delete` — exposed through
    the HTTP and stdio servers.

  These methods are server-version-gated: the endpoint family did not exist before,
  so on a Lighthouse server that is not newer than `v26.5.29.5` (the last release
  without it) the client returns a clear "upgrade Lighthouse" error instead of an
  opaque 404, and makes no write request. Dev and unparseable server versions are
  never blocked. Creating, updating, and deleting rules is a Premium, system-admin
  operation on the server; the clients forward the caller's auth and surface a 403
  normally.

### Patch Changes

- Updated dependencies [[`70a4177`](https://github.com/LetPeopleWork/lighthouse-clients/commit/70a4177e05475185ae29a6623d5e551923fbc22d), [`1e4f59e`](https://github.com/LetPeopleWork/lighthouse-clients/commit/1e4f59ef92d4176cb3c559bc169401d8552cec0c)]:
  - @letpeoplework/lighthouse-client@1.3.0

## 1.2.0

### Minor Changes

- [`7f33beb`](https://github.com/LetPeopleWork/lighthouse-clients/commit/7f33beb0b9f243493778b1e2fc9fdc29f641d71a) Thanks [@huserben](https://github.com/huserben)! - Add cumulative-state-time metrics support across the client, CLI, and MCP surfaces.

  Wraps the six Lighthouse `cumulativeStateTime` endpoints (bar data, per-state
  item drill-down, and picker candidates — team and portfolio scoped):

  - **client**: `getTeamCumulativeStateTime`, `getTeamCumulativeStateTimeItems`,
    `getTeamCumulativeStateTimeCandidates` and the portfolio equivalents, plus
    typed result models. Bar and items accept an optional `itemIds` subset; items
    takes a `state`.
  - **cli**: new `cumulativeStateTime` value for `lh metrics team|portfolio --metrics`,
    bundling bar + candidates (+ per-state drill-down when `--state` is given);
    `--item-ids <id,...>` narrows the bars to a subset.
  - **mcp**: six new read-only tools
    (`lighthouse_{team,portfolio}_metrics_cumulativeStateTime[Items|Candidates]`).

### Patch Changes

- Updated dependencies [[`7f33beb`](https://github.com/LetPeopleWork/lighthouse-clients/commit/7f33beb0b9f243493778b1e2fc9fdc29f641d71a), [`5b622f7`](https://github.com/LetPeopleWork/lighthouse-clients/commit/5b622f7d495cf5d3e5c600c5855ce00a7c4846b9)]:
  - @letpeoplework/lighthouse-client@1.2.0

## 1.1.0

### Minor Changes

- [`bee9336`](https://github.com/LetPeopleWork/lighthouse-clients/commit/bee93362c4c2c62add796346a7ba1b5ef383f7da) Thanks [@huserben](https://github.com/huserben)! - Support Lighthouse v26.5.24.10's "Exclude Items for Throughput" forecast filter:

  - `getTeamThroughput(teamId, range?, view?)` and `getTeamPredictabilityScore(teamId, range?, view?)` now accept an optional `view: "raw" | "filtered"`. Passing `"filtered"` appends `&view=filtered` so the team's forecast-exclusion rule is applied server-side.
  - `ManualForecastInput` and `BacktestInput` gain an optional `applyFilterOverride?: boolean` field (`true` = apply, `false` = skip, omit = respect the team setting).
  - MCP tools `lighthouse_team_metrics_throughput`, `lighthouse_forecast_manual`, and `lighthouse_forecast_backtest` accept the new params and surface the `filterApplied` / `excludedSummary` fields on responses (the server already includes them in the payload).
  - CLI: `lh metrics team --filter <raw|filtered>` plus `lh forecast manual --filter <raw|filtered|team>` and `lh forecast backtest --filter <raw|filtered|team>`.

  All additions are backward-compatible. Older Lighthouse servers ignore the new fields.

### Patch Changes

- Updated dependencies [[`bee9336`](https://github.com/LetPeopleWork/lighthouse-clients/commit/bee93362c4c2c62add796346a7ba1b5ef383f7da)]:
  - @letpeoplework/lighthouse-client@1.1.0

## 1.0.1

### Patch Changes

- [`9c0a057`](https://github.com/LetPeopleWork/lighthouse-clients/commit/9c0a0575c2803ff2fcbc5168ffa1aea87338ca6d) Thanks [@huserben](https://github.com/huserben)! - fix item age calculation with non-midnight UTC startedDate

- Updated dependencies [[`9c0a057`](https://github.com/LetPeopleWork/lighthouse-clients/commit/9c0a0575c2803ff2fcbc5168ffa1aea87338ca6d)]:
  - @letpeoplework/lighthouse-client@1.0.1

## 1.0.0

### Major Changes

- [`2b54253`](https://github.com/LetPeopleWork/lighthouse-clients/commit/2b542537d2756dbeb582764bdff1aa4077e35e3c) Thanks [@huserben](https://github.com/huserben)! - Initial release of cli and mcp for Lighthouse

- [`2b54253`](https://github.com/LetPeopleWork/lighthouse-clients/commit/2b542537d2756dbeb582764bdff1aa4077e35e3c) Thanks [@huserben](https://github.com/huserben)! - Add work item age and total work item age metrics, derived client-side from the WIP-over-time endpoint.

  **New exports in `@letpeoplework/lighthouse-client`:**

  - `WorkItemAgeEntry`, `DailyWorkItemAge`, `WorkItemAgeOverTimeResult`
  - `DailyTotalWorkItemAge`, `TotalWorkItemAgeOverTimeResult`
  - `getTeamWorkItemAgeOverTime`, `getTeamTotalWorkItemAgeOverTime`
  - `getPortfolioWorkItemAgeOverTime`, `getPortfolioTotalWorkItemAgeOverTime`

  **Breaking change in `@letpeoplework/lighthouse-cli`:** The `workItemAge` and `totalWorkItemAge` metric payload shapes have changed. Both now return a time-series result with `{ startDate, endDate, daily: [...] }` instead of a single scalar or legacy structure.

  **New MCP tools in `@letpeoplework/lighthouse-mcp-core`:**

  - `lighthouse_team_metrics_workItemAge`
  - `lighthouse_team_metrics_totalWorkItemAge`
  - `lighthouse_portfolio_metrics_workItemAge`
  - `lighthouse_portfolio_metrics_totalWorkItemAge`

### Patch Changes

- Updated dependencies [[`2b54253`](https://github.com/LetPeopleWork/lighthouse-clients/commit/2b542537d2756dbeb582764bdff1aa4077e35e3c), [`2b54253`](https://github.com/LetPeopleWork/lighthouse-clients/commit/2b542537d2756dbeb582764bdff1aa4077e35e3c)]:
  - @letpeoplework/lighthouse-client@1.0.0

## 0.12.1

### Patch Changes

- [`c0faba8`](https://github.com/LetPeopleWork/lighthouse-clients/commit/c0faba8cce1798d2c7046c2d1b4b21373d137540) Thanks [@huserben](https://github.com/huserben)! - add CLI startup verification and enhance isDirectExecution logic

## 0.12.0

### Minor Changes

- [`820ea0a`](https://github.com/LetPeopleWork/lighthouse-clients/commit/820ea0aaae19e3e3883124503467b9851d4c68f5) Thanks [@huserben](https://github.com/huserben)! - add support for API key authentication via environment variable in CLI

### Patch Changes

- [`d3fa8cd`](https://github.com/LetPeopleWork/lighthouse-clients/commit/d3fa8cd3d8455653137f637f2ca5b0c1fdabb7b7) Thanks [@huserben](https://github.com/huserben)! - Update readme

## 0.11.0

### Minor Changes

- [`0976815`](https://github.com/LetPeopleWork/lighthouse-clients/commit/0976815b9a460ee74da65a2871a5bdf36685dd94) Thanks [@huserben](https://github.com/huserben)! - Add MCP Server features

### Patch Changes

- Updated dependencies [[`0976815`](https://github.com/LetPeopleWork/lighthouse-clients/commit/0976815b9a460ee74da65a2871a5bdf36685dd94), [`0976815`](https://github.com/LetPeopleWork/lighthouse-clients/commit/0976815b9a460ee74da65a2871a5bdf36685dd94)]:
  - @letpeoplework/lighthouse-client@0.8.0

## 0.10.0

### Minor Changes

- [`5e2e897`](https://github.com/LetPeopleWork/lighthouse-clients/commit/5e2e8970d070e124d7962c37176632eb004126e7) Thanks [@huserben](https://github.com/huserben)! - replace bearer token authentication with API key support in CLI

### Patch Changes

- [`2a7085a`](https://github.com/LetPeopleWork/lighthouse-clients/commit/2a7085a17f68d19dedfad8c3497c267cf712e731) Thanks [@huserben](https://github.com/huserben)! - remove blackout indicators from daily metrics data structures

- [`0f91053`](https://github.com/LetPeopleWork/lighthouse-clients/commit/0f910534adbb9670b35f96780d3b440a3c799322) Thanks [@huserben](https://github.com/huserben)! - add scripted connection options for non-interactive CLI usage

## 0.9.0

### Minor Changes

- [`8db3471`](https://github.com/LetPeopleWork/lighthouse-clients/commit/8db34715fc38bf951223fd14eef4e55abf3edf33) Thanks [@huserben](https://github.com/huserben)! - Add optional `--metrics` flag to `lh metrics team` and `lh metrics portfolio` commands. Pass a comma-separated list of metric names to retrieve only those metrics (e.g. `--metrics throughput,wip,cycletime`). Omit the flag to get all metrics as before. Allowed values: `throughput`, `wip`, `cycleTime`, `workItemAge`, `totalWorkItemAge`, `arrivals`, `predictabilityScore`. Unknown values produce a clear error listing allowed names.

- [`8db3471`](https://github.com/LetPeopleWork/lighthouse-clients/commit/8db34715fc38bf951223fd14eef4e55abf3edf33) Thanks [@huserben](https://github.com/huserben)! - add optional --metrics flag to lh metrics commands for selective metric retrieval

- [`d2b2795`](https://github.com/LetPeopleWork/lighthouse-clients/commit/d2b27956b91c84d314ce8b37ae81d6ff4c8800ee) Thanks [@huserben](https://github.com/huserben)! - rename totalWorkItemAgePbc to totalWorkItemAgeInfo and update related API endpoints

### Patch Changes

- Updated dependencies [[`d2b2795`](https://github.com/LetPeopleWork/lighthouse-clients/commit/d2b27956b91c84d314ce8b37ae81d6ff4c8800ee)]:
  - @letpeoplework/lighthouse-client@0.7.0

## 0.8.1

### Patch Changes

- [`6f72583`](https://github.com/LetPeopleWork/lighthouse-clients/commit/6f7258350fca6cd19a200624c3a8f5d8be1a05cf) Thanks [@huserben](https://github.com/huserben)! - Fix linting

## 0.8.0

### Minor Changes

- [`391212c`](https://github.com/LetPeopleWork/lighthouse-clients/commit/391212c10838382a0a6fbdb1ce2fe0c8f46d75cc) Thanks [@huserben](https://github.com/huserben)! - use fileURLToPath for URL comparison in runCli

## 0.7.0

### Minor Changes

- [`a9ebce0`](https://github.com/LetPeopleWork/lighthouse-clients/commit/a9ebce0fceae503971b45bf3ec1b595efe0e6c94) Thanks [@huserben](https://github.com/huserben)! - add new team and portfolio metrics endpoints to Lighthouse client

### Patch Changes

- Updated dependencies [[`a9ebce0`](https://github.com/LetPeopleWork/lighthouse-clients/commit/a9ebce0fceae503971b45bf3ec1b595efe0e6c94)]:
  - @letpeoplework/lighthouse-client@0.6.0

## 0.6.0

### Minor Changes

- [`2ad3aeb`](https://github.com/LetPeopleWork/lighthouse-clients/commit/2ad3aeb8d5cae15c3fb6a80ee8c9146474f02e33) Thanks [@huserben](https://github.com/huserben)! - enhance CLI to support standalone mode

### Patch Changes

- Updated dependencies [[`2ad3aeb`](https://github.com/LetPeopleWork/lighthouse-clients/commit/2ad3aeb8d5cae15c3fb6a80ee8c9146474f02e33)]:
  - @letpeoplework/lighthouse-client@0.5.0

## 0.5.0

### Minor Changes

- [`d5fd130`](https://github.com/LetPeopleWork/lighthouse-clients/commit/d5fd130c5afc4b1a7e5d6655fb6ab993ba8a82b7) Thanks [@huserben](https://github.com/huserben)! - Handle auth properly

- [`d4a3c0f`](https://github.com/LetPeopleWork/lighthouse-clients/commit/d4a3c0f62525e59a3532251f8cab4c9761766bb2) Thanks [@huserben](https://github.com/huserben)! - enhance CLI authentication flow with support for insecure HTTPS and improved error handling

- [`1b93ea0`](https://github.com/LetPeopleWork/lighthouse-clients/commit/1b93ea0ff231016b24d13e99bdf5a675c985e0a0) Thanks [@huserben](https://github.com/huserben)! - add support for multiple output formats (pretty, json, toon) and configure default output format

### Patch Changes

- Updated dependencies [[`d5fd130`](https://github.com/LetPeopleWork/lighthouse-clients/commit/d5fd130c5afc4b1a7e5d6655fb6ab993ba8a82b7), [`d4a3c0f`](https://github.com/LetPeopleWork/lighthouse-clients/commit/d4a3c0f62525e59a3532251f8cab4c9761766bb2)]:
  - @letpeoplework/lighthouse-client@0.4.0

## 0.4.2

### Patch Changes

- fix: update CLI version to 0.5.0 and change bin entry to use .js extension

## 0.4.1

### Patch Changes

- [`2564221`](https://github.com/LetPeopleWork/lighthouse-clients/commit/2564221cb3b7ebe5cc93f47dd6f4ffcd92db8cc0) Thanks [@huserben](https://github.com/huserben)! - Fix missing CJS build output in lighthouse-client. The package was missing `"type": "module"` which caused tsup to produce `index.mjs`/`index.js` instead of `index.js`/`index.cjs`, resulting in a runtime crash when the CLI tried to load `dist/index.cjs` after a global install.

- Bump packages

- Updated dependencies [[`2564221`](https://github.com/LetPeopleWork/lighthouse-clients/commit/2564221cb3b7ebe5cc93f47dd6f4ffcd92db8cc0)]:
  - @letpeoplework/lighthouse-client@0.3.1

## 0.4.0

### Minor Changes

- rename CLI command from `lighthouse` to `lh`

- Rename CLI command from `lighthouse` to `lh`.

  **Breaking change:** the globally installed command is now `lh` instead of `lighthouse`. Users upgrading from 0.3.x must reinstall the package to register the new command name:

  ```bash
  npm install -g @letpeoplework/lighthouse-cli
  # then use lh instead of lighthouse
  lh health check
  ```

## 0.3.1

### Patch Changes

- Make cli executable via npm

## 0.3.0

### Minor Changes

- [`f31572c`](https://github.com/LetPeopleWork/lighthouse-clients/commit/f31572ccf8fc2481bb7e1106a21b650d86a471ce) Thanks [@huserben](https://github.com/huserben)! - add team and portfolio metrics tools

### Patch Changes

- Updated dependencies [[`f31572c`](https://github.com/LetPeopleWork/lighthouse-clients/commit/f31572ccf8fc2481bb7e1106a21b650d86a471ce)]:
  - @letpeoplework/lighthouse-client@0.3.0
