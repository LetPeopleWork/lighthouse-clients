---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": minor
"@letpeoplework/lighthouse-mcp-core": minor
---

Read a delivery's recorded trend from the client, the CLI and MCP

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
