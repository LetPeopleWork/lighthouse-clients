# Flow Metrics Reference

This reference covers the foundational flow metrics as defined in the Kanban Guide (kanbanguides.org) and applied in Lighthouse.

## Table of Contents
1. [The Four Flow Metrics](#the-four-flow-metrics)
2. [Service Level Expectations (SLE)](#service-level-expectations)
3. [Process Behaviour Charts (PBCs)](#process-behaviour-charts)
4. [Predictability and What Drives It](#predictability)
5. [Little's Law](#littles-law)
6. [Arrival Rate and Started vs. Closed](#arrival-rate)

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
- How does WIP compare to team capacity? A rough guide: WIP should ideally not exceed 2x the number of people.

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
- Are any items aging beyond the 85th percentile of your cycle time? These need attention.
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
Look at your cycle time percentiles. Pick a percentile and time that reflects a realistic expectation. For example, if your 85th percentile cycle time is 12 days, you might set your SLE to "85% of items within 14 days" (rounding up slightly for buffer).

---

## Process Behaviour Charts (PBCs)

PBCs help distinguish normal variation from special causes — signals that something has fundamentally changed in your system.

**How they work:**
- A baseline period establishes the average and Natural Process Limits (UNPL/LNPL)
- Data points outside the limits, or patterns within them, indicate special causes
- Lighthouse provides PBCs for: Cycle Time, Throughput, Total Work Item Age, WIP, and Feature Size

**Special cause rules (chips in Lighthouse):**
- **Large Change:** A data point beyond the Natural Process Limits
- **Trends and runs:** Extended sequences above or below the average

**How to use them:**
- If all data is within limits with no patterns → your process is stable (predictable)
- If there are special causes → investigate. Something changed. Was it intentional?
- Don't react to normal variation. The whole point of PBCs is to stop overreacting to noise.

**Baseline matters:** Lighthouse lets you set a baseline period in team/portfolio settings. Without a baseline, it uses the currently selected date range. Setting an explicit baseline is strongly recommended for meaningful PBC analysis.

**Reference:** Deming Alliance resources, Daniel Vacanti's "Actionable Agile Metrics for Predictability Volume II"

---

## Predictability

**Definition in Lighthouse:** The Predictability Score measures how close together your MCS forecast percentiles are. Calculated as: (95th percentile value / 50th percentile value) × 100.

**Interpretation:**
- 100% = perfectly predictable (every day, same throughput — unrealistic but directional)
- Above 60% = decent predictability
- Below 40% = forecasts are unreliable; focus on stabilizing before trusting predictions
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
