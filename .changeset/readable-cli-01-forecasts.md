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
the When and How Many tables with each chance's level (`Certain`, `Confident`, `Realistic`, `Risky`) and
days written as `Mon 9 Nov 2026`, and the likelihood sentence, all in the instance's own terminology.
`--json` and `--toon` are unchanged, and an answer in a shape the CLI does not recognise still prints the
generic view. The client package gains `resolveTerms` / `readTerms`, `formatCalendarDay` /
`formatTimestamp`, `readAnswerWording` and `readManualForecast` with its `describe…` wording.
