---
"@letpeoplework/lighthouse-mcp-http": minor
---

The shared MCP server's operator decides whether it sends usage data, and it is off unless they say on

`LIGHTHOUSE_USAGE_DATA=on` (any case) switches usage data on for everyone the server serves; nobody is
asked. Unset, empty or `off` keeps it off. Any other value keeps it off too, and the server still starts
with one warning naming `on` and `off` as the values it takes. At start-up the server says which it is:
`Usage data: on (LIGHTHOUSE_USAGE_DATA)` or `Usage data: off`.

Switched on, the server reports what its callers do, as the web counts it: refreshing a Team, refreshing a
Portfolio and running a manual forecast, each labelled as coming from MCP. Nobody is asked, and no
caller waits for it or gets a different answer for it. The server requests one grant for the whole
process, on the first thing worth counting, and keeps it in memory only, never on disk: a restart
requests a fresh one. `DO_NOT_TRACK` overrides `on`: the server says `Usage data: off` and sends
nothing.
