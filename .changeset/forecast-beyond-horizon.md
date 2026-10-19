---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": minor
"@letpeoplework/lighthouse-mcp-core": minor
---

Forecasts that reach beyond Lighthouse's five-year simulation horizon now read "More than 5 years" instead of a
date about five years out. The number comes from Lighthouse (`horizonYears`), never a fixed 5.

- `lh forecast manual`'s When table, the Forecasted Start and Forecasted Completion (85%) columns of
  `lh feature get`, the Forecast 85% column of `lh delivery list`, and a recorded day's chances in
  `lh delivery metrics` say "More than 5 years" for a chance Lighthouse marks `beyondHorizon`. `--json` carries
  the two fields unchanged.
- The forecast, Feature and Delivery MCP tools pass `beyondHorizon` and `horizonYears` on unchanged, and their
  descriptions tell the assistant to say "More than <horizonYears> years" for such a chance and never quote its
  stand-in date.
- The client reads the two fields when present (`describePercentileDate`, `yearsBeyondHorizon`,
  `moreThanYearsText`). An older Lighthouse, which sends neither, keeps every date exactly as before.
