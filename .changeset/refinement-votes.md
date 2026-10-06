---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": minor
"@letpeoplework/lighthouse-mcp-core": minor
"@letpeoplework/lighthouse-mcp-stdio": patch
"@letpeoplework/lighthouse-mcp-http": patch
---

See how the refinement votes stand, and vote, from the terminal and from an assistant

Saying whether a Work Item is ready, and seeing whether the Team agrees, happened only on a Team's
Refinement tab in the browser. Now `lh` and the MCP tools show how the votes stand on every Work Item in
refinement, and let a person cast a vote, add a comment and take their vote back, under the same identity
rules as the web page and in its words. Needs a Lighthouse newer than v26.10.3.6; an older server is told to
upgrade and is never asked.

- `lh refinement get` lists three more columns: **Votes** (the split, such as `1 Yes · 1 Yes, if…`, with a
  `*` where you have voted, or `No votes`), **Readiness** (`Ready`, `2 more Yes needed`, `Needs discussion`,
  as the web says it) and **Warnings** (`open question`, `stage disagrees`).
- `lh refinement vote --team-id <id> --work-item <ref> --answer yes|yes-but|no [--comment <text>] [--as <name>]`,
  `lh refinement comment … --text <text>` and `lh refinement take-back …` answer in one line, such as
  `Recorded: Ana Lima — Yes on GR-073. That made GR-073 Ready.` A "Yes, if…" needs its condition. Lighthouse's
  refusals come back in plain words. `--json` and `--toon` return the Work Item as the vote left it.
- With sign-in, a vote is the signed-in account's; `lh` goes by what Lighthouse says, not by what was answered
  when the connection was saved. Without it, a vote carries the name given with `--as` or
  stored once with `lh config voter set --name <name>` (`lh config voter` shows it); `lh` never guesses a name.
  The first vote mints a random voter key for that Lighthouse and keeps it in `voter-keys.json` beside the CLI
  config, so the vote can be taken back from that machine. The file is its owner's alone (on Linux and
  macOS); `lh` and a local MCP server saving at the same moment both keep their keys, and a file that cannot
  be read is refused with a message naming it, never written over.
- The MCP tools `lighthouse_team_refinement_vote` (`{ id, workItem, answer, comment?, voterName? }`, answer
  `Yes`, `YesBut` or `No`), `lighthouse_team_refinement_comment` and `lighthouse_team_refinement_voteTakeBack`
  are registered as writes. Their descriptions tell the assistant to confirm with the user first and to ask
  for the user's name rather than infer it. Each result carries a `summary` in the same words as `lh`.
  `lighthouse_team_refinement_get` marks the user's own vote. Like `lh`, the tools go by what Lighthouse says
  about sign-in: with it they send no name and keep no key, and a signed-in vote can be taken back; without
  it a vote or comment without `voterName` is refused before anything is sent or kept.
- mcp-stdio keeps its voter key in the same file as `lh`, so a person is one voter whichever they use, and
  however each was given the URL (`HTTPS://Lighthouse.example:443/` and `https://lighthouse.example/api` are
  one Lighthouse).
  mcp-http, shared by many people, refuses votes on a Lighthouse without sign-in and points to the web page,
  `lh` or a local MCP server.
- The client gains `castRefinementVote`, `addRefinementComment`, `takeBackRefinementVote`, a `voterKey` option
  on `getTeamRefinement`, `mintVoterKey`, `createFileVoterKeyStore` and the shared vote wording. A refusal's
  `LighthouseApiError` now also carries the `problemCode` and `problemTitle` Lighthouse sent.
