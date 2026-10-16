---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": minor
"@letpeoplework/lighthouse-mcp-core": minor
"@letpeoplework/lighthouse-mcp-stdio": minor
"@letpeoplework/lighthouse-mcp-http": minor
---

The clients pass on which Work Items Lighthouse marks stale, and why, now that Lighthouse decides staleness itself
(the release after v26.10.16.6). The clients never work staleness out themselves.

- Each Work Item in progress carries `isStale` and `staleReasons` unchanged: how many days it has sat in a state,
  been Blocked, or sat in a state while Blocked, with the state's name where there is one. A reason of a kind the
  client does not know yet is left out; the Work Item is still read.
- `lighthouse_team_metrics_wip`'s summary counts them under the Blocked count ("Stale Work Items: 2"), and its
  description names the two fields. `lh metrics team` and `lh metrics portfolio` show a "Stale Work Items" line
  under the Blocked line; `--json` carries the fields unchanged.
- Against an older Lighthouse, which does not say, `lh metrics team --metrics wip` and the tool's summary say
  "Lighthouse does not say which Work Items are Stale." and show no count.
- The Daily Flow Review skill names stale Work Items not already listed as Blocked, quoting Lighthouse's reason,
  and a calm day now also requires nothing to be stale.
- `FEATURE_REQUIRES_SERVER_NEWER_THAN.staleness` names v26.10.16.6. No read is refused on it.
