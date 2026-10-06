---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": minor
"@letpeoplework/lighthouse-mcp-core": minor
---

Read a Team's refinement with `getTeamRefinement(teamId)` and the instance's terminology with `getTerminology()`. The refinement read needs a Lighthouse newer than v26.10.3.6; an older server is told to upgrade and is never asked for it.

`lh refinement get --team-id <id>` states how many Work Items a Team needs ready for its next Refinement in the words of Lighthouse's Refinement tab and the instance's own terminology, then lists the Work Items in refinement with the needed ones numbered and the "enough for the next Refinement" line placed as on the web. `--json` and `--toon` hand over the facts unchanged.

The MCP tool `lighthouse_team_refinement_get` (input `{ id }`) hands an assistant the same facts plus a `summary` holding the sentence the web page states; its description explains the verdict, the range and the cycle.
