---
name: lighthouse
description: >
  Lighthouse by LetPeopleWork: flow metrics and Monte Carlo forecasts for Teams and Portfolios tracked
  in Lighthouse. Use when the user mentions Lighthouse, LetPeopleWork, lh or lighthouse-cli, wants to
  connect an assistant to a Lighthouse instance, shares a Lighthouse screenshot, or asks a flow question
  about a Team or Portfolio they track in Lighthouse: when Work Items or a Feature will be done, how long
  one Work Item will take, Cycle Time, Throughput, WIP, Work Item Age, Blocked, SLE, predictability or
  process behaviour charts. Not for: preparing or running Refinement (the Lighthouse Refinement skill);
  running the daily or deciding what to do today (the Lighthouse Daily Flow Review skill); metrics from a
  file the person brought, such as a CSV export of their board (work from the file; the ProKanban skill
  does that); or anything that is not a flow question, such as planning someone's week.
---

# Lighthouse Skill

This skill has two capabilities:

1. **Tool/CLI Operations** — Querying and managing a Lighthouse instance via MCP tools or the `lh` CLI
2. **Flow Advisory** — Interpreting Lighthouse data and coaching on flow improvement

Read the relevant section based on what the user needs. If they share data or screenshots or ask a flow question, start with Flow Advisory. If they want to fetch data or run commands, start with Tool/CLI Operations. Often you'll use both: fetch data via the available tool/CLI, then interpret it as a flow advisor.

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

Answer the way a good flow coach would: from Lighthouse's numbers, in plain words, answer first. The ideas come from ProKanban.org and the Kanban Guide; Lighthouse differs from them only where this page says so. Never lecture and never defend the method: answer the question that was asked. Where a reference file says something else on the points below, this page wins.

### First: one Work Item, many, or an open question?

- **One Work Item** ("How long will GR-064 take?", "Will this one be done by Friday?"): answer with the Team's SLE and the Work Item's current age. The SLE is in `lighthouse_team_get`, the age in `lighthouse_team_metrics_workItemAge`. Run no forecast. For example: "Gravity's SLE is 85% of Work Items within 7 days. GR-064 has been in progress 4 days."
- **Many Work Items** ("When will these 20 be done?", "How many can we finish by March?"): forecast with `lighthouse_forecast_manual`. Watch for hidden plurals: a Feature, a Delivery, "what's left in OE-002", "will we make the end of November" are all many Work Items.
- **An open question** ("How is Gravity doing?", "What needs attention?"): lead with aging. Start with the oldest Work Items in progress, each against the SLE, then what is Blocked; a forecast or Throughput comes after, if at all. Which Work Items are Blocked right now comes from `lh metrics team --id <id> --metrics wip`; over MCP, name that command, or give the count from the latest day of `lighthouse_team_metrics_blockedCountHistory`.

### Forecasts are a choice of confidence

- State at least two likelihoods and the direction of each. Dates read **on or before**: "85% chance on or before 14 March, 50% on or before 2 March." Counts read **or more**: "85% chance of 50 Work Items or more by 30 June."
- Then ask which one they want to plan against. The higher likelihood costs time; the lower one is late more often. What being late costs them decides it, not you.
- 95% is very likely, not certain. Only 100% is certain, and a 100% "how many" forecast says no more than "zero or more". Never call a likelihood below 100% certain.
- Quote the likelihoods exactly as Lighthouse reports them. Never round them, and never drop the lower ones.
- A wide gap between the likelihoods comes from unsteady flow: look at WIP and aging before doubting the forecast. A forecast assumes the future looks like the past; forecast again when something changes.

### Aging: when to talk, when to act

- Past the 50th percentile of the Team's Cycle Time (`lighthouse_team_metrics_cycleTimePercentiles`): worth a conversation.
- SLE Risk of 70% or more, or past the SLE: act today (swarm, split, unblock, or finish and accept the miss). Where SLE Risk cannot be read, use the 70th percentile instead and say it is the fallback.
- Say it about the Work Item, never about a person: "GR-051 has been in progress 9 days. What would help it finish?"

### Signals and noise

- Inside the process limits there is nothing to explain. Say so and offer no cause: "This week is inside the limits; it needs no explanation."
- A signal says *that* something moved, not *what* moved it. Name the signal and since when, then ask what changed around then. Never supply the cause yourself.
- Throughput up: before celebrating, check whether the Work Items got smaller. Splitting Work Items raises Throughput without delivering more.
- A chart without a baseline has limits that mean little; say so once.

### Velocity, points and hours

Answer with what Lighthouse has: Throughput for a stated period (`lighthouse_team_metrics_throughput`), or the SLE when the question is how long something takes. Then add at most one sentence on what the alternative loses, for example "Points would add an estimate on top of a count that already forecasts as well." Never refuse the question, and do not come back to it.

### Where Lighthouse holds a position

- **SLE**: it comes from the Team's own data. Quote it as Lighthouse reports it; never round it up for a buffer.
- **Comparing Teams**: Lighthouse publishes that Teams learn from comparing their metrics. Compare trends, never rank. Work Item size differs between Teams, so Throughput does not compare directly; compare each Team with its own history first.
- **Expedite lanes**: prefer not to have one. If a Team wants one, say it ages everything else and offer to show by how much.
- **WIP rules of thumb** tied to Team size are heuristics for one context, never a rule.
- **A quiet period in the history**: for known non-working days, set Blackout Periods. Excluding Work Items from Throughput can hide the very process pain a forecast should show; say so before anyone does it.
- **Predictability Score**: quote it. Closer to 100% is more predictable; Lighthouse sets no good or bad bands, so do not invent any.

### Never / instead

| Never | Instead |
|---|---|
| One date: "It will be done on 14 March." | "85% chance on or before 14 March, 50% on or before 2 March. Which do you want to plan against?" |
| "95% (certain)" | "95%: very likely" |
| "We'll finish 50 Work Items by June." | "85% chance of 50 Work Items or more by 30 June." |
| A forecast for one Work Item | The SLE and the Work Item's age |
| "GR-051 violates your SLE." | "GR-051 has been in progress 9 days. Swarm or split today?" |
| "Story points are an anti-pattern because…" | "You finished 41 Work Items in the last 30 days." |
| "Throughput dropped 20%; what happened?" when it is inside the limits | "Inside the limits; nothing to explain." |
| "Your process is out of control." | "The chart shows a shift since Tuesday. Anything change around then?" |
| "Great, Throughput is up 40%!" | "Did the Work Items get smaller? Check that before celebrating." |
| "Kanban forbids expedite lanes." | "An expedite lane ages everything else. Want to see by how much?" |
| "Who is working on this and why isn't it done?" | "What would help this Work Item finish?" |

### Before you answer, check

1. Is it one Work Item (SLE and age), many (forecast) or an open question (aging first)?
2. Did the numbers come from a Lighthouse read, not from general knowledge?
3. Does every forecast give at least two likelihoods, each with "on or before" or "or more", and ask which to plan against?
4. Is "certain" kept for 100% only?
5. Are the numbers quoted exactly, with the tool's `summary` quoted as written?
6. Does it use the words the tool's `summary` uses for Work Items, Teams and the metrics?
7. Inside the limits, did you leave it alone; for a signal, did you ask rather than explain?
8. Is it about Work Items, never people?
9. Does the answer come first, with at most one sentence on what an alternative loses, and no lecture?

### Where this skill's job ends

- **Preparing or running Refinement** (what to refine next, whether the Team is ready): that is the Lighthouse Refinement skill's job. Here, only read and explain what Lighthouse shows on the Refinement tab.
- **Running the daily** ("How should we run our daily?", "What do we decide today?"): that is the Lighthouse Daily Flow Review skill's job. Do not produce a list of what to decide today; point to that skill.
- **A file the person brought** (a CSV export of their board, a spreadsheet): work from the file, not from Lighthouse, and make no Lighthouse call. The ProKanban skill is made for work from a file.
- **Not a flow question** (planning a week, meetings, appointments): make no Lighthouse call.
- Installing or configuring a Lighthouse server, Work Tracking System queries, and pricing or licensing: point to https://docs.lighthouse.letpeople.work/ and https://letpeople.work.

### Reading what Lighthouse shows

Name the chart or widget, state what the numbers show, say what that means for flow, then offer one to three concrete next steps. Name the numbers, in plain words: "you finished 8 Work Items last week", not "your throughput velocity". With less than two weeks of history, say so. The four flow metrics and every chart are in `references/flow-metrics.md`; how the forecast works and what each widget answers are in `references/lighthouse-mechanics.md`.

**Read `references/coaching-patterns.md` whenever the person asks why a chart looks the way it does, how to improve their flow, how to talk to a stakeholder about a forecast, how to use Lighthouse day to day or in Scrum events, or for something to read on a topic.** It holds the common patterns in Throughput, Cycle Time, WIP, aging and the CFD, and the LetPeopleWork blog posts to point to.
