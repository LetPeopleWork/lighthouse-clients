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
- **95% (Certain):** Almost guaranteed — only 5% of simulations took longer
- **85% (Likely):** High confidence — a solid commitment level
- **70% (Moderate):** Reasonable expectation — some risk
- **50% (Risky):** Coin flip — half the simulations took longer

For stakeholder communication, recommend the 85th percentile as the default commitment level. Use 70% for internal planning.

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

---

## Widget Reference

Quick reference for each Lighthouse metric widget:

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
| Feature Size | CT, Age, Throughput | Portfolios | How big are our features and how long do they take? |

---

## Data Requirements

**Minimum history:** ~2 weeks of throughput data for basic forecasts. 30-90 days recommended for reliable results.

**Recommended history window:** 30-90 days. Shorter captures recent changes but has less data. Longer provides more data but may include outdated patterns. For most teams, 30 days is a good starting point.

**Special events:** During periods like year-end holidays, extend the history window (e.g., 60-90 days) to soften the impact of extended zero-throughput periods.

**Story Points:** Not supported. By design. Throughput (count of items) with Monte Carlo produces more reliable forecasts than point-based estimation. The evidence for this is extensive — see Daniel Vacanti's work and the ProKanban.org resources.

**Feature-level forecasting:** Lighthouse measures throughput in days. Most teams don't close features every day, so feature-level throughput has too many zero days for reliable MCS. Always forecast at the work item level.
