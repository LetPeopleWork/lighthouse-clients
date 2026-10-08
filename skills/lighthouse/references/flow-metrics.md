# Flow Metrics Reference

This reference covers the foundational flow metrics as defined in the Kanban Guide (kanbanguides.org) and applied in Lighthouse.

## Table of Contents
1. [The Four Flow Metrics](#the-four-flow-metrics)
2. [Service Level Expectations (SLE)](#service-level-expectations)
3. [Process Behaviour Charts (PBCs)](#process-behaviour-charts)
4. [Percentiles and PBC Over Time](#percentiles-and-pbc-over-time)
5. [Predictability and What Drives It](#predictability)
6. [Little's Law](#littles-law)
7. [Arrival Rate and Started vs. Closed](#arrival-rate)
8. [Newer Widgets](#newer-widgets): SLE Risk, Blocked, Stale, Flow Efficiency, Time in State, Features Worked On, Load Balance, named Cycle Times

---

## The Four Flow Metrics

The Kanban Guide requires tracking these four metrics. They are not optional extras — they are the minimum viable measurement set for any flow-based system.

### Work in Progress (WIP)
**Definition:** The number of work items started but not finished.

**Why it matters:** WIP is the single most powerful lever for improving flow. When WIP goes up, cycle times go up, predictability goes down, and context switching costs increase. WIP is a leading indicator — it's the only metric you can directly control through policy.

**What to look for:**
- Is WIP stable, increasing, or decreasing over time?
- Does WIP exceed any defined WIP limits?
- Are there patterns (e.g., WIP spikes at sprint boundaries)?
- Is WIP low enough that Work Items finish rather than wait? Rules of thumb that tie WIP to Team size are heuristics for one context, never a rule.

**Lighthouse widget:** Work Items In Progress (shows current WIP snapshot), WIP Over Time (shows trend)

### Throughput
**Definition:** The number of work items finished per unit of time. Measured as an exact count of items — not story points, not effort, not estimates.

**Why it matters:** Throughput is the engine of Monte Carlo forecasting. It's your historical track record of delivery. The more stable your throughput, the more reliable your forecasts.

**What to look for:**
- Is throughput stable or volatile? Stability = predictability.
- Are there days/weeks with zero throughput? Why?
- Is the throughput distribution roughly consistent, or are there wild swings?
- Does throughput trend up or down over time?

**Lighthouse widgets:** Throughput Run Chart, Predictability Score

**Key insight:** Throughput stability matters more than throughput volume. A team that consistently finishes 5 items/week is more predictable than one that swings between 2 and 12.

### Work Item Age
**Definition:** The elapsed time between when a work item started and the current time. Only applies to in-progress items.

**Why it matters:** Work Item Age is your early warning system. It's a leading indicator — when items start aging beyond your typical cycle time percentiles, that's a signal that something is wrong before the item even finishes. You can act on it NOW rather than discovering the problem after delivery.

**What to look for:**
- Are any items past the 50th percentile of your cycle time? They are worth a conversation. At an SLE Risk of 70% or more (or past the 70th percentile where SLE Risk cannot be read), act on them.
- Are items aging beyond your SLE? These are at risk.
- Is there a pattern in which workflow states items get stuck in?
- Are blocked items clearly identified?

**Lighthouse widget:** Work Item Aging Chart (scatter plot of in-progress items by state and age)

**Key coaching point:** Work Item Age is the metric that enables daily flow management. In a daily standup, the question should not be "what did you do yesterday?" but "which items are aging and what can we do to move them?"

### Cycle Time
**Definition:** The elapsed time between when a work item started and when it finished. Includes weekends, blocked time, and non-working days — it's calendar time, not active work time.

**Why it matters:** Cycle Time is your predictability check for completed work. In aggregate, it tells you how long items typically take. It's a lagging indicator — by the time you measure it, the work is done. But the patterns in your cycle time data reveal systemic issues.

**What to look for:**
- What are your percentiles? (50th, 70th, 85th, 95th)
- How wide is the spread? A narrow spread = predictable. A wide spread = unpredictable.
- Are there outliers? What caused them?
- Is there a trend (getting faster, slower, or staying stable)?
- Does cycle time correlate with item type or size?

**Lighthouse widgets:** Cycle Time Percentiles, Cycle Time Scatterplot, Estimation vs. Cycle Time

**Common misconception:** People want to use averages. Averages are dangerous because cycle time distributions are typically skewed — a few long items pull the average up. Always use percentiles. The 85th percentile is typically the most useful for setting expectations.

---

## Service Level Expectations (SLE)

**Definition:** A forecast of how long it should take a work item to flow from started to finished, expressed as a combination of time and probability (e.g., "85% of items complete within 14 days").

**Key points:**
- An SLE is NOT a target, NOT a deadline, and NOT a promise to stakeholders
- It's a data-driven expectation rooted in historical cycle time
- If you don't have enough history yet, start with a best guess and refine it as data accumulates
- The SLE gives your Aging Chart its teeth: items aging beyond the SLE need immediate attention
- Lighthouse lets you configure an SLE per team and overlay it on scatterplots and aging charts

**How to set an SLE:**
Look at your cycle time percentiles. Pick a percentile and time that reflects a realistic expectation. For example, if your 85th percentile cycle time is 12 days, your SLE is "85% of items within 12 days". Take the number as the data gives it; never round it up for a buffer.

---

## Process Behaviour Charts (PBCs)

PBCs help distinguish normal variation from special causes — signals that something has fundamentally changed in your system.

**How they work:**
- A baseline period establishes the average and the Natural Process Limits (UNPL/LNPL)
- Lighthouse provides PBCs for Cycle Time, Throughput, Total Work Item Age, WIP, Arrivals and, on a Portfolio, Feature Size

**The four signal types.** Lighthouse marks special causes with four chips. Use exactly these names and never invent others:
- **Large Change**: "A single point outside the natural process limits indicates an assignable cause with a dominant effect."
- **Moderate Change**: "Two out of three successive values beyond one of the two sigma lines (on the same side of the average) signal a moderate process change."
- **Moderate Shift**: "Four out of five successive values beyond one of the one sigma lines (on the same side of the average) signal a moderate, sustained shift."
- **Small Shift**: "Eight successive values on the same side of the average signal a small, sustained shift in the process."

A signal shows that something moved, not what moved it. Ask what changed around that time; never name a cause the data does not show.

**Status:** Act when no baseline is configured or a Large Change is detected; Observe on a Moderate Change (and no Large Change); Sustain when a baseline is configured and no special cause is detected.

**The baseline matters.** "These charts need a baseline to work." It is set in the Team or Portfolio settings. Without one, Lighthouse uses the selected date range as the baseline, so the limits move whenever the range does. Limits mean little without a baseline: say so whenever you read a signal off a chart that has none.

**How to use them:**
- If all data is within limits with no patterns → your process is stable (predictable)
- If there are special causes → investigate. Something changed. Was it intentional?
- Don't react to normal variation. The whole point of PBCs is to stop overreacting to noise.

**Reference:** Deming Alliance resources, Daniel Vacanti's "Actionable Agile Metrics for Predictability Volume II"

---

## Percentiles and PBC Over Time

**Percentiles Over Time.** "The percentile widgets tell you where you stand *today*. This chart tells you which way you are moving": Lighthouse records the 50th, 70th, 85th and 95th percentile once per day. Its toggle shows Work Item Age, or Cycle Time over the trailing 30 (the default), 60 or 90 days. "If the short horizon moves and the long one does not, you are looking at something recent." A day with nothing to measure draws no point, not a zero. It has no status indicator: it shows a direction of travel. Read it with `lighthouse_team_metrics_percentilesOverTime` or `lighthouse_portfolio_metrics_percentilesOverTime`.

**PBC Over Time.** It "tells you whether your system's idea of 'normal' is itself moving": Lighthouse records the average and both natural process limits once per day, for Throughput, Work Item Age, WIP, Cycle Time, Arrivals and, on a Portfolio, Feature Size.
- The band widens: variability is growing, and forecasts built on it get less useful.
- The band narrows: variability is shrinking and the process is becoming more predictable.
- The whole band shifts up or down: the average level moved. With the signals on the point-in-time chart, this is how to tell whether a change stuck.

Without a fixed baseline the limits move as a rolling window slides, "for reasons that have nothing to do with your process". On a fixed baseline, movement in this chart is a real signal. Read it with `lighthouse_team_metrics_processBehaviorOverTime` or `lighthouse_portfolio_metrics_processBehaviorOverTime`.

Both charts can show past days Lighthouse worked out afterwards; see "Filling in past days (Preview)" in `lighthouse-mechanics.md`.

---

## Predictability

**Definition in Lighthouse:** The Predictability Score measures how close together your MCS forecast percentiles are. Calculated as: (95th percentile value / 50th percentile value) × 100.

**Interpretation:**
- 100% = perfectly predictable (every day, same throughput — unrealistic but directional)
- The goal is NOT 100% — it's improving enough that forecasts become useful

**What drives predictability:**
1. **Low, stable WIP** — most important lever
2. **Small, similarly-sized work items** — reduces cycle time variance
3. **Fast aging item response** — don't let items sit; finish or kill them
4. **Consistent arrival rate** — match how many items you start to how many you finish
5. **Reduce blockers and dependencies** — every external dependency is a predictability killer

**Predictability ≠ Speed.** If you finish exactly 1 item per week, every week, you are perfectly predictable. You might also be slow. These are separate concerns. Fix predictability first, then optimize for speed.

---

## Little's Law

Little's Law states: **Average Cycle Time = Average WIP / Average Throughput**

This is a mathematical relationship, not a suggestion. When WIP goes up and throughput stays the same, cycle times MUST increase. This is why WIP control is so fundamental.

Practical implications:
- Want shorter cycle times? Reduce WIP (assuming throughput stays constant or improves)
- Increasing WIP without proportionally increasing throughput makes everything take longer
- This applies at every level: individual items, teams, features, portfolios

---

## Arrival Rate and Started vs. Closed

**Arrival Rate:** How many items enter your system per unit of time.

**The balance to watch:** Started items vs. Closed items (Lighthouse's "Started vs. Closed" widget)
- Started > Closed → WIP is increasing → cycle times will increase → predictability will decrease
- Started ≈ Closed → WIP is stable → system is in balance
- Started < Closed → WIP is decreasing → draining the system

**Practical advice:** Use the daily average from this widget to calibrate how much work to pull into your system. If you close 1.1 items per day on average, prepare roughly 5-6 items per week — not 15.

---

## Newer Widgets

Explain these as Lighthouse defines them, in the words each tool's `summary` uses. The quoted sentences are Lighthouse's own.

### SLE Risk
Teams only. A Work Item's SLE Risk answers one question: "of every item that was still open at this age, what share went on to take longer than the target?" Say it that way, with the SLE's days from `lighthouse_team_get`. For example, on a Team whose SLE is 7 days, an SLE Risk of 78% on a Work Item means that 78% of the Team's finished Work Items that were still open at that Work Item's age went on past 7 days.
- A Work Item counts as at risk from 70%. That line is fixed and the same for every Team. The SLE Risk widget counts the Work Items at risk; its status comes from the SLE's probability: an 85% SLE accepts that 15% will miss.
- A Work Item older than the SLE reads 100%: the miss has already happened.
- It rests on the Team's finished history, not on the date range, and uses the SLE's days only, not its probability.
- A thin history "reads as a cliff rather than a curve": 0% up to the SLE, 100% the day after. Where few finished Work Items reached that age, one more finishing moves the share a lot. Say how many it rests on when the read tells you.

### Blocked
The Blocked Overview counts the Work Items that were Blocked on the last day of the selected range; "the target is always zero blocked items". Blocked Over Time plots how many were Blocked on each recorded day; its history begins when the instance started recording, not before. Read the history with `lighthouse_team_metrics_blockedCountHistory` or `lighthouse_portfolio_metrics_blockedCountHistory`, and what is Blocked right now with `lighthouse_team_metrics_wip` for a Team, or `lh metrics portfolio --id <id> --metrics wip` for a Portfolio.

### Stale
The Stale Items Overview counts the Work Items in progress that "had been sitting in their current state longer than the configured staleness threshold — items that may be silently stuck even though no one flagged them". The threshold is days, set in the Team or Portfolio settings. A Blocked Work Item is never also counted as Stale. The target is zero.

### Flow Efficiency
"The share of time your work spends actively progressing versus waiting." Time in a wait state counts as waiting, all other Doing time as active, so it reads *Not configured* until the Team or Portfolio marks at least one wait state. Higher is better: below 40% is Act, 40% to 60% Observe, 60% or more Sustain.

### Time in State
Cumulative Time per State shows "how much total time your work spends in each workflow state". Each bar is a Doing state, split into time from Work Items that have left it and time still accumulating. One state holding more than 60% of the time is Act, 40% to 60% Observe. Read it with `lighthouse_team_metrics_cumulativeStateTime` or `lighthouse_portfolio_metrics_cumulativeStateTime`.

### Features Worked On
Teams only: "how many parent features currently have at least one child item in progress", against the Team's Feature WIP. More Features worked on than the Feature WIP is Act.

### Load Balance
The Load Balance Matrix shows "current load and short-term inventory risk in a single view": Total Work Item Age across, WIP up, divided by the baseline averages of the WIP and Total Work Item Age PBCs. One point is the selected end date; five more project the next days, with WIP held and Total Work Item Age growing by the WIP each day. It "intentionally favors a slightly higher-than-average WIP while keeping Total Work Item Age below average". Act when the baseline is missing or Total Work Item Age is above its baseline average: close work before starting new things.

### Named Cycle Times (Premium)
The default Cycle Time runs from the first Doing state to Done. A named Cycle Time is another window the Team or Portfolio defines, for example from the backlog onward. On a named Cycle Time the percentiles recompute over that window and the status goes neutral, because the SLE targets the default Cycle Time. Never judge a named Cycle Time against the SLE.
