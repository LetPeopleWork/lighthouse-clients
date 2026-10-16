---
"@letpeoplework/lighthouse-cli": minor
---

`lh metrics team` and `lh metrics portfolio` show how many Work Items (or Features) Lighthouse marks stale, on a
"Stale Work Items" line under the Blocked line, as the dashboard does. `--json` carries each Work Item's
`isStale` and `staleReasons` unchanged. Against an older Lighthouse, which does not say, there is no Stale line.
