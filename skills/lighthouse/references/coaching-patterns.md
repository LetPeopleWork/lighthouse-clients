# Coaching Patterns Reference

Common patterns in Lighthouse data, what they mean, and how to advise. The stance on the general skill's page
still applies: answer first, two likelihoods for a forecast, nothing to explain inside the limits, Work Items
never people.

## Table of Contents
1. [Throughput Patterns](#throughput-patterns)
2. [Cycle Time Patterns](#cycle-time-patterns)
3. [WIP Patterns](#wip-patterns)
4. [Aging Patterns](#aging-patterns)
5. [Forecast Interpretation](#forecast-interpretation)
6. [CFD Patterns](#cfd-patterns)
7. [Common Questions and How to Answer Them](#common-questions)
8. [Ideas from the LetPeopleWork Blog](#ideas-from-the-letpeoplework-blog)
9. [Further Reading](#further-reading)

---

## Throughput Patterns

### Stable throughput (good)
**What it looks like:** A fairly even number of Work Items finished each day or week, inside the process limits.
**What it means:** The system is predictable, so forecasts are worth trusting.
**Advice:** Keep doing what works and look for small improvements.

### Highly variable throughput
**What it looks like:** Wide swings: some days 5 Work Items, some days 0, now and then 10 or more.
**What it means:** Something makes finishing uneven: Work Items released in batches, outside dependencies, WIP that is not managed, or Work Items of very different sizes.
**Advice:** Look at the peaks. Are Work Items held and released together, for example at the end of a sprint? Do sizes vary a lot? Would less WIP even out the flow?

### Throughput dropping
**What it looks like:** A lower week or month.
**What it means:** Inside the process limits, nothing; that is ordinary variation and needs no explanation. Only a signal on the Process Behaviour Chart says something moved, and even then it says *that* it moved, not *what* moved it.
**Advice:** Inside the limits, say so and stop. With a signal, say since when and ask what changed around then. Checking WIP is a good first question; do not offer a cause yourself.

### Throughput rising
**What it looks like:** More Work Items finished than before, for example 40% more this month.
**What it means:** Possibly more delivered, possibly the same work cut into smaller Work Items. Splitting raises Throughput without delivering more.
**Advice:** Before celebrating, check whether the Work Items got smaller (Feature size, Cycle Time). If they did not, and it is a signal, ask what changed.

### Throughput clusters with gaps
**What it looks like:** Groups of days with Work Items finished, separated by days with none.
**What it means:** Work finishes in batches rather than continuously: releases at sprint boundaries, or large Work Items that take several days.
**Advice:** Can Work Items be released one at a time? Are they too large?

---

## Cycle Time Patterns

### Tight percentile spread (good)
**What it looks like:** The 50th and 85th percentiles are close together, for example 3 and 6 days.
**What it means:** Work Items flow consistently. An SLE drawn from this data will hold.
**Advice:** Set the SLE from the data, as it is, and use it every day.

### Wide percentile spread
**What it looks like:** A big gap between the 50th and the 85th, for example 3 and 21 days.
**What it means:** Some Work Items flow, others get stuck: mixed sizes, Blocked time, interruptions, unclear requirements, or Work Items waiting in review.
**Advice:** Look at the outliers on the scatterplot. What do they share: a type, a state they waited in? Use the Work Item Aging Chart to catch the next ones earlier.

### Cycle time outliers (long tail)
**What it looks like:** Most Work Items finish in 3–7 days, a few take 30 or more.
**What it means:** These widen every forecast. Keep them in the data: they are the process pain the forecast should show.
**Advice:** Prevent the next ones rather than speeding up the usual ones. Once a Work Item is past the 50th percentile, talk about it; at SLE Risk 70% or more (or past the 70th percentile where SLE Risk cannot be read), act on it: swarm, split, unblock, or finish and accept the miss.

### Cycle time trending upward
**What it looks like:** Scatterplot dots drifting higher; the Process Behaviour Chart may show a signal.
**What it means:** Work Items take longer than they used to.
**Advice:** With a signal, ask what changed around then. WIP, new dependencies and bigger Work Items are good first questions.

---

## WIP Patterns

### WIP steadily increasing
**What it looks like:** WIP Over Time trending upward.
**What it means:** More Work Items start than finish; work piles up in progress.
**Advice:** Check Started vs. Closed to confirm it. Stop starting, start finishing.

### WIP sawtooth pattern
**What it looks like:** Regular spikes and drops.
**What it means:** Usually sprint boundaries: many Work Items pulled in at the start, closed at the end.
**Advice:** Pull Work Items as capacity frees up instead of a batch at the start.

### WIP above the System WIP Limit most days
**What it looks like:** WIP Over Time mostly above the System WIP Limit line.
**What it means:** The limit is not used to decide what to start, or it does not fit how the Team works.
**Advice:** Ask which it is. Either use the limit when deciding what to start next, or set one the Team will use and lower it step by step. A WIP rule of thumb tied to Team size is a heuristic for one context, never a rule.

---

## Aging Patterns

### Work Items aging in one state
**What it looks like:** On the Aging Chart, old Work Items cluster in one state, such as "In Review".
**What it means:** Work flows into that state faster than out of it.
**Advice:** What would help Work Items leave it: pairing on review, automated tests, starting less that needs it?

### Several Work Items past the SLE
**What it looks like:** Several dots above the SLE line on the Aging Chart.
**What it means:** It is not one stuck Work Item; the system produces late ones regularly.
**Advice:** Look at what they share. Finish the oldest Work Item before starting a new one, and reduce WIP.

### Old Work Items left in progress
**What it looks like:** Very old Work Items (30 days or more) still in progress that nobody works on.
**What it means:** They were deprioritised but never moved back or cancelled. They inflate WIP and age.
**Advice:** Finish them, move them back, or cancel them.

---

## Forecast Interpretation

### When someone says "just give me the date"
**How to respond:** Give two likelihoods, each "on or before" a date, and let them choose: "There is an 85% chance we are done on or before 20 June, and a 50% chance on or before 6 June. Which one do you want to plan against?" Planning on the higher one costs time; planning on the lower one means being late more often. What being late costs them decides which fits. Then forecast again as Work Items finish.

### When the forecast range is very wide
**What it looks like:** 50% on or before 1 March, 95% on or before 15 May.
**What it means:** Throughput varies too much for a narrow forecast.
**Advice:** Do not try to fix the forecast; fix the flow. Steadier WIP, more even Work Item sizes and fewer Blocked days narrow it on their own.

### When someone asks about story points or velocity
**How to respond:** Answer with Throughput for a stated period, for example "You finished 41 Work Items in the last 30 days." Add at most one sentence on what points would lose, for example that they add an estimate on top of a count that already forecasts as well. Do not argue the point further.

### When the forecast seems "too pessimistic"
**How to respond:** Look at the Throughput driving it. If it includes known non-working days such as holidays, set them as Blackout Periods, and the forecast skips them. Be careful about excluding Work Items from Throughput: it can hide the process pain the forecast should show. If the data is right, the forecast is the honest answer; a hoped-for date is not more likely because it is wanted.

### When the backlog keeps growing
**How to respond:** If Work Items arrive faster than they finish, the backlog grows without end. That is a scope question, not a delivery question: someone has to choose what not to do. Arrivals against Throughput shows it.

---

## CFD Patterns

### Parallel bands (good)
**What it looks like:** "Doing" and "Done" grow at about the same rate.
**What it means:** WIP is stable and Work Items flow through at a steady rate.

### Diverging bands
**What it looks like:** The gap between "Doing" and "Done" keeps growing.
**What it means:** WIP is rising: more starts than finishes.
**Advice:** Stop starting, start finishing.

### Flat "Done" line
**What it looks like:** "Doing" grows, "Done" stays flat.
**What it means:** Nothing is finishing.
**Advice:** Look for what everything waits on: review, deployment, one shared dependency.

### Staircase in "Done"
**What it looks like:** "Done" rises in steps.
**What it means:** Work Items are released in batches.
**Advice:** Release them one at a time where possible.

---

## Common Questions

### "How do I improve our Predictability Score?"
Closer to 100% is more predictable; Lighthouse sets no good or bad bands. What tends to help:
1. Reduce WIP
2. Cut Work Items into smaller, more even sizes
3. Act on aging Work Items sooner, using the Aging Chart daily
4. Start no faster than you finish (Started vs. Closed)
5. Reduce outside dependencies and Blocked time

### "Which metric should we focus on first?"
WIP: it is the one you control directly, and it moves the others. Then use Work Item Age every day. Throughput and Cycle Time follow.

### "How long should our history window be?"
30–90 days for most Teams. Shorter reacts faster and is noisier; longer is smoother and may hold old patterns. After a real change in how the Team works, start the window from that change.

### "Our forecast says X but stakeholders want Y"
That is a scope conversation, not a forecasting problem. Show the options: less scope, a later date, or more people, who slow things down at first while they learn. The forecast shows what the past suggests; the decision is theirs.

### "Should we count bugs separately?"
If bugs flow very differently from other Work Items, yes. Lighthouse can filter by Work Item type.

### "We just had a major Team change; is the forecast still valid?"
Not for the first weeks. Once there are a couple of weeks of new data, start the history window there, and give the forecast with that caveat until then.

### "Should we compare our Teams?"
Lighthouse's published position is yes, to learn from each other: compare trends, never rank. Work Item size differs between Teams, so Throughput does not compare directly. Compare each Team with its own history first. A measure that becomes a target stops measuring.

### "Should we have an expedite lane?"
Prefer not to. If the Team wants one anyway: every expedited Work Item makes the others wait and age. Offer to show by how much with Work Item Age against the SLE.

---

## Ideas from the LetPeopleWork Blog

Point people to these when the topic comes up. Restate the idea; quote at most two sentences, with the link.

- **Low WIP gives freedom.** The Lighthouse team keeps Features small (half have 5 Work Items or fewer) and WIP low enough that it is often zero at the end of the day. [Low WIP, Small Features, High Freedom](https://blog.letpeople.work/p/low-wip-small-features-high-freedom)
- **WIP and Total Work Item Age as pull signals**, instead of a fixed WIP limit: check both against their Process Behaviour Chart baselines when a Work Item starts or finishes. Total Work Item Age leads: if nothing finishes today, WIP stays flat but age still grows. The Lighthouse team cut its 85th percentile Cycle Time from 13 to 7 days this way. [Limit Work in Progress Without Work in Progress Limits](https://blog.letpeople.work/p/limit-work-in-progress-without-work-in-progress-limits-33ee889f661d)
- **A range instead of a date.** A single date usually comes from people guessing and anchoring, and reads as a promise. Give likelihoods, each "on or before" a date, and talk about how the likelihood changes. [Dear Stakeholder: Here's Why I'm Giving You a Range Instead of a Date](https://blog.letpeople.work/p/dear-stakeholder-heres-why-im-giving)
- **Noise beats bias.** Random inconsistency in estimates does more damage than optimism; a forecast from Throughput has neither. [The Hidden Cost of Noise in Your Delivery Predictions](https://blog.letpeople.work/p/the-hidden-cost-of-noise-in-your)
- **A wide forecast is a flow signal.** Unsteady Throughput from high WIP or long Cycle Times widens the gap between likelihoods. Closed dates from the Work Tracking System are all a Monte Carlo forecast needs. [An Introduction and Step-by-Step Guide to Monte Carlo Simulations](https://blog.letpeople.work/p/an-introduction-and-step-by-step-guide-to-monte-carlo-simulations)
- **Overcommitment is a system problem**: psychology, culture and incentives push the same way. Forecasts, Cycle Times and WIP make the limits visible without a negotiation. [Overcommitment as the Default](https://blog.letpeople.work/p/overcommitment-as-the-default)
- **A daily look at the data**, without a checklist: at Team level WIP, Cycle Time and Started vs. Closed; at the level of Features, their age and Throughput. The data starts conversations; the Team brings the context. [How Lighthouse Changed the Way I Work](https://blog.letpeople.work/p/how-lighthouse-changed-the-way-i)
- **Flow metrics in Scrum events**, without changing the events: Throughput percentiles to decide how much to pull into a sprint; Work Item Age in the Daily Scrum, where a Work Item past the 50th percentile of Cycle Time is worth a conversation and one at SLE Risk 70% or more needs action; Throughput, Cycle Time and forecasts in the Sprint Review; Cycle Time patterns in the Retrospective. [Using Flow Metrics in Your Scrum Events](https://blog.letpeople.work/p/using-flow-metrics-in-your-sprint-events-a19450c574d8)
- **Comparing Teams** helps them learn, as long as no comparison becomes a target or a ranking. Prefer measures from the data (Cycle Time, Throughput) over estimates. [Why You Should Compare Metrics of Different Teams with Each Other](https://blog.letpeople.work/p/why-you-should-compare-metrics-of-different-teams-with-each-other)
- **Fast enough, not fastest.** Decide what "fast enough" is for each kind of work and set SLEs around it. Separate lanes only when the business truly needs different service, and know that they age the rest. [What Breakfast at a Diner Taught Us About Flow, Kanban, and Service Level Expectations](https://blog.letpeople.work/p/what-breakfast-at-a-diner-taught)

---

## Further Reading

All posts are at [blog.letpeople.work](https://blog.letpeople.work).

**Forecasting and stakeholders**
- [An Introduction and Step-by-Step Guide to Monte Carlo Simulations](https://blog.letpeople.work/p/an-introduction-and-step-by-step-guide-to-monte-carlo-simulations): the primer on how a Monte Carlo forecast works and what it needs.
- [Dear Stakeholder: Here's Why I'm Giving You a Range Instead of a Date](https://blog.letpeople.work/p/dear-stakeholder-heres-why-im-giving): how to talk in likelihoods instead of one date.
- [The Hidden Cost of Noise in Your Delivery Predictions](https://blog.letpeople.work/p/the-hidden-cost-of-noise-in-your): why inconsistent estimates hurt forecasts.
- [How Lighthouse Forecasts](https://blog.letpeople.work/p/how-lighthouse-forecasts): the forecast model, its assumptions and inputs.
- [Overcommitment as the Default](https://blog.letpeople.work/p/overcommitment-as-the-default): why organisations overcommit and how flow data helps.
- [How to Build Realistic Roadmaps as a Product Owner](https://blog.letpeople.work/p/how-to-build-realistic-roadmaps-as): forecasts in roadmap planning.

**Flow and WIP**
- [Low WIP, Small Features, High Freedom](https://blog.letpeople.work/p/low-wip-small-features-high-freedom)
- [Limit Work in Progress Without Work in Progress Limits](https://blog.letpeople.work/p/limit-work-in-progress-without-work-in-progress-limits-33ee889f661d)
- [What Breakfast at a Diner Taught Us About Flow, Kanban, and Service Level Expectations](https://blog.letpeople.work/p/what-breakfast-at-a-diner-taught)
- [What Does a Fridge Have to Do with Flow?](https://blog.letpeople.work/p/what-does-a-fridge-have-to-do-with-flow-an-analogy-to-explain-flow-metrics): an analogy for the four flow metrics.
- [Using Flow Metrics in Your Scrum Events](https://blog.letpeople.work/p/using-flow-metrics-in-your-sprint-events-a19450c574d8)
- [Why You Should Compare Metrics of Different Teams with Each Other](https://blog.letpeople.work/p/why-you-should-compare-metrics-of-different-teams-with-each-other)

**Lighthouse in practice**
- [Lighthouse - Getting Started](https://blog.letpeople.work/p/lighthouse-getting-started)
- [How Lighthouse Changed the Way I Work](https://blog.letpeople.work/p/how-lighthouse-changed-the-way-i)
- [Working with Obeya — an experience report](https://blog.letpeople.work/p/working-with-obeya-an-experience-report)
- [Lighthouse - Advanced Features](https://blog.letpeople.work/p/lighthouse-advanced-features)

**How Lighthouse is built**
- [Using AI to Develop a Software Product](https://blog.letpeople.work/p/using-ai-to-develop-a-software-product)
- [Documentation as Code](https://blog.letpeople.work/p/documentation-as-code)
- [How Do We Test Lighthouse?](https://blog.letpeople.work/p/how-do-we-test-lighthouse)
