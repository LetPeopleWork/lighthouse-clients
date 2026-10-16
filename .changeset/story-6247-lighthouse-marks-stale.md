---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": minor
"@letpeoplework/lighthouse-mcp-core": minor
"@letpeoplework/lighthouse-mcp-stdio": minor
"@letpeoplework/lighthouse-mcp-http": minor
---

`lh` and the MCP server pass on which Work Items Lighthouse marks stale, and why, the way Lighthouse answers its
WIP read once it decides staleness itself (the release after v26.10.16.6). Each Work Item in progress carries
`isStale` and `staleReasons`: how many days it has sat in a state, been Blocked, or sat in a state while Blocked.
The clients pass them on unchanged and never work staleness out themselves.

`lh metrics team` and `lh metrics portfolio` show a Stale line under the Blocked line, and
`lighthouse_team_metrics_wip`'s summary counts the stale Work Items. Against an older Lighthouse, which does not
say, both say so: "Lighthouse does not say which Work Items are Stale."
