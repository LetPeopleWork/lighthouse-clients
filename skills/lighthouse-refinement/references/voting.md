# Voting in Refinement

Read this before any vote, comment or take-back: whenever a person gives their view on a Work Item, asks you to vote or comment for them, or asks to take a vote back. The vote is the person's own judgement. You draft it; they decide it.

## The question and its three answers

The question is always the Team's yardstick, with the days from the Refinement read: "Can we do this in 7 days or less?" when `yardstick.days` is 7. Never ask for hours, story points or any other estimate. Map what the person says onto the three answers:

- **It fits**: Yes.
- **It fits once something is true**: "Yes, if…". The condition always goes in the comment. Never send "Yes, if…" without it.
- **Too big** ("way more than a week", "that's huge"): No, with a comment proposing how to split it. Draft the split from what the person told you, as a proposal for them to edit or confirm. Never draft it from the Work Item's content.
- **Can't size it yet** ("depends on the routing API", "no idea yet"): offer either "Yes, if…" with the missing thing as the condition ("Yes, if the routing API exists"), or No with the open question as the comment. Let the person pick. Then ask "Who will chase this?" Never name anyone and never suggest a person.

A No is a useful answer, not a failure: it tells the Team the Work Item needs splitting or an answer first.

## Confirm first, one Work Item at a time

Never call `lighthouse_team_refinement_vote`, `lighthouse_team_refinement_comment` or `lighthouse_team_refinement_voteTakeBack`, and never run `lh refinement vote`, `lh refinement comment` or `lh refinement take-back`, until the person has confirmed that Work Item, that answer and that comment.

1. Show the draft: the Work Item's `referenceId`, name and `url`, the answer, and the exact comment.

   ```text
   GR-051 Export Fleet Report to PDF   https://northwind.atlassian.net/browse/GR-051
   Answer:  Yes, if…
   Comment: the PDF export moves to its own Work Item
   Shall I send this vote? Which name should I record it under?
   ```

   Ask for the name in the same message when Lighthouse runs without sign-in (see below).

2. Wait for an explicit yes to that draft ("Yes, send that"). The person stating their view is not that yes. If they change the answer or the comment, show the new draft and ask again.
3. One draft, one confirmation, one Work Item. "Vote yes on everything" or "do them all" confirms nothing: list the Work Items waiting for their view and ask about each one in turn.
4. Never pick an answer for the person, and never vote, comment or take back on anyone else's behalf.

## The name the vote carries

Read the Refinement first if you have not yet: `voterIdentity` says how Lighthouse knows the voter.

- `Account`: Lighthouse knows the person from their sign-in. Send no name.
- `SelfDeclared`: the vote is recorded under a name the person gives. Ask "Which name should I record your vote under?" and use only the answer to that question. Never take a name from the system, an account, an email address or earlier messages, even when the person introduced themselves before.

## Sending it

- MCP: `lighthouse_team_refinement_vote` with `{id: <team_id>, workItem: "<referenceId>", answer: "Yes" | "YesBut" | "No", comment: "<comment>", voterName: "<name>"}`. `YesBut` is "Yes, if…".
- `lh`: `lh refinement vote --team-id <id> --work-item <ref> --answer yes|yes-but|no --comment "<comment>" --as "<name>"`.
- A comment or question without a vote, confirmed the same way: `lighthouse_team_refinement_comment`, or `lh refinement comment --team-id <id> --work-item <ref> --text "<comment>" --as "<name>"`.
- Take a vote back only when the person asks, after confirming which Work Item: `lighthouse_team_refinement_voteTakeBack`, or `lh refinement take-back --team-id <id> --work-item <ref>`.

Voting again replaces the person's earlier vote. Quote the `summary` Lighthouse returns as its confirmation; never restate it.

## When a vote cannot be cast

- **A shared MCP server on a Lighthouse without sign-in** refuses votes, because it cannot tell one voter from another. Quote its message and say where the vote can be cast instead: the Team's Refinement tab in Lighthouse, `lh refinement vote` on the person's own machine, or a Lighthouse MCP server on their own machine. Keep the confirmed draft in the answer so they can cast it there.
- **Any other refusal**: quote it. Never retry under another name and never send an answer the person did not confirm.

## Never

- Never fetch or summarise a Work Item's content to size it, draft a split or explain it. Give its `url`; the person opens it.
- Never say who voted what or who has not voted, and never name who should chase a question.
