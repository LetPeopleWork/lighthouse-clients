# Lighthouse Mechanics Reference

How Lighthouse works under the hood — forecasting model, widget details, and system behavior.

## Table of Contents
1. [Monte Carlo Simulation Model](#monte-carlo-simulation-model)
2. [Teams, Features, and Portfolios](#teams-features-and-portfolios)
3. [Feature WIP and Backlog Order](#feature-wip-and-backlog-order)
4. [Multi-Team Features](#multi-team-features)
5. [Forecast Types](#forecast-types)
6. [Blackout Periods](#blackout-periods)
7. [Widget Reference](#widget-reference)
8. [Data Requirements and FAQ](#data-requirements)
9. [Refinement](#refinement): the need band, the verdict, why there is no number, the yardstick, readiness
10. [Delivery History](#delivery-history)
11. [Filling in Past Days (Preview)](#filling-in-past-days-preview)

---

## Monte Carlo Simulation Model

Lighthouse runs 10,000 simulations using historical throughput data. Each simulation randomly samples daily throughput from the historical record and simulates forward until work is complete.

**Core assumption:** Your future throughput will look like your past throughput. This means past sick days, holidays, interruptions, and team changes are already baked in — no need for separate "capacity planning."

**When this assumption breaks:**
- Major team composition changes (people leaving/joining)
- Significant process changes
- Seasonal patterns not captured in the history window
- Very short history (less than 2 weeks)

In these cases, the forecast will still work, but accuracy may be lower. After a few weeks of operating under the new conditions, the data will catch up.

**Percentile interpretation:**
- **95% (Very likely):** Only 5% of simulations took longer. Still not certain: only 100% is, and a 100% "how many" forecast says no more than "zero or more"
- **85% (Likely):** High confidence — a solid commitment level
- **70% (Moderate):** Reasonable expectation — some risk
- **50% (Risky):** Coin flip — half the simulations took longer

For stakeholder communication, give at least two likelihoods, each "on or before" a date or "or more" for a count, and ask which one to plan against. Recommend none as a default: what being late costs them decides it.

---

## Teams, Features, and Portfolios

```
Team → works on → Work Items → belong to → Features → are part of → Portfolios
```

**Critical detail:** Lighthouse only knows about work items if they are linked to a feature in a portfolio. If a team works on 5 features but only 3 are in Lighthouse portfolios, the other 2 are invisible — and the forecast assumes the team ONLY works on those 3.

**Implication:** For accurate forecasts, make sure ALL significant work a team does is represented in Lighthouse portfolios. Untracked work steals throughput from tracked work without showing up in the model.

---

## Feature WIP and Backlog Order

### Why Order Matters
Lighthouse forecasts the full feature backlog across ALL portfolios. It doesn't forecast one portfolio in isolation. Features higher in the order get worked on first (assuming Feature WIP = 1).

This means:
- When you forecast Portfolio B, the forecast accounts for Features in Portfolio A that are ordered higher
- Reordering features changes every forecast downstream
- The Feature View on the Team Details page shows ALL features in order

### Feature WIP
Feature WIP controls how many features a team works on simultaneously.

- **Feature WIP = 1 (default and recommended):** All throughput goes to the highest-priority feature until it's done. Then the next one. Maximum focus, fastest delivery of the most important thing.
- **Feature WIP = 2:** Throughput is randomly distributed between the top 2 features each simulated day. This means the most important feature takes longer, but you start on the second feature earlier.
- **Feature WIP = 3+:** Even more spread. Higher Feature WIP = later delivery of the most important thing.

**The coaching message:** Higher Feature WIP contradicts the goal of continuously delivering value in small batches. When everything is in progress, nothing is done. Recommend keeping Feature WIP as low as possible.

**Automatic Feature WIP:** Lighthouse can automatically adjust Feature WIP based on actual work in progress, matching the simulation to reality rather than an idealized WIP limit.

### How Throughput is Distributed (Feature WIP > 1)
When a simulated day produces throughput and Feature WIP > 1:
- Items are randomly assigned to eligible features
- No weighting is possible (you can't say "80% to Feature 1, 20% to Feature 2")
- If a feature has only 1 item left and throughput is 2+, all throughput still goes to that feature for that day (context switching cost)

---

## Multi-Team Features

When multiple teams contribute to the same feature:
- Lighthouse runs separate forecasts for each team
- The feature completion forecast uses the LATER of the two predictions
- The probability labels (95/85/70/50) apply to each individual forecast, but the combined probability is actually lower

**Example:** If Team A says 85% by March 15 and Team B says 85% by March 20:
- True combined 85% probability is actually 72% (0.85 × 0.85)
- With 3 teams at 85%, it drops to 61%

**Coaching point:** Dependencies between teams are predictability killers. The more teams involved in a feature, the less reliable the forecast. Try to reduce cross-team dependencies aggressively.

---

## Forecast Types

### When Forecast (Team Level)
"When will X items be done?"
- Input: Number of remaining items
- Output: Dates at 50/70/85/95% confidence
- Uses: Sprint planning, release planning, feature delivery estimation

### How Many Forecast (Team Level)
"How many items can we finish by date X?"
- Input: Target date
- Output: Item counts at 50/70/85/95% confidence
- Uses: Sprint capacity planning, scope negotiation

### Portfolio When Forecast
"When will this portfolio be done?"
- Takes into account ALL features across ALL portfolios
- Considers feature order and Feature WIP settings
- Accounts for multi-team features
- Result represents critical path through all dependencies

### Feature When Forecast
"When will this specific feature be done?"
- Considers the feature's position in the backlog
- Accounts for work ahead of it
- If multi-team, uses the later forecast

### New Work Item Predictions
"How many new items will enter our backlog?"
- Based on historical item creation rate
- Useful for anticipating bug arrivals, new request volume
- Helps answer: "How many bugs should we budget for next month?"

### Forecast Backtesting
"How accurate would our forecasts have been historically?"
- Runs a simulation as-of a past date using only data available at that time
- Compares forecast to actual outcome
- Builds trust in the forecasting approach

---

## Blackout Periods

Blackout Periods (holidays, company off-days) are excluded from simulations. Simulated days that land on a blackout date are skipped — the simulation advances to the next working day. This means forecasts automatically account for known non-working periods.

In charts, blackout periods appear as hatched overlays so you can distinguish expected zero-throughput days from unexpected ones.

Recurring blackout rules cover non-working days that repeat on a schedule rather than one-off dates. A rule picks one or more weekdays, an every-X-weeks interval, a start date, and an optional open end (no end date means it repeats indefinitely). Each occurrence the rule generates is treated exactly like a one-off blackout day downstream: simulated days that land on it are skipped and the forecast advances to the next working day. They are a Premium, system-admin feature, but once configured they require no per-forecast handling — forecasts skip them automatically just like manual blackout dates. Read the rules with `lh blackout list` or `lighthouse_blackout_list`.

---

## Widget Reference

Quick reference for each Lighthouse metric widget. To read one through the clients, see `tools-and-commands.md`; answer in the words its `summary` uses.

| Widget | Flow Metric(s) | Applies To | Key Question It Answers |
|--------|---------------|------------|------------------------|
| Work Items In Progress | WIP, Work Item Age | Teams, Portfolios | How much is in flight right now? |
| WIP Over Time | WIP | Teams, Portfolios | Is our WIP stable, growing, or shrinking? |
| Work Item Aging Chart | WIP, Work Item Age | Teams, Portfolios | Which items are at risk of being late? |
| Work Distribution | WIP, Cycle Time | Teams, Portfolios | Where is our effort concentrated? |
| Started vs. Closed | Throughput, WIP | Teams, Portfolios | Are we balancing input and output? |
| Throughput Run Chart | Throughput | Teams, Portfolios | How stable is our delivery rate? |
| Predictability Score | Throughput | Teams, Portfolios | How reliable are our forecasts? |
| Process Behaviour Charts | All four | Teams, Portfolios | Is this variation normal or a signal? |
| Cycle Time Percentiles | Cycle Time | Teams, Portfolios | How long do items typically take? |
| Cycle Time Scatterplot | Cycle Time | Teams, Portfolios | Are there patterns or outliers in completion? |
| Estimation vs. Cycle Time | Cycle Time | Teams, Portfolios | Do our estimates correlate with reality? |
| Simplified CFD | CT, WIP, Throughput | Teams, Portfolios | Is our flow balanced? |
| Total Work Item Age | Work Item Age, WIP | Teams, Portfolios | What's our total WIP burden? |
| Time in State | Cycle Time, Work Item Age | Teams, Portfolios | In which workflow state do Work Items spend their time? |
| SLE Risk | Work Item Age | Teams | Which Work Items in progress are likely to go past the SLE? |
| Stale Items | Work Item Age | Teams, Portfolios | Which Work Items sit still without anyone flagging them? |
| Flow Efficiency | Cycle Time, Work Item Age | Teams, Portfolios | How much of the time is waiting? |
| Features Worked On | WIP | Teams | How many Features have a Work Item in progress? |
| Load Balance Matrix | WIP, Total Work Item Age | Teams, Portfolios | Should we start more, or finish first? |
| Blocked Over Time | WIP | Teams, Portfolios | How many Work Items were Blocked, day by day? |
| Percentiles and Process Limits Over Time | Cycle Time, Work Item Age, Throughput, WIP | Teams, Portfolios | Has our Cycle Time or our process shifted, and when? |
| Feature Size | CT, Age, Throughput | Portfolios | How big are our features and how long do they take? |

---

## Data Requirements

**Minimum history:** ~2 weeks of throughput data for basic forecasts. 30-90 days recommended for reliable results.

**Recommended history window:** 30-90 days. Shorter captures recent changes but has less data. Longer provides more data but may include outdated patterns. For most teams, 30 days is a good starting point.

**Special events:** During periods like year-end holidays, extend the history window (e.g., 60-90 days) to soften the impact of extended zero-throughput periods.

**Story Points:** Not supported. By design. Throughput (count of items) with Monte Carlo produces more reliable forecasts than point-based estimation. The evidence for this is extensive — see Daniel Vacanti's work and the ProKanban.org resources.

**Feature-level forecasting:** Lighthouse measures throughput in days. Most teams don't close features every day, so feature-level throughput has too many zero days for reliable MCS. Always forecast at the work item level.

---

## Refinement

The Refinement tab lists the Work Items in the Team's refinement states and answers one question before the next Refinement: are enough of them ready? Read it with `lighthouse_team_refinement_get` (or `lh refinement get --team-id <id> --json`), quote its `summary`, and explain it from the fields below. Never work a number out yourself.

**The need band.** `need.low` to `need.high` is the range of Work Items the Team is likely to pull until the Refinement after the next one (on a Refinement day, until the next one). It is the manual How Many forecast over the Team's Throughput, read at `need.lowPercentile` (50% unless a Team admin changed it) and `need.highPercentile` (85% unless changed): above the high end there is only a 15% chance the Team pulls that many.

**The verdict** compares the ready count (`readyCount`) with the band:
- **Below**: fewer ready than `need.low`. "Refine 2 to 5 more" is `need.low` and `need.high` minus the ready count.
- **In**: between `need.low` and `need.high`, both included. "Nothing more needs refining by then."
- **Above**: more ready than `need.high`. "Stop refining: nothing more is needed by then." Explain it with the Team's numbers: more Work Items are ready (for example 11) than the Team is likely to pull before the Refinement after the next one (6 to 9), so the extra ready Work Items will wait. Above range is not an achievement. Never call it a success, being ahead, or a job well done; Lighthouse says "stop" as plainly as "refine more".

**No number, and its fix.** When `need.unavailableReason` is set there is no band and no verdict. Say why and name the fix; state no number of your own and never estimate one from Throughput:
- `NoRefinementStates`: the Team has no refinement states. "A Team admin needs to choose refinement states first", in the Team's settings under Refinement.
- `NoCadence`: the Team has no Refinement cadence. "A Team admin can set a Refinement cadence to see how many Work Items are needed", in the Team's settings.
- `InsufficientData`: "Not enough data yet — need at least 5 days with completed items to forecast."

**The yardstick** is what votes are cast against, in `yardstick.source`:
- `Sle`: the Team's SLE. The vote asks "Doable within 7 days?" with the SLE's days.
- `CycleTimeFallback`: the Team has no SLE, so Lighthouse uses the 85th percentile of the Team's default Cycle Time over its Throughput history: "No SLE set, based off 85% of historical cycle time". Setting an SLE gives the better yardstick.
- `Unavailable`: neither is there, and there is no number to vote against.

**Readiness.** `readySource` says what the ready count follows: `Votes`, or `Stages` once the Team sets a stage rule. A Work Item's stage is Waiting, Being refined or Ready. A stage rule that matches decides the stage and the readiness, and votes cannot lift or sink it. Otherwise a Work Item is Ready by votes when enough voters said Yes or "Yes, if…". Each row's `readiness`, as the tab words it:
- `Ready`: "Ready".
- `MoreYesNeeded`: "2 more Yes needed", with the count from `missingVotes`.
- `MoreVotersNeeded`: "2 more voters needed", with the count from `missingVotes`.
- `NeedsDiscussion`: "Needs discussion": too many No answers, or No and "Yes, if…" answers together.

`signalsDisagree` marks a row whose stage and votes tell a different story. Tallies are counts: never say who voted what.

---

## Delivery History

A Delivery's Metrics tab answers "how has the picture changed, and is it getting better or worse?". It builds forward from the day the Delivery was created, one snapshot a day, so a new Delivery has little to show for a day or two. Read it with `lighthouse_delivery_metrics`.
- **Burnup**: total scope against what is done. A dashed Estimated line means some Features are not broken down yet.
- **Predictability**: *How Likely?* is the chance of hitting the target date on each day; *When?* is the 50th, 70th, 85th and 95th percentile dates against the target. A moved target date steps the target line on the day it changed; it never rewrites the past.
- **Fever Chart**: each Feature on a schedule-against-confidence plot, and the trail of how it moved.
- **Features over Time**: which Feature grew, and when. A hatched band is still the Portfolio's default estimate rather than counted Work Items.

---

## Filling in Past Days (Preview)

Percentiles Over Time and PBC Over Time record one point a day. "Fill in past days on over-time charts" lets Lighthouse work the missing days out from the Work Items it already stores. It is a Preview, on by default, and only a System Admin can switch it.
- It runs in the background when a chart is opened; the filled days appear the next time the chart is opened, up to 90 days per visit, oldest first.
- It fills missing days only, and only where the stored history reaches.
- A filled day is worked out against today's configuration, so it may differ from what would have been recorded on that day.
- Switching it off stops further filling, but the days already filled stay: they cannot be told apart from recorded ones.
