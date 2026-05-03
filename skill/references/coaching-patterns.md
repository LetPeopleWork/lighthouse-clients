# Coaching Patterns Reference

Common patterns you'll see in Lighthouse data, what they mean, and how to advise.

## Table of Contents
1. [Throughput Patterns](#throughput-patterns)
2. [Cycle Time Patterns](#cycle-time-patterns)
3. [WIP Patterns](#wip-patterns)
4. [Aging Patterns](#aging-patterns)
5. [Forecast Interpretation](#forecast-interpretation)
6. [CFD Patterns](#cfd-patterns)
7. [Common Questions and How to Answer Them](#common-questions)

---

## Throughput Patterns

### Stable throughput (good)
**What it looks like:** Relatively consistent number of items completed each day/week. Predictability Score above 60%.
**What it means:** The system is predictable. Forecasts should be reliable.
**Advice:** Maintain current practices. Look for opportunities to incrementally improve.

### Highly variable throughput
**What it looks like:** Wild swings — some days 5 items, some days 0, occasional spikes of 10+. Predictability Score below 40%.
**What it means:** Something is causing inconsistency. Could be: batch delivery (items pile up then all close at once), external dependencies, irregular WIP management, or varying item sizes.
**Advice:** Investigate the peaks. Are items being held and released in batches? Are there "batch close" days (e.g., end of sprint)? Look at whether item sizes vary wildly. Consider whether WIP limits would help stabilize flow.

### Declining throughput trend
**What it looks like:** PBC shows points dropping below the average line, or a sustained run below average.
**What it means:** Something has changed. Could be: team member departure, increased complexity, growing technical debt, increasing WIP, or external blockers.
**Advice:** Check WIP first — if WIP has increased alongside declining throughput, that's your answer. Check for increased blockers. Check for team changes.

### Throughput clusters with gaps
**What it looks like:** Groups of days with throughput, separated by gaps of zero.
**What it means:** Work is finishing in batches rather than continuously. Often caused by sprint-boundary batch releases, or by large items that take several days.
**Advice:** Is this a deployment cadence issue? Can items be released individually rather than in batches? Are items too large?

---

## Cycle Time Patterns

### Tight percentile spread (good)
**What it looks like:** 50th and 85th percentiles are close together (e.g., 3 days and 6 days).
**What it means:** Items are predictably sized and flow consistently. This team's SLE will be reliable.
**Advice:** Celebrate this. Set an SLE based on the 85th percentile and use it actively.

### Wide percentile spread
**What it looks like:** Big gap between 50th and 85th (e.g., 3 days and 21 days).
**What it means:** Some items flow quickly, others get stuck. Common causes: mixed item sizes, blockers, priority interruptions, unclear requirements, or items sitting in review.
**Advice:** Look at the outliers on the scatterplot. What do they have in common? Are they a specific type? Do they get stuck in a particular state? Use the Work Item Aging Chart to catch them earlier.

### Cycle time outliers (long tail)
**What it looks like:** Most items finish in 3-7 days, but a few take 30+ days.
**What it means:** These are the items that destroy predictability. Every outlier pulls your forecast range wider.
**Advice:** Focus on preventing these rather than speeding up the normal items. Ask: What happened to these items? Were they blocked? Were they too large? Were they deprioritized and left in progress? Consider a policy: if an item ages beyond the 85th percentile, it gets escalated or killed.

### Cycle time trending upward
**What it looks like:** Scatterplot dots drifting higher over time. PBC may show special cause.
**What it means:** Flow is degrading. Items are taking longer than they used to.
**Advice:** Check WIP trend (usually the culprit). Check for new dependencies or process changes. Check if scope of items has increased.

---

## WIP Patterns

### WIP steadily increasing
**What it looks like:** WIP Over Time chart trending upward.
**What it means:** More items are being started than finished. The system is accumulating inventory.
**Advice:** This is the #1 flow anti-pattern. Check Started vs. Closed to confirm arrival rate exceeds throughput. Recommend implementing or lowering WIP limits. Stop starting, start finishing.

### WIP sawtooth pattern
**What it looks like:** Regular spikes and drops in WIP.
**What it means:** Typically sprint-boundary behavior. WIP spikes at sprint start (new items pulled in) and drops at sprint end (items closed).
**Advice:** Consider continuous flow instead of big-batch sprint starts. Pull items as capacity opens rather than committing to a batch at the beginning.

### WIP exceeds limits consistently
**What it looks like:** WIP Over Time consistently above the system WIP limit line.
**What it means:** The WIP limit is either not being enforced, set too low for reality, or the team can't stop starting new work.
**Advice:** WIP limits that aren't enforced are theater. Either enforce the current limit (have honest conversations about what this means) or adjust it to be achievable and then gradually reduce it.

---

## Aging Patterns

### Items aging in specific states
**What it looks like:** Aging chart shows items clustering at high age in one particular state (e.g., "In Review" or "Waiting for QA").
**What it means:** There's a bottleneck or constraint at that state. Work flows in but doesn't flow out.
**Advice:** This is a constraint worth investigating. Can you add capacity at the bottleneck? Can you change the process (e.g., pair reviewing, automated testing)? Can you limit the WIP entering that state?

### Several items aging beyond SLE
**What it looks like:** Multiple dots above the SLE line on the Aging Chart.
**What it means:** Systemic issue — it's not one item getting stuck, it's the system producing late deliveries regularly.
**Advice:** The SLE isn't wrong; the process is. Look at what these items have in common. Reduce WIP. Implement a policy of "oldest first" — always work on the oldest item before starting something new.

### Old items abandoned in progress
**What it looks like:** Very old items (30+ days) still in a "doing" state but clearly not being actively worked on.
**What it means:** Zombie WIP — items that were deprioritized but never moved back to "to do" or cancelled. They inflate your WIP count and distort metrics.
**Advice:** Clean up. Either finish them, move them back, or cancel them. Having them sit in progress helps nobody and hurts your data quality.

---

## Forecast Interpretation

### When someone says "just give me the date"
**How to respond:** Give them the 85th percentile date and explain: "Based on our past delivery data, there's an 85% chance we'll be done by [date]. There's a 50% chance it'll be sooner — by [50th percentile date] — but I wouldn't plan around that."

### When the forecast range is very wide
**What it looks like:** 50th percentile says March 1, 95th says May 15.
**What it means:** Low predictability. The throughput data is too variable for a tight forecast.
**Advice:** Don't try to fix the forecast. Fix the flow. Improve predictability (stabilize WIP, reduce item size variation, remove blockers) and the forecast will naturally tighten. Show them the Predictability Score.

### When someone asks about Story Points
**The answer:** Lighthouse uses throughput — a count of completed items. Not story points. This is intentional. Monte Carlo with throughput produces more reliable forecasts because it removes the estimation bias. You don't need to estimate size if you're counting completions and letting historical data do the work. If items vary wildly in size, the advice is to break them down smaller, not to estimate them better.

### When the forecast seems "too pessimistic"
**How to respond:** Check the throughput data driving it. Is it including a low-throughput period (holidays, team absences)? If so, adjusting the history window might help. But also: the whole point of probabilistic forecasting is to avoid optimism bias. If the 85th percentile says June, saying "but we'll probably do it by April" is wishful thinking — and that's exactly the pattern MCS is designed to counter.

### When the backlog keeps growing
**How to respond:** Show the New Work Item Predictions feature. If items are arriving faster than they're being completed, the backlog will grow forever. This isn't a delivery problem; it's a scope management problem. Someone needs to prioritize and say no.

---

## CFD Patterns

### Parallel bands (good)
**What it looks like:** The "Doing" and "Done" areas grow at roughly the same rate. Trend lines are parallel.
**What it means:** WIP is stable. Items flow through the system at a consistent rate.

### Diverging bands
**What it looks like:** The gap between "Doing" and "Done" is growing.
**What it means:** WIP is increasing. Started > Closed.
**Advice:** Same as WIP increasing — stop starting, start finishing.

### Flat "Done" line
**What it looks like:** "Doing" grows but "Done" stays flat.
**What it means:** Nothing is being completed. Items enter the system but don't leave.
**Advice:** This is a crisis signal. Check for systemic blockers. Are items stuck in review? Are there deployment bottlenecks? Is there a skills gap?

### Staircase pattern in "Done"
**What it looks like:** "Done" increases in steps rather than gradually.
**What it means:** Batch delivery — items are released in groups rather than continuously.
**Advice:** Consider moving toward continuous delivery if possible.

---

## Common Questions

### "How do I improve our Predictability Score?"
1. Reduce WIP (most impactful)
2. Break items into smaller, more consistent sizes
3. Act on aging items sooner — use the Aging Chart daily
4. Balance arrival rate with throughput (Started vs. Closed)
5. Reduce external dependencies and blockers

### "Which metric should we focus on first?"
Start with WIP. It's the only metric you directly control, and it influences all the others. Once WIP is stable, focus on Work Item Age as your daily management tool. Throughput and Cycle Time are outputs — they'll improve as you manage WIP and age better.

### "How long should our history window be?"
30-90 days for most teams. Shorter windows capture recent changes but are noisier. Longer windows are smoother but may include outdated patterns. If your team changed significantly (new members, different work type), use a shorter window starting from when things changed.

### "Our forecast says X but stakeholders want Y"
This is a scope conversation, not a forecasting problem. Options: reduce scope (remove features), extend timeline, or add capacity (with the caveat that new team members need ramp-up time, making it initially worse). The forecast is the reality check — it's the stakeholder's expectations that need to adjust, not the data.

### "Should we count bugs separately?"
Yes, if bugs have a fundamentally different flow pattern than features. Lighthouse supports filtering by work item type. Consider: are bugs pulling throughput away from planned features? If so, the New Work Item Predictions feature can help you budget for expected bug arrivals.

### "We just had a major team change — is the forecast still valid?"
Probably not for the first 2-3 weeks. The historical data doesn't reflect the new reality. Consider shortening the history window once you have a couple weeks of new data. In the meantime, use forecasts with appropriate caveats.
