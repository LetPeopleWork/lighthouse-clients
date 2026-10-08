# @letpeoplework/lighthouse-mcp-stdio

Local stdio MCP server for [Lighthouse](https://github.com/LetPeopleWork/Lighthouse).

Use this package when you want Lighthouse tools inside a local MCP client such as VS Code / GitHub Copilot or Claude Code without hosting a separate HTTP service.

## What It Exposes

The stdio server exposes Lighthouse as MCP tools for:

- Health and version checks. `lighthouse_health_check` and `lighthouse_version_get` keep their facts block (`connectivity: success`, `version: v26.10.3.6`) and add a second block, `summary: Lighthouse is reachable.` or `summary: Lighthouse v26.10.3.6`, as the footer shows it.
- Work tracking, team, and portfolio lookups. `lighthouse_worktracking_list` keeps its facts block and adds a second block counting the connections in the instance's words (`summary: 3 Work Tracking Systems`); `lighthouse_worktracking_get` carries a `summary` naming the connection and its type, never an option's value. `lighthouse_blackout_list` counts the recurring blackout rules the same way (`summary: 2 recurring blackout rules`). `lighthouse_team_list` and `lighthouse_portfolio_list` keep their facts block and add a second block counting them (`summary: 7 Teams`); `lighthouse_team_get` and `lighthouse_portfolio_get` carry the page's heading and settings as `summary`, as `lh team get` and `lh portfolio get` print them.
- Team and portfolio refresh operations. `lighthouse_team_refresh` and `lighthouse_portfolio_refresh` keep their facts block (`team refreshed: 3`) and add the line `lh` confirms with as a second block (`summary: Refresh queued: Team [id: 3]. Lighthouse updates it in the background.`). The recurring blackout tools (`lighthouse_blackout_create`, `_update`, `_delete`) do the same, the rule's own `summary` field left as Lighthouse sent it.
- Team and portfolio metrics. Each per-metric tool (Throughput, the Cycle Time and Work Item Age percentiles, Work Item Age, Total Work Item Age, the blocked history, the percentiles over time, the process limits and Time in State) also states its answer as `lh metrics --metrics <name>` heads it: the heading and the sentence. Time in State's drill-down into one state states the heading and the title above its Work Items; the list of Work Items to pick from carries no summary.
- What a Team has in progress, its SLE Risk, and Process Behaviour Charts. `lighthouse_team_metrics_wip` lists each Work Item in progress today with its age, state, whether it is Blocked and since when, and its link, beside a `summary` counting them against the System WIP Limit and naming how many are Blocked, or saying that no System WIP Limit is set, that Lighthouse does not say which Work Items are Blocked, or that nothing is in progress. `lighthouse_team_metrics_sleRisk` returns Lighthouse's own SLE Risk for each Work Item in progress unchanged, beside a `summary` in the words `lh metrics team --metrics sleRisk --pretty` uses: how many are at risk of missing the SLE, counted from the web's 70% line, then every Work Item highest risk first. It needs a Lighthouse newer than v26.9.19.10; an older one's refusal comes back as the upgrade it asks for. `lighthouse_team_metrics_processBehaviorChart` and `lighthouse_portfolio_metrics_processBehaviorChart` return one Process Behaviour Chart, named with `metricType` (`Throughput`, `WorkItemAge`, `Wip`, `CycleTime`, `Arrivals`, and `FeatureSize` for Portfolios only), unchanged, beside a `summary` naming each signal with the days it fired, or saying there are no signals, that no baseline is set, or why Lighthouse could not compute the chart.
- Feature, delivery, and forecast operations. `lighthouse_feature_get` keeps its facts block and adds a second block counting the Features (`summary: 3 Features`); `lighthouse_feature_workitems` adds the heading `lh feature workitems` prints (`summary: OE-002 Deep-sea camera stream · 3 Work Items`), naming the Feature by its id when its name cannot be read. `lighthouse_delivery_list` keeps its facts block and adds a second block counting the Deliveries (`summary: 4 Deliveries`); `lighthouse_delivery_metrics` states the Delivery and its Delivery Date as `lh delivery metrics` heads them, in a second block beside the day-by-day rows or as the `summary` field of the `detail: "epics"` payload. The forecast tools (`lighthouse_forecast_manual`, `lighthouse_forecast_backtest`) also return a `summary` stating the answer as the web does: the heading and likelihood sentence, or the backtest's heading, period and actual Throughput.
- A Team's refinement need (`lighthouse_team_refinement_get`): how many Work Items to refine before the next Refinement, with the sentence the web page states as `summary`.
- Refinement votes: `lighthouse_team_refinement_vote`, `lighthouse_team_refinement_comment` and `lighthouse_team_refinement_voteTakeBack` record the user's own vote, comment or take-back on a Work Item in refinement, marked as sent through an assistant. They are writes, and their descriptions tell the assistant to confirm with the user first and to ask for the user's name (needed without sign-in) rather than infer it. The server keeps a voter key per Lighthouse in the same `voter-keys.json` the `lh` command line uses, so the user is one voter whether they vote from `lh` or through the assistant.

## Connection and Authentication

The runtime resolves Lighthouse in this order:

1. `LIGHTHOUSE_URL`, if set.
2. The Lighthouse standalone lock file, if the standalone app is running and has written its discovery contract.

Authentication is optional. If the target Lighthouse instance requires an API key, set `LIGHTHOUSE_API_KEY`.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `LIGHTHOUSE_URL` | No | Explicit Lighthouse base URL. Must be a valid `http` or `https` URL. |
| `LIGHTHOUSE_API_KEY` | No | API key used for Lighthouse requests. |

If `LIGHTHOUSE_URL` is not set, the package tries standalone discovery using the Lighthouse lock file:

- macOS: `~/Library/Application Support/Lighthouse/standalone.lock.json`
- Windows: `%APPDATA%/Lighthouse/standalone.lock.json`
- Linux: `$XDG_CONFIG_HOME/Lighthouse/standalone.lock.json` or `~/.config/Lighthouse/standalone.lock.json`

## Installation

The recommended setup is to let your MCP client start the package directly with `npx`:

```bash
npx -y @letpeoplework/lighthouse-mcp-stdio
```

If you prefer a global install:

```bash
npm install -g @letpeoplework/lighthouse-mcp-stdio
```

That makes the `lighthouse-mcp-stdio` executable available on your `PATH`.

## VS Code / GitHub Copilot

Add the server to `.vscode/mcp.json` in your workspace or to your user MCP configuration.

```json
{
  "servers": {
    "lighthouse": {
      "type": "stdio",
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

Notes:

- Prefer VS Code input variables or environment-file support for secrets instead of hardcoding `LIGHTHOUSE_API_KEY`.
- If you are using the Lighthouse standalone desktop app locally, you can omit `LIGHTHOUSE_URL` and let the package discover the lock file automatically.
- After saving `mcp.json`, start or restart the server from the MCP commands in VS Code. Once it is running, Lighthouse tools become available in chat.

## Claude Code

Add the server with `claude mcp add`:

```bash
claude mcp add --transport stdio --scope user \
  --env LIGHTHOUSE_URL=https://lighthouse.example.com \
  --env LIGHTHOUSE_API_KEY=replace-me \
  lighthouse -- npx -y @letpeoplework/lighthouse-mcp-stdio
```

If you are using a local Lighthouse standalone app, omit `LIGHTHOUSE_URL` and keep only the API key if needed:

```bash
claude mcp add --transport stdio --scope user \
  --env LIGHTHOUSE_API_KEY=replace-me \
  lighthouse -- npx -y @letpeoplework/lighthouse-mcp-stdio
```

You can also commit a project-scoped `.mcp.json` file for Claude Code:

```json
{
  "mcpServers": {
    "lighthouse": {
      "type": "stdio",
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

After adding the server, use `/mcp` in Claude Code to confirm it is connected.

## Claude Desktop (MCPB Bundle)

The easiest way to add Lighthouse MCP to Claude Desktop is via the `.mcpb` bundle, which is attached to every [lighthouse-clients GitHub Release](https://github.com/LetPeopleWork/lighthouse-clients/releases) as `lighthouse-mcp-stdio.mcpb`.

Download the `.mcpb` file and open it — Claude Desktop will guide you through installation and ask for your Lighthouse URL and optional API key.

The bundle is fully self-contained: the MCP server runtime is bundled inside the `.mcpb` file and starts in-process when Claude Desktop launches it. No npx, no additional npm install, and no network access is required at startup.

Alternatively, install the package globally and configure the server manually in `claude_desktop_config.json`:

```bash
npm install -g @letpeoplework/lighthouse-mcp-stdio
```

```json
{
  "mcpServers": {
    "lighthouse": {
      "command": "lighthouse-mcp-stdio",
      "args": [],
      "env": {
        "LIGHTHOUSE_URL": "https://lighthouse.example.com",
        "LIGHTHOUSE_API_KEY": "replace-me"
      }
    }
  }
}
```

## Example Prompts

Once connected, you can ask your MCP client for things like:

- List all Lighthouse teams.
- Refresh team 12 and summarize any changes.
- Show the current throughput and cycle time percentiles for team 5.
- Look up feature references `ABC-123` and `ABC-456`.

## When to Use stdio vs HTTP

Use `@letpeoplework/lighthouse-mcp-stdio` when the MCP client and Lighthouse access both live on the same machine or inside the same developer environment.

Use `@letpeoplework/lighthouse-mcp-http` when you want a shared MCP endpoint for multiple users, multiple workspaces, or container-based deployment.

## Runtime Behavior

### Tool response format

All MCP tool responses are serialized using [TOON](https://github.com/LetPeopleWork/toon-format) instead of plain JSON.
TOON is a structured text format designed for LLM consumption.
MCP clients that display raw tool results will see TOON-encoded output.

A tool that carries a `summary` states its answer there as the web does, in the instance's terminology. An object answer carries it as a `summary` field beside the facts. A list answer keeps its facts block exactly as before and carries the summary in a second text block, `summary: …`. Every other field is the facts, unchanged; when the tool does not recognise the answer's shape it adds no summary.

### Usage data

The first tool call that succeeds against a Lighthouse nobody on this machine has answered for asks you once, through your assistant, whether Lighthouse may receive usage data, when your assistant supports questions from an MCP server (elicitation). Your tool result reaches you unchanged either way. The answer is shared with `lh` for that Lighthouse, so answering in either place stops both asking. If your assistant cannot ask, nothing is asked or sent until you answer with `lh config usage-data on` (or `off`).

With a yes, a manual forecast, a Team refresh, a Portfolio refresh, a Refinement vote and the Refinement read on a Refinement day are reported to your Lighthouse with the source `Mcp`, after the result is returned, never with names, ids, URLs or anything you typed. `DO_NOT_TRACK` is honoured. Details: [Usage data](https://docs.lighthouse.letpeople.work/settings/usagedata.html).

### TLS certificate validation

All outbound HTTPS requests to Lighthouse skip TLS certificate validation.
This is intentional and hard-enforced so the server works with self-hosted Lighthouse instances that use self-signed certificates.
There is no option to enable strict TLS validation.
