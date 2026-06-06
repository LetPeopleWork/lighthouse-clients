---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": minor
"@letpeoplework/lighthouse-mcp-core": minor
"@letpeoplework/lighthouse-mcp-http": minor
"@letpeoplework/lighthouse-mcp-stdio": minor
---

Add recurring blackout-rule support across the client, CLI, and MCP surfaces.

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
