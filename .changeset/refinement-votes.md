---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": minor
---

Cast, comment on and take back refinement votes through the client

- `getTeamRefinement(teamId, { voterKey })` sends the client's voter key, so the caller's own vote is marked.
- `castRefinementVote`, `addRefinementComment` and `takeBackRefinementVote` record a vote, a comment or a
  take-back, naming the channel it came from. They need a Lighthouse newer than v26.10.3.6.
- A refusal now carries the `problemCode` and `problemTitle` Lighthouse sent, so a surface can word it.
- `mintVoterKey()` makes a fresh random voter key, and `createFileVoterKeyStore` keeps one per Lighthouse;
  `describeVotes`, `describeReadiness` and `describeWarnings` state a row's votes in the web's words.
- `lh refinement get` lists Votes, Readiness and Warnings for every Work Item.
- `lh config voter set --name <name>` stores the name votes carry without sign-in; `lh config voter` shows it.
