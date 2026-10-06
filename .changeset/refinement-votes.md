---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": minor
"@letpeoplework/lighthouse-mcp-core": minor
"@letpeoplework/lighthouse-mcp-stdio": patch
"@letpeoplework/lighthouse-mcp-http": patch
---

Cast, comment on and take back refinement votes through the client

- `getTeamRefinement(teamId, { voterKey })` sends the client's voter key, so the caller's own vote is marked.
- `castRefinementVote`, `addRefinementComment` and `takeBackRefinementVote` record a vote, a comment or a
  take-back, naming the channel it came from. They need a Lighthouse newer than v26.10.3.6.
- A refusal now carries the `problemCode` and `problemTitle` Lighthouse sent, so a surface can word it.
- `mintVoterKey()` makes a fresh random voter key, and `createFileVoterKeyStore` keeps one per Lighthouse;
  `describeVotes`, `describeReadiness`, `describeWarnings`, the outcome sentences and `describeVoteRefusal`
  state votes and refusals in the web's words.
- `lh refinement get` lists Votes, Readiness and Warnings for every Work Item.
- `lh refinement vote`, `comment` and `take-back` cast a vote, add a comment and take a vote back.
- `lh config voter set --name <name>` stores the name votes carry without sign-in; `lh config voter` shows it.
- MCP tools `lighthouse_team_refinement_vote`, `_comment` and `_voteTakeBack`, registered as writes.
- mcp-stdio keeps its voter key beside lh's; mcp-http refuses votes on a Lighthouse without sign-in.
