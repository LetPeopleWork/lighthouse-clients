---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": minor
"@letpeoplework/lighthouse-mcp-core": minor
---

The client reads a forecast's level and likelihood the way the web does

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
