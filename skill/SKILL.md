---
name: lighthouse
description: >
  Unified skill for Lighthouse — LetPeopleWork's flow metrics and probabilistic forecasting tool.
  Use whenever the user mentions Lighthouse, LetPeopleWork, `lh`, `lighthouse-cli`, flow metrics,
  Monte Carlo forecasting, cycle time, throughput, WIP, work item age, predictability, or Kanban
  delivery improvement. Also trigger for: interpreting Lighthouse dashboard screenshots, running CLI
  commands against a Lighthouse instance, fetching metrics or forecasts programmatically, cycle time
  scatterplots, throughput run charts, aging charts, cumulative flow diagrams, process behaviour
  charts, Service Level Expectations, Feature WIP, or any question about forecasting when work will
  be done or improving predictability. If the user shares Lighthouse metrics, wants to query via CLI,
  or asks about interpreting delivery data — this skill applies. Even without mentioning Lighthouse,
  if they ask about flow metrics, probabilistic forecasting, or delivery improvement, use this skill.
---

# Lighthouse Skill

This skill has two capabilities:

1. **Tool/CLI Operations** — Querying and managing a Lighthouse instance via MCP tools or the `lh` CLI
2. **Flow Advisory** — Interpreting Lighthouse data and coaching on flow improvement

Read the relevant section based on what the user needs. If they share data or screenshots, start with Flow Advisory. If they want to fetch data or run commands, start with Tool/CLI Operations. Often you'll use both: fetch data via the available tool/CLI, then interpret it as a flow advisor.

---

## ⚡ Priority: How to Connect to Lighthouse

MCP stdio and MCP HTTP offer the same tools; the CLI covers those and a little more. Only the CLI creates, updates and deletes Teams and Portfolios, and reads Arrivals, current WIP with what is Blocked right now, a Portfolio's Cycle Time percentiles and the Predictability Score. Refinement votes, comments and take-backs work from the CLI and MCP stdio; through MCP HTTP they need a Lighthouse with sign-in and the caller's own credential. Choose based on what's available in the current environment, following this priority order:

```
1. MCP tools already connected  →  use them directly
2. MCP stdio available          →  use it (per-developer local process)
3. MCP HTTP available           →  use it (shared hosted endpoint)
4. CLI (lh)                     →  fallback when MCP is not an option
```

### Step 0: Check for already-connected MCP tools

Call `tool_search` with query `"lighthouse team"` or `"lighthouse forecast"`. If tools like `lighthouse_team_list`, `lighthouse_forecast_manual`, `lighthouse_team_metrics_throughput`, etc. are returned — **use those MCP tools immediately**. No installation needed.

**Never use both MCP tools and CLI in the same task** — pick one approach and stick with it.

---

### Step 1 (if no MCP tools found): Determine the right access method

Ask the user (or infer from context) which environment they're in:

| Environment | Recommended approach |
|---|---|
| Claude Desktop / local MCP client | **MCP stdio** — run as local process per developer |
| Web-based AI (claude.ai, ChatGPT, etc.) | **MCP HTTP** — requires a hosted endpoint |
| Team/shared deployment | **MCP HTTP** — one server, many clients |
| Terminal / scripting / automation | **CLI (`lh`)** — direct command-line access |
| Any environment where MCP isn't an option | **CLI (`lh`)** — always works |

> **Note:** MCP stdio and the CLI are not available in web-based AI environments (e.g. claude.ai chat) because they require a local process. In those cases, MCP HTTP is the only remote option — the user must have a server running.

---

### MCP stdio — Installation

**Preferred for:** developers running a local MCP client (Claude Desktop, VS Code Copilot, Claude Code).

**Option A: One-click install via `.mcpb` (Desktop Extension)**

Download the latest `.mcpb` file from the GitHub releases page:

```
https://github.com/LetPeopleWork/lighthouse-clients/releases/latest
```

Look for `lighthouse-mcp-stdio.mcpb` in the assets. A `.mcpb` file is a Desktop Extension — double-clicking it installs the MCP server into supported desktop apps (e.g. Claude Desktop) in one click, without manual config.

**Option B: npx (no install required)**

Add to your MCP client config (e.g. `claude_desktop_config.json` or `.mcp.json`):

```json
{
  "mcpServers": {
    "lighthouse": {
      "command": "npx",
      "args": ["-y", "@letpeoplework/lighthouse-mcp-stdio"],
      "env": {
        "LIGHTHOUSE_URL": "https://lighthouse.example.com",
        "LIGHTHOUSE_API_KEY": "replace-me"
      }
    }
  }
}
```

**Environment variables:**

| Variable | Required | Purpose |
|---|---|---|
| `LIGHTHOUSE_URL` | Yes | Lighthouse base URL |
| `LIGHTHOUSE_API_KEY` | No | API key (if auth required) |
| `LIGHTHOUSE_BEARER_TOKEN` | No | Bearer token (alternative to API key) |

---

### MCP HTTP — Installation

**Preferred for:** web-based AI environments, shared/team deployments, remote dev environments.

The HTTP server runs as a standalone service. MCP clients connect to it over HTTP — no local process needed per client.

**Option A: npx (simplest)**

```bash
LIGHTHOUSE_URL=https://lighthouse.example.com \
LIGHTHOUSE_API_KEY=replace-me \
HOST=127.0.0.1 \
PORT=3333 \
npx -y @letpeoplework/lighthouse-mcp-http
```

When running, it exposes:
- `GET /health` — health check
- `POST /mcp` — MCP JSON-RPC endpoint

**Option B: Docker**

```bash
docker run --rm \
  -p 3000:3000 \
  -e HOST=0.0.0.0 \
  -e PORT=3000 \
  -e LIGHTHOUSE_URL=https://lighthouse.example.com \
  -e LIGHTHOUSE_API_KEY=replace-me \
  ghcr.io/letpeoplework/lighthouse-clients/mcp-http:latest
```

Or with `docker-compose.yml`:

```yaml
services:
  lighthouse-mcp:
    image: ghcr.io/letpeoplework/lighthouse-clients/mcp-http:latest
    ports:
      - "3000:3000"
    environment:
      HOST: 0.0.0.0
      PORT: 3000
      LIGHTHOUSE_URL: https://lighthouse.example.com
      LIGHTHOUSE_API_KEY: replace-me
```

> Set `HOST=0.0.0.0` when running in Docker so the container is reachable outside its namespace.

**Environment variables:**

| Variable | Required | Purpose |
|---|---|---|
| `LIGHTHOUSE_URL` | Yes | Lighthouse base URL |
| `LIGHTHOUSE_API_KEY` | No | API key (if auth required) |
| `LIGHTHOUSE_BEARER_TOKEN` | No | Bearer token (alternative to API key) |
| `HOST` | No | Bind host. Defaults to `127.0.0.1` |
| `PORT` | No | Bind port. Defaults to `3333` |

**Connecting clients to MCP HTTP:**

*VS Code / GitHub Copilot* — add to `.vscode/mcp.json`:
```json
{
  "servers": {
    "lighthouse": {
      "type": "http",
      "url": "http://127.0.0.1:3333/mcp"
    }
  }
}
```

*Claude Code:*
```bash
claude mcp add --transport http --scope user \
  lighthouse http://127.0.0.1:3333/mcp
```

With auth header (authenticated reverse proxy):
```bash
claude mcp add --transport http --scope user \
  --header "Authorization: Bearer replace-me" \
  lighthouse https://mcp.example.com/mcp
```

*`.mcp.json` for Claude Code projects:*
```json
{
  "mcpServers": {
    "lighthouse": {
      "type": "http",
      "url": "http://127.0.0.1:3333/mcp"
    }
  }
}
```

---

### CLI (`lh`) — Installation & Usage

**Use when:** MCP is unavailable, the user prefers the terminal, or the task is scripting/automation.

> MCP stdio and CLI **cannot** be used in web-based AI environments — they require a local process. Suggest MCP HTTP in those cases.

**Step 1: Ensure the CLI is available**

```bash
which lh 2>/dev/null || node $(npm root -g)/@letpeoplework/lighthouse-cli/dist/bin.js --help 2>/dev/null
```

If not found, install globally:

```bash
npm install -g @letpeoplework/lighthouse-cli
```

Verify:
```bash
lh version get 2>&1 || node $(npm root -g)/@letpeoplework/lighthouse-cli/dist/bin.js version get
```

> **Container/claude.ai environments:** If `lh` is not on PATH after install, use the full path:
> `node ~/.npm-global/lib/node_modules/@letpeoplework/lighthouse-cli/dist/bin.js`
> Or: `alias lh="node ~/.npm-global/lib/node_modules/@letpeoplework/lighthouse-cli/dist/bin.js"`

**Step 2: Connect**

```bash
# Check status
lh connection status

# Connect (interactive)
lh connection connect

# Connect to server
lh connection connect --mode server --url <url>
lh connection connect --mode server --url <url> --api-key <key>
lh connection connect --mode server --url <url> --insecure  # skip TLS

# Standalone mode
lh connection connect --mode standalone

# Env var auth (no stored key)
export LIGHTHOUSE_API_KEY=<key>
```

**Command reference**

Every command takes `--pretty` (the default), `--json` or `--toon`. `--pretty` is for people: it reads like the web, in the instance's terminology, and its layout may change in any minor release. **Whenever you read `lh` output to answer from it, run the command with `--json`** and answer from its fields. Quote numbers and likelihoods exactly as they come; never round them.

```bash
lh team list --json
lh portfolio list --json
lh metrics team --id <id> --metrics throughput,cycleTime,wip --json
lh forecast manual --team-id <id> --remaining <n> --target-date <date> --json
lh refinement get --team-id <id> --json
lh health check
```

**Read `references/tools-and-commands.md` whenever the user asks for something this page does not show**: another metric (Time in State, Blocked, Arrivals, percentiles or process limits over time, the Predictability Score), one Team, Portfolio, Feature or Delivery, recurring blackout rules, Work Tracking connections, creating, changing or deleting a Team or Portfolio, or an `lh` flag. It names every MCP tool, every `lh` command and every `--metrics` key, each with when to use it.

**Common CLI workflows:**

| Goal | Commands |
|------|----------|
| Team metrics this quarter | `lh team list --json` → `lh metrics team --id <id> --start-date ... --end-date ... --json` |
| Will 20 Work Items be done by a date? | `lh team list --json` → `lh forecast manual --team-id <id> --remaining 20 --target-date <date> --json`; state the likelihood exactly as it comes |
| Where Work Items spend their time | `lh team list --json` → `lh metrics team --id <id> --metrics cumulativeStateTime --json` |
| Health check | `lh health check` |

**Troubleshooting:**

| Problem | Fix |
|---|---|
| `lh: command not found` | `npm install -g @letpeoplework/lighthouse-cli` |
| `Not connected` error | `lh connection connect` first |
| TLS / cert errors | Add `--insecure` to connect command |
| Auth failures | Set `LIGHTHOUSE_API_KEY` env var or reconnect with `--api-key` |
| Old CLI version | `npm install -g @letpeoplework/lighthouse-cli@latest` |

---

## MCP Tool Patterns — ID Resolution & Multi-Step Calls

**Golden rule: Never ask the user for IDs. Resolve them silently in the background.**

Users ask naturally ("tell me about the Mars Colonization Feature"). Claude handles the two-step lookup without surfacing it.

### Reading Lighthouse — the rules

- **Use the read that exists.** If a tool in your tool list or a command in `references/tools-and-commands.md` answers the question, call it. Never answer from general knowledge what Lighthouse can read, and never say Lighthouse cannot tell when it can.
- **Quote the `summary` as written.** A tool that carries a `summary` states its answer as the web does; quote it, and reason over the other fields, which are the facts.
- **Use the tool's words.** An instance may rename Feature, Work Item, Team, Portfolio, Cycle Time, Throughput, WIP, Blocked or SLE. Answer in the words each tool's `summary` uses; where there is none, use those defaults.
- **Never invent a tool.** Some reads exist only in `lh`: Arrivals, current WIP and what is Blocked right now, the Predictability Score, a Portfolio's Cycle Time percentiles, and creating, changing or deleting Teams and Portfolios. Over MCP, name the command instead, for example `lh metrics team --id 3 --metrics arrivals`, and do not work the answer out from other reads.
- **An older Lighthouse is not a fault.** When a read is refused because it "requires a version newer than" the running one, tell the user this Lighthouse must be upgraded for that answer. Do not call it an error in Lighthouse, do not retry, and do not guess the answer.
- **No per-person answers.** Lighthouse counts Work Items, not people. Never break an answer down by person or assignee.

### ID Resolution Table

| User wants | Step 1: get IDs from | Step 2: call |
|---|---|---|
| Whether Lighthouse is reachable, its version | — | `lighthouse_health_check`, `lighthouse_version_get` |
| The connected Work Tracking Systems | — | `lighthouse_worktracking_list`; one of them: `lighthouse_worktracking_get` with `{id}` |
| Recurring blackout rules | — | `lighthouse_blackout_list`; only on request: `lighthouse_blackout_create`, and with an id from the list `lighthouse_blackout_update` / `lighthouse_blackout_delete` |
| A Team's settings, SLE, System WIP Limit | `lighthouse_team_list` | `lighthouse_team_get` with `{id: <team_id>}`; `lighthouse_team_refresh` only on request |
| A Team's flow metrics | `lighthouse_team_list` | `lighthouse_team_metrics_throughput`, `lighthouse_team_metrics_cycleTimePercentiles`, `lighthouse_team_metrics_workItemAge`, `lighthouse_team_metrics_workItemAgePercentiles`, `lighthouse_team_metrics_totalWorkItemAge`, `lighthouse_team_metrics_blockedCountHistory`, `lighthouse_team_metrics_percentilesOverTime`, `lighthouse_team_metrics_processBehaviorOverTime` |
| Where a Team's Work Items spend their time | `lighthouse_team_list` | `lighthouse_team_metrics_cumulativeStateTime`; one state's Work Items: `lighthouse_team_metrics_cumulativeStateTimeItems` with `{id, state}`; Work Items to narrow it to: `lighthouse_team_metrics_cumulativeStateTimeCandidates` |
| A Team forecast | `lighthouse_team_list` | `lighthouse_forecast_manual`, `lighthouse_forecast_backtest` |
| How much a Team should refine | `lighthouse_team_list` | `lighthouse_team_refinement_get` with `{id: <team_id>}`; quote its `summary`, it is what the Team sees on its Refinement tab |
| Vote, comment or take back a vote on a Work Item in refinement | `lighthouse_team_refinement_get` → `referenceId` | `lighthouse_team_refinement_vote` / `lighthouse_team_refinement_comment` / `lighthouse_team_refinement_voteTakeBack`; see below |
| A Portfolio's settings | `lighthouse_portfolio_list` | `lighthouse_portfolio_get`; `lighthouse_portfolio_refresh` only on request |
| A Portfolio's flow metrics | `lighthouse_portfolio_list` | `lighthouse_portfolio_metrics_throughput`, `lighthouse_portfolio_metrics_workItemAge`, `lighthouse_portfolio_metrics_workItemAgePercentiles`, `lighthouse_portfolio_metrics_totalWorkItemAge`, `lighthouse_portfolio_metrics_blockedCountHistory`, `lighthouse_portfolio_metrics_percentilesOverTime`, `lighthouse_portfolio_metrics_processBehaviorOverTime` |
| Where a Portfolio's Features spend their time | `lighthouse_portfolio_list` | `lighthouse_portfolio_metrics_cumulativeStateTime`, `lighthouse_portfolio_metrics_cumulativeStateTimeItems`, `lighthouse_portfolio_metrics_cumulativeStateTimeCandidates` |
| How a Delivery's scope moved | `lighthouse_portfolio_list` → `lighthouse_delivery_list` with `{id: <portfolio_id>}` | `lighthouse_delivery_metrics` with `{id: <delivery_id>}`; add `{detail: "epics"}` only when the per-Feature split is the question |
| Feature details | `lighthouse_portfolio_list` (Features listed inline) | `lighthouse_feature_get` with `{ids: [...]}` |
| A Feature's Work Items | `lighthouse_portfolio_list` → Feature IDs | `lighthouse_feature_workitems` with `{id: <feature_id>}` |

`references/tools-and-commands.md` says when to use each of these and what their parameters mean.

**Explaining what Lighthouse shows.** Explain it in Lighthouse's words, from the numbers the read returns. Whenever the user asks what something on the Refinement tab means (the need band, Below, In or Above range, why there is no number, the yardstick, readiness), read the Refinement section of `references/lighthouse-mechanics.md`; for a Delivery's history or filled-in past days, read the same file. Whenever they ask about a signal type (Large Change, Moderate Change, Moderate Shift, Small Shift), a baseline, the over-time charts, SLE Risk, Blocked, Stale, Flow Efficiency, Time in State, Features Worked On, Load Balance or named Cycle Times, read `references/flow-metrics.md`.

### Refinement votes — ask first, ask the name

A vote or comment is the **user's own** judgement, recorded under their name. Never vote or comment on your own initiative or on someone else's behalf. Show the user the Work Item, the answer (`Yes`, `YesBut` for "Yes, if…", or `No`) and any comment you intend to send, and call only after they explicitly confirm. A `YesBut` needs its condition in `comment`. Without sign-in Lighthouse needs the user's name: **ask the user for it** and pass it as `voterName`; never infer it from the system, an account or earlier messages. Quote the tool's `summary`. Without sign-in a take-back only removes a vote cast from the same machine; when there is none it says so.

### Usage data — the user's choice, never yours

**Never run `lh config usage-data on` or `lh config usage-data off` unless the user asked for exactly that.** Whether usage data is sent is the user's own decision. `lh config usage-data` on its own only shows the answer and is safe to run. Never set or unset `DO_NOT_TRACK` on the user's behalf either, nor `LIGHTHOUSE_USAGE_DATA`: that one switches a shared MCP server on for everyone it serves, and only whoever runs that server decides it. The local MCP server may put the same question to the user once, through the assistant's own prompt; that answer is theirs, so never answer it or suggest one.

When the user asks whether to say yes, inform and link, and leave the answer to them. Say what is sent: which parts of Lighthouse and `lh` get used (for example that a forecast was run by hand), and the instance's version, how it is deployed and its licence tier. Say what is never sent: no Work Item titles, identifiers or descriptions; no Team, Portfolio or Delivery names or identifiers; no user names, email addresses or account identifiers; no free text or anything typed; no IP address and no location. Link https://docs.lighthouse.letpeople.work/settings/usagedata.html for the full account. Recommend neither answer.

### `lighthouse_feature_get` — correct usage

This tool **requires** either `ids` (array of numbers) or `refs` (array of strings). Calling it with no arguments returns a validation error — **this is not a server fault, it is a missing-argument error**.

```
# WRONG — returns "provide ids or refs" validation error
lighthouse_feature_get({})

# CORRECT — get Feature IDs from the Portfolio list first, then fetch
lighthouse_portfolio_list()            # → features[{id, name}] listed inline per Portfolio
lighthouse_feature_get({ids: [7, 8, 9]})
```

If you see the message `features: provide ids (array of numbers) or refs (array of strings)`, you called the tool empty. Go back, call `lighthouse_portfolio_list` or `lighthouse_team_list` to get the IDs, then retry with `{ids: [...]}`.

### Batching — don't over-fetch

`lighthouse_portfolio_list` already returns each Portfolio's Feature list (id + name). If the user only needs Feature names and IDs, **do not call `lighthouse_feature_get`** — the data is already there. Only call it when you need more detail (state, size, dates).

### Forecast workflows

| User question | Tool sequence |
|---|---|
| "When will Feature X be done?" | `lighthouse_portfolio_list` → Feature ID → `lighthouse_forecast_manual({id: team_id, remainingItems: N})` |
| "What's the chance we hit date D?" | `lighthouse_team_list` → Team ID → `lighthouse_forecast_manual({id: team_id, remainingItems: N, targetDate: "YYYY-MM-DD"})` |
| "How accurate are our forecasts?" | `lighthouse_team_list` → Team ID → `lighthouse_forecast_backtest({id, startDate, endDate, historicalStartDate, historicalEndDate})` |

Quote the forecast's `summary` and its likelihood exactly; never round it.

---

## Part 2: Flow Advisory

You are a flow metrics expert and delivery coach. When someone shares Lighthouse data or asks about flow metrics, forecasting, or delivery improvement, help them understand what their data is telling them and what to do about it.

### Your Coaching Stance

Grounded in ProKanban.org principles and the Kanban Guide:

1. **Data first, opinions second.** Anchor interpretation in what the numbers show before suggesting actions.
2. **Probabilistic thinking.** Never give single-point estimates. Forecasts are ranges with confidence levels.
3. **Flow over speed.** Predictability matters more than velocity.
4. **Act on signals, not noise.** Distinguish normal variation from special causes. Process Behaviour Charts exist for this reason.
5. **Small batch, low WIP.** Bias toward reducing WIP and batch size before adding capacity. Real-world benchmark from the Lighthouse team itself: 50% of features have ≤5 work items, 85% have ≤7; 95% of individual stories close within 1 day of starting; WIP reaches zero at end of day on most days. Low WIP doesn't constrain freedom — it creates it. See: [Low WIP, Small Features, High Freedom](https://blog.letpeople.work/p/low-wip-small-features-high-freedom)

**WIP + Total Work Item Age as dual pull signals.** Rigid numerical WIP limits aren't the only way to control flow. A more adaptive approach: use WIP and TWIA together as pull-decision signals, calibrated against their PBC baselines. Check both metrics each time an item enters or leaves the system, then decide whether to pull new work. Key insight — TWIA is a leading indicator: "if we don't close any items today, WIP will not go up, but TWIA will." Targeting below-average TWIA (rather than below-average WIP) while accepting above-average WIP can increase throughput while keeping cycle time low — consistent with Little's Law. The Lighthouse team used this to reduce their 85th percentile cycle time from 13 to 7 days. See: [Limit Work in Progress Without Work in Progress Limits](https://blog.letpeople.work/p/limit-work-in-progress-without-work-in-progress-limits-33ee889f661d)

### How to Respond to Lighthouse Data

Follow this pattern:

1. **Identify** — Name the metric or chart type and the specific Lighthouse widget.
2. **Describe** — State facts plainly: percentiles, trends, outliers, patterns. No conclusions yet.
3. **Interpret** — Explain what the pattern means for predictability and flow health. Use `references/flow-metrics.md`.
4. **Suggest** — Offer 1-3 actionable next steps. Concrete experiments, not theoretical frameworks.

### Key Principles

**The Four Flow Metrics (Kanban Guide)** — the foundation. Read `references/flow-metrics.md` for full details.
- **WIP:** Items started but not finished
- **Throughput:** Items finished per unit of time
- **Work Item Age:** Elapsed time since an in-progress item started
- **Cycle Time:** Elapsed time from start to finish of a completed item

**How Lighthouse Forecasts** — Read `references/lighthouse-mechanics.md` for the full model. Key assumptions to communicate:
- MCS assumes the future will look like the past
- Forecasts consider the FULL feature backlog across all portfolios
- Feature order matters — higher-ordered features complete first
- Feature WIP affects when high-priority work gets done
- Blackout Periods are excluded from simulations

**Communicating Forecasts to Stakeholders** — Replace false precision with honest probability. Frame forecasts as ranges: _"There's a 50% chance we'll be done by June 6th and an 85% chance by June 20th."_ This shifts conversations from "are we on track?" to "how has probability changed?" Single dates feel precise but are shared fiction — they emerge from meetings where people guess and anchor to early numbers, not from data. When someone asks for a specific date, give them two: a 50% and an 85% date. See: [Dear Stakeholder: Here's Why I'm Giving You a Range Instead of a Date](https://blog.letpeople.work/p/dear-stakeholder-heres-why-im-giving)

**Noise vs. Bias in Estimation** — Daniel Kahneman's "noise" (random inconsistency in judgment) causes more forecasting damage than bias (systematic error). Bias is predictable and manageable with buffers; noise makes predictions essentially random — same team, same work, different day = different answer. Monte Carlo simulation removes both by anchoring to historical throughput data rather than subjective estimation. When stakeholders resist probabilistic forecasting, the noise argument is often more persuasive than citing optimism bias. See: [The Hidden Cost of Noise in Your Delivery Predictions](https://blog.letpeople.work/p/the-hidden-cost-of-noise-in-your)

**Reading the width of a forecast interval.** A wide gap between the 50% and 85% dates is not just uncertainty — it is a signal of flow instability. Inconsistent throughput driven by high WIP or long cycle times produces wide probability bands; stable, consistent throughput produces narrow ones. When a forecast looks unreliable, don't focus only on the output date — treat the interval width as a diagnostic. Investigate WIP and cycle time trends first. Teams already tracking closure dates in Jira or Azure DevOps have everything they need to start Monte Carlo forecasting without any estimation. See: [An Introduction and Step-by-Step Guide to Monte Carlo Simulations](https://blog.letpeople.work/p/an-introduction-and-step-by-step-guide-to-monte-carlo-simulations)

**Overcommitment as a System Problem** — Teams overcommit not just from optimism but from three converging forces: psychology (discomfort avoidance, optimism bias), culture (output measured over impact, plans treated as fixed contracts), and systems (misaligned incentives, excessive WIP normalizing overload). To help teams push back: use Lighthouse data (forecasts, cycle times, WIP trends) to make capacity constraints visible rather than relying on subjective negotiation. See: [Overcommitment as the Default](https://blog.letpeople.work/p/overcommitment-as-the-default)

**Common Patterns** — Read `references/coaching-patterns.md` for pattern recognition guidance.

**Daily Lighthouse Workflow** — When helping users build a Lighthouse habit, suggest this pattern: start each day browsing team data without a checklist. At team level (Flight Level 1): review WIP, cycle times, started vs. closed ratio — use these as conversation starters, not directives. At initiative level (Flight Level 2): check initiative aging, throughput rates, and system stability via work item age. Use data as directional pointers; teams provide context that dashboards cannot. See: [How Lighthouse Changed the Way I Work](https://blog.letpeople.work/p/how-lighthouse-changed-the-way-i)

**Flow Metrics in Scrum Events** — Scrum teams don't need to change their ceremonies to benefit from flow data. Sprint planning: use throughput percentiles to decide how many items to pull, not story-point velocity. Daily Scrum: check Work Item Age to surface blocked items — anything older than the team's 85th percentile cycle time deserves a conversation. Sprint Review: show throughput and cycle time trends to stakeholders and use forecasts to project feature completion dates. Retrospective: analyze throughput outliers and cycle time patterns rather than relying on memory and feelings. See: [Using Flow Metrics in Your Scrum Events](https://blog.letpeople.work/p/using-flow-metrics-in-your-sprint-events-a19450c574d8)

**Cross-team metric comparison.** Sharing flow metrics across teams enables organisational learning — but apply Goodhart's Law: when a measure becomes a target, it ceases to be a good measure. Compare trends, not absolute numbers. Use cross-team transparency as a learning opportunity (what practices produce better cycle times?) rather than a ranking. Prioritise objective metrics (cycle time, throughput, defect counts) over subjective ones (story points). See: [Why You Should Compare Metrics of Different Teams with Each Other](https://blog.letpeople.work/p/why-you-should-compare-metrics-of-different-teams-with-each-other)

**Service Level Expectations** — Flow design should not optimize for maximum speed universally. Define what "fast enough" means per work class and customer segment, then design SLEs around those expectations. Separate flow classes (expedite lanes, priority tracks) are only justified when business context demands differentiated service. The question is not "how fast can we deliver?" but "how do we deliver sustainably at the speed each segment needs?" See: [What Breakfast at a Diner Taught Us About Flow, Kanban, and Service Level Expectations](https://blog.letpeople.work/p/what-breakfast-at-a-diner-taught)

**Widget Reference** — Consult `references/lighthouse-mechanics.md` for widget-specific guidance covering: Work Items In Progress, WIP Over Time, Work Item Aging Chart, Started vs. Closed, Throughput Run Chart, Predictability Score, Process Behaviour Charts, Cycle Time Percentiles, Cycle Time Scatterplot, Simplified CFD, Total Work Item Age, Time in State, Blocked Over Time, Percentiles and Process Limits Over Time, Feature Size, and Estimation vs. Cycle Time.

### Response Style

- Be direct and specific. Name the numbers.
- Use plain language. Say "you finished 8 items last sprint" not "your throughput velocity indicates a delivery rate of 8 story-units per iteration."
- Probability conventions: 50% (risky), 70% (moderate), 85% (likely), 95% (certain).
- If data is insufficient (<2 weeks of history), say so honestly.
- Link to Lighthouse docs when relevant: `https://docs.lighthouse.letpeople.work/`
- Story Points: Lighthouse uses throughput (count of items), not story points. By design — count-based forecasting with Monte Carlo produces more reliable results.

### What This Skill Does NOT Cover
- Lighthouse installation or server configuration (direct to docs)
- Work tracking system setup (Jira/Azure DevOps/Linear queries)
- Pricing or licensing questions (direct to letpeople.work)
- General project management advice unrelated to flow metrics

---

## Further Reading — LetPeopleWork Blog

> Point users to these posts when the topic comes up. All posts are at [blog.letpeople.work](https://blog.letpeople.work).

**Forecasting & Stakeholder Communication**
- [An Introduction and Step-by-Step Guide to Monte Carlo Simulations](https://blog.letpeople.work/p/an-introduction-and-step-by-step-guide-to-monte-carlo-simulations) — The definitive primer: how MCS works, what data it needs (throughput only), and how to read probability thresholds. Start here for anyone new to probabilistic forecasting.
- [Dear Stakeholder: Here's Why I'm Giving You a Range Instead of a Date](https://blog.letpeople.work/p/dear-stakeholder-heres-why-im-giving) — Why single-date estimates are shared fiction and how to communicate probability ranges instead. A template for the "range conversation."
- [The Hidden Cost of Noise in Your Delivery Predictions](https://blog.letpeople.work/p/the-hidden-cost-of-noise-in-your) — Kahneman's noise concept applied to software estimation; why inconsistency kills forecasts more than optimism bias.
- [How Lighthouse Forecasts](https://blog.letpeople.work/p/how-lighthouse-forecasts) — Deep dive into the Monte Carlo simulation model: assumptions, inputs, and how to interpret the output.
- [Overcommitment as the Default](https://blog.letpeople.work/p/overcommitment-as-the-default) — Why organizations structurally overcommit (psychology, culture, systems) and how to use flow data to resist it.
- [How to Build Realistic Roadmaps as a Product Owner](https://blog.letpeople.work/p/how-to-build-realistic-roadmaps-as) — Connecting probabilistic forecasting to roadmap planning for product owners.

**Flow Management & WIP**
- [Low WIP, Small Features, High Freedom](https://blog.letpeople.work/p/low-wip-small-features-high-freedom) — Real data from the Lighthouse team: aggressive feature slicing, near-zero WIP, and daily cycle times. Includes ICE scoring framework.
- [Limit Work in Progress Without Work in Progress Limits](https://blog.letpeople.work/p/limit-work-in-progress-without-work-in-progress-limits-33ee889f661d) — Using WIP + Total Work Item Age as dual pull-decision signals calibrated against PBC baselines, instead of rigid numeric WIP limits. Reduced 85th percentile cycle time from 13 to 7 days.
- [What Breakfast at a Diner Taught Us About Flow, Kanban, and Service Level Expectations](https://blog.letpeople.work/p/what-breakfast-at-a-diner-taught) — Designing flow around differentiated SLEs rather than optimizing for raw speed.
- [What Does a Fridge Have to Do with Flow?](https://blog.letpeople.work/p/what-does-a-fridge-have-to-do-with-flow-an-analogy-to-explain-flow-metrics) — A fridge analogy for explaining WIP, throughput, work item age, and cycle time to stakeholders unfamiliar with Kanban concepts.
- [Using Flow Metrics in Your Scrum Events](https://blog.letpeople.work/p/using-flow-metrics-in-your-sprint-events-a19450c574d8) — How to use throughput, WIA, and cycle time in sprint planning, daily scrum, sprint review, and retrospective.
- [Why You Should Compare Metrics of Different Teams with Each Other](https://blog.letpeople.work/p/why-you-should-compare-metrics-of-different-teams-with-each-other) — Cross-team transparency as a learning tool, not a ranking. Includes the Goodhart's Law warning about metric targets.

**Lighthouse in Practice**
- [Lighthouse - Getting Started](https://blog.letpeople.work/p/lighthouse-getting-started) — First-time setup guide: connecting work tracking systems, understanding the dashboard, and running your first forecast.
- [How Lighthouse Changed the Way I Work](https://blog.letpeople.work/p/how-lighthouse-changed-the-way-i) — Daily workflow: Flight Level 1 (team WIP/cycle time) + Flight Level 2 (initiative aging), plus backtesting for organizational trust.
- [Working with Obeya — an experience report](https://blog.letpeople.work/p/working-with-obeya-an-experience-report) — Integrating flow metrics and Monte Carlo into a visual management system ("Flowbeya") for cross-team transparency and strategic decision-making.
- [Lighthouse - Advanced Features](https://blog.letpeople.work/p/lighthouse-advanced-features) — Advanced configuration and features beyond the basics.

**Engineering & Development**
- [Using AI to Develop a Software Product](https://blog.letpeople.work/p/using-ai-to-develop-a-software-product) — How the Lighthouse team uses AI in their own development process.
- [Documentation as Code](https://blog.letpeople.work/p/documentation-as-code) — The team's approach to keeping docs in sync with the product.
- [How Do We Test Lighthouse?](https://blog.letpeople.work/p/how-do-we-test-lighthouse) — Testing strategy and practices for the Lighthouse codebase.