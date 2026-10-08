---
"@letpeoplework/lighthouse-mcp-core": patch
---

`lighthouse_forecast_manual` and `lighthouse_forecast_backtest` never fail because their summary cannot be
worded

Like every other tool, they now hand over the facts alone when wording the summary fails, instead of
failing the call.
