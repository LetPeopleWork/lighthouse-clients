---
name: lighthouse-refinement
description: >
  Lighthouse Refinement by LetPeopleWork: whether a Team tracked in Lighthouse is ready for its next
  Refinement, how many more Work Items to refine or whether to stop, and which Work Items are worth the
  session's time; and, for a developer, which Work Items wait for their view and their own vote on each,
  cast only once they confirm it. Use when a Product Owner or anyone preparing a Refinement asks "Are we
  ready for Wednesday's Refinement?", "Do we need to refine more?" or "What should we talk about in
  Refinement?", or when a developer asks "Do I need to prep for refinement?", wants to vote or comment on
  a Work Item in refinement, or take a vote back.
  Not for: forecasts (when Work Items or a Feature will be done, how many by a date), flow metrics, or
  connecting to Lighthouse (the general lighthouse skill, this skill's companion); running the daily or
  deciding what to do today (the Lighthouse Daily Flow Review skill).
---

# Lighthouse Refinement

This skill answers two questions before a Team's next Refinement. For a Product Owner: refine more, or stop, and which Work Items deserve the session's time. For a developer: which Work Items wait for their view, and what is their own answer on each. Lighthouse answers both on the Team's Refinement tab; you read the same answer and say it plainly.

Its companion is the general `lighthouse` skill. If no Lighthouse MCP tools are connected and `lh` is not set up, use that skill to connect. For anything that is not Refinement prep (a forecast, a flow metric, a chart), that skill answers, not this one.

## Read it

1. Find the Team's id silently: `lighthouse_team_list` (or `lh team list --json`), matched by name. Never ask the user for an id.
2. Read the Refinement: `lighthouse_team_refinement_get` with `{id: <team_id>}`, or `lh refinement get --team-id <id> --json`.
3. Answer from that one read. Quote its `summary`: it is the sentence the Team sees on its Refinement tab, in the instance's words. Use the words the `summary` uses for Work Items, Teams and Refinement.

Every number in the answer comes from the read. Never work one out yourself, never recompute "Refine X to Y more", and never estimate a number from Throughput.

## The answer to give

Give it in this shape, with the Team's own numbers and words:

```text
Team Gravity — next Refinement Wednesday 15 Oct (in 2 days)
4 Work Items ready by Votes; Gravity is likely to pull 6 to 9 before the one after. Below range.
Refine 2 to 5 more before Wednesday.
Worth the session's time:
  GR-051 Export Fleet Report to PDF — 1 Yes, 2 No            <link>
  GR-057 Sonar alert routing — open question, 1 Yes, if…     <link>
Everything else in refinement has enough Yes votes or is waiting for voters.
```

1. **When.** The next Refinement from `nextRefinementDate` and how many days away it is from `daysUntilNextRefinement`. When `isRefinementDay` is true, say "Today is Refinement day": the cycle starts today, and the range runs until the next Refinement.
2. **Ready count, range and verdict.** `readyCount`, the range `need.low` to `need.high`, and `need.verdict` worded as Below range, In range or Above range.
   - `readySource` `Votes`: say "ready by Votes".
   - `readySource` `Stages`: say "ready by stage", because the Team's stage rule decides readiness. Never say "ready by Votes" then.
3. **What to do.**
   - **Below**: quote the `summary`'s own "Refine X to Y more", as written.
   - **In**: that is enough; nothing more needs refining by then.
   - **Above**: suggest stopping refinement for now. Say it with the Team's numbers, for example "11 are ready and Gravity is likely to pull 6 to 9 before the one after, so the extra ready Work Items will just wait." Above range is not a success and not being ahead: say "stop" as plainly as "refine more".
4. **Worth the session's time.** List each Work Item whose `readiness` is `NeedsDiscussion`, whose `split` has any No, or whose `hasOpenQuestion` is true, in the order `workItems` lists them. Give its `referenceId`, its name, its votes as counts ("1 Yes, 2 No", "open question, 1 Yes, if…") and its `url`.
5. **Everything else** in one line: "Everything else in refinement has enough Yes votes or is waiting for voters." Do not count how many are still waiting for votes, and do not list them.

When nothing is in refinement, quote the `summary` and stop.

## No number, no guess

Never state a ready count, a range or how many to refine without a verdict. When `need.unavailableReason` is set, or `refinementConfigured` is false, there is no verdict: quote the `summary`, say Lighthouse cannot tell yet, and name each fix that applies:

- `refinementConfigured` false, or `NoRefinementStates`: "A Team admin needs to choose refinement states first", in the Team's settings under Refinement.
- `NoCadence`: "A Team admin can set a Refinement cadence to see how many Work Items are needed", in the Team's settings.
- `InsufficientData`: Lighthouse needs at least 5 days with completed Work Items before it can forecast the range.

## A developer's prep

When a developer asks whether they need to prep for Refinement, or what waits for their view, make the same read and answer from it.

1. **What waits for their view**: every row whose `myVote` is null, in the order `workItems` lists them. Never reorder them. Give each its `referenceId`, its name and its `url`.
2. **The question for each** is the Team's yardstick, answered Yes, Yes, if… or No:
   - `yardstick.source` `Sle`: "Can you do it in 7 days or less?" with `yardstick.days`, and say it is the Team's SLE at `yardstick.probability`%.
   - `CycleTimeFallback`: the same question with `yardstick.days`, and say the Team has no SLE, so the days are its Cycle Time at `yardstick.probability`%.
   - `Unavailable`: say Lighthouse has no yardstick for this Team yet, and ask whether each one is small enough to be pulled.

   ```text
   3 Gravity Work Items wait for your view. Your SLE is 7 days (85%).
   For each: can you do it in 7 days or less? Yes, Yes, if… or No.
     GR-051 Export Fleet Report to PDF      <link>
     GR-055 Hull telemetry dashboard        <link>
     GR-057 Sonar alert routing             <link>
   ```

3. **Nothing waiting**: say "Nothing waits for your view" and name the next Refinement from `nextRefinementDate`.
4. **When Lighthouse cannot tell which votes are theirs**: without sign-in (`voterIdentity` `SelfDeclared`), Lighthouse knows only the votes cast from this same assistant as theirs; votes cast on the web page or from another machine show as not theirs. When no row has a `myVote` at all, say Lighthouse cannot tell which votes are theirs, and list every Work Item still needing votes (`missingVotes` above 0) instead.
5. **A Work Item is a link.** To decide, the person opens its `url`. Never fetch or summarise its content.

Whenever the person gives an answer on a Work Item, asks you to vote, comment or take a vote back, or asks you to vote for them, **read `references/voting.md` first** and follow it. It says how their words map onto Yes, Yes, if… and No, how a vote is confirmed before anything is sent, which name it carries, and where a vote can be cast when this server refuses it.

## Guardrails

- **Humans decide.** A vote, a comment or a take-back is the person's own and is sent only after they confirmed that Work Item, that answer and that comment, one Work Item at a time, as `references/voting.md` says. Never vote on anyone's behalf and never in bulk. A Product Owner asking whether the Team is ready gets no write at all. Never decide that a Work Item is ready and never reorder the backlog. Asked to "mark GR-051 as ready", change nothing: say readiness comes from the Team's votes (or its stage rule), and give the Work Item's `url` so the Team can vote on it.
- **Names are the person's own.** The name a vote carries is the one the person gives when asked; never take it from the system, an account or earlier messages.
- **Work Items, never people.** Votes are counts; only the person's own vote is theirs to see. Never say who voted what, who has not voted, who works on a Work Item, or who should chase a question.
- **A Work Item is a link.** Give its `url`; do not fetch or summarise its content.
- **Usage data is the person's choice.** Never run `lh config usage-data on` or `lh config usage-data off` unless the user asked for exactly that, and never answer Lighthouse's usage-data question for them.
- **Quote the tool's `summary`** as written; never round or restate its numbers.
