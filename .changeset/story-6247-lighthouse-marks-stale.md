---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-mcp-core": minor
"@letpeoplework/lighthouse-mcp-stdio": minor
"@letpeoplework/lighthouse-mcp-http": minor
---

`lighthouse_team_metrics_wip` passes on which Work Items Lighthouse marks stale, the way Lighthouse answers its
WIP read once it decides staleness itself (the release after v26.10.16.6): each Work Item in progress carries
`isStale`, unchanged, and the summary counts them under the Blocked count ("Stale Work Items: 2"). The clients
never work staleness out themselves.
