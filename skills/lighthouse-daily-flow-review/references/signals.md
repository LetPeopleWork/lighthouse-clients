# Reading the charts for the daily

Load this when you read a Team's Process Behaviour Charts for the daily. A chart signal is something worth discussing, never a decision: it says the system is no longer the system that was measured, not which part of it moved or why.

## Read them

- MCP: `lighthouse_team_metrics_processBehaviorChart` with `{id: <team_id>, metricType: "WorkItemAge"}` and again with `metricType: "Wip"`. These two are leading: they can be acted on today. Read `"Throughput"`, `"CycleTime"` and `"Arrivals"` the same way only to find what is worth a flow retro.
- `lh`: `lh metrics team --id <id> --metrics processBehaviorChart --json` reads every chart of the Team in one call.
- Read without dates. Each MCP chart has its `summary`: the signals Lighthouse found and the days they fired on, "No signals", a blackout day, a missing baseline, or that it is not ready. Go by the `summary`. With `lh --json`, read each chart's `status`, `baselineConfigured` and, per day, `specialCauses` and `isBlackout`. Never compute a limit or a signal yourself.

## What becomes a discussion prompt

Only the Total Work Item Age and WIP charts, and only when all of these hold:

- the chart is ready and has a baseline;
- the `summary` names a signal (Large Change, Moderate Change, Moderate Shift or Small Shift) on today, or on the last working day before it;
- the signal has fired on fewer than 3 working days in a row.

Say what the chart shows and since when, then ask. Name the signal as Lighthouse names it; the date is the first day of the run of signal days:

```text
The Total Work Item Age chart shows a Large Change since Wed 7 Oct. What changed in how we work around then?
```

- **Never offer a cause.** Do not guess what moved it, and do not explain it away as noise. The Team knows what happened; the question is theirs to answer.
- **Never say "out of control"**, never call the process broken or unstable, and never judge the Team by a chart.
- A signal that fired days ago and is gone by today is not raised.

## Worth a flow retro, not today's daily

Add one line before the closing line, starting "Worth a flow retro:", when either holds:

- **A lagging signal**: the Throughput, Cycle Time or Arrivals chart names a signal. These charts look back; they are not discussed in the daily. "Worth a flow retro: the Throughput chart shows a Moderate Shift since Mon 5 Oct."
- **A signal that persists**: the Total Work Item Age or WIP signal has fired on 3 or more working days in a row up to today. It has had its daily question; suggest a flow retro instead of asking it again: "Worth a flow retro: the Total Work Item Age chart has shown a Large Change on every working day since Mon 5 Oct."

Count working days only: skip weekends and blackout days.

## When a chart cannot give a signal

- **No baseline** (the `summary` says no baseline is set, or `baselineConfigured` is false): raise no signal from that chart, whatever the data points carry. Say once, in one line, that the chart has no baseline, so its limits come from the range shown, and that setting a baseline in the Team's settings makes the limits meaningful.
- **Not ready** (`status` is not `Ready`): raise no signal from it. If it is a chart you would have used, quote the `summary`'s reason in one line.
- **A blackout day is never a signal.** The `summary` lists it as a blackout day; say nothing about it.
- **Inside the limits** ("No signals"): say nothing about the chart at all. A system being itself needs no explaining.
- **Clients too old for the chart read** (no `lighthouse_team_metrics_processBehaviorChart`, or `lh` rejects `processBehaviorChart`): leave the charts out and say once that updating the Lighthouse clients brings the chart signals to the daily.
