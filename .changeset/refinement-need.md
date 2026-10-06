---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": minor
"@letpeoplework/lighthouse-mcp-core": minor
"@letpeoplework/lighthouse-mcp-stdio": patch
"@letpeoplework/lighthouse-mcp-http": patch
---

Ask how much to refine from the terminal and from an assistant

"How many Work Items should we refine before the next Refinement?" was answered only on a Team's
Refinement tab in the browser. Now `lh` and the MCP tools answer it too, in exactly the words the
web page uses and in the instance's own terminology, so a renamed "Story" or "Grooming" reads the
same everywhere. A term left blank, or terminology that cannot be read, reads as the default word, and a Team
read without a name is called by the instance's word for a Team and its id ("Squad 3").
Needs a Lighthouse newer than v26.10.3.6; an older server is told to upgrade and is never asked.

- `lh refinement get --team-id <id>` states the next Refinement, how many Work Items are ready
  against the range the Team is likely to pull, and how many more to refine. It then lists the
  Work Items in refinement with the needed ones numbered and the "enough for the next Refinement"
  line where the web draws it. Without a number it says why: no Refinement cadence, not enough data
  yet, or no refinement states. Like the web page, it states a verdict only with every fact it is
  said with — the next Refinement, the cycle and its likelihoods — and otherwise gives no number,
  no numbered Work Items and no line. With nothing in refinement it says only "No Work Items in
  Refinement states right now", as the web page does. `--json` and `--toon` return the facts unchanged.
- The MCP tool `lighthouse_team_refinement_get` (input `{ id }`) returns the same facts plus a
  `summary` holding the sentence the web page states. Its description explains the verdict, the
  range and the cycle it covers, whether today is a Refinement day, how many days remain until the
  next one, and whether the ready count comes from votes or from stages.
- The client gains `getTeamRefinement(teamId)`, `getTerminology()` and the shared wording both
  surfaces use: `readRefinementWording` reads the Team's name and the instance's terms, and
  `describeRefinementSummary` and friends state the need in them.

This release also carries the runtime dependency updates held back since the last one:
`@modelcontextprotocol/sdk` 1.31.0, `undici` 8.11.2, `zod` 4 and `@toon-format/toon` 4. The TOON
update changes what `--toon` and the MCP tool results look like in two places, while decoding to the
same data: a list of records whose nested objects hold only plain values is now one table row per
record (for example `split{yes,yesBut,no}` in the header), and an empty list prints as `[]`. A
parser built on TOON 2 cannot read those tables; one built on TOON 4 reads them back exactly.
