---
"@letpeoplework/lighthouse-mcp-core": minor
"@letpeoplework/lighthouse-mcp-stdio": minor
---

The local MCP server asks once, through the assistant, whether Lighthouse may receive usage data

The first tool call that succeeds against a Lighthouse nobody on this machine has answered for asks once,
through the assistant, when the assistant can ask (MCP elicitation). The tool's own answer reaches you
unchanged either way. Accepting turns usage data on and declining keeps a No; closing the question or 50
seconds without an answer keeps nothing, and the server does not ask again until it restarts.

The answer is the one `lh` keeps for the same Lighthouse, so answering in either place stops both asking.
When the assistant cannot ask, nothing is sent until you run `lh config usage-data on`. Nothing is asked
or sent when the Lighthouse's administrator has stopped usage data or it was installed less than three
days ago.

With a yes, a manual forecast, a Team refresh, a Portfolio refresh, a Refinement vote (and the Work Item
becoming Ready through it) and the Refinement read on a Refinement day are reported with the source `Mcp`,
the same events the web reports for them. The send happens after the result is returned, so a slow
Lighthouse never delays a tool, and a call Lighthouse refused reports nothing. `DO_NOT_TRACK` is honoured.

`mcp-core`'s `registerMcpTools` takes an optional `usageData` port; without one, every tool behaves as
before. `createMcpCoreRuntime` gains `callCountedTool`, which returns a tool's result with what it counts.

When the Lighthouse will not let the question be put (installed less than three days ago, stopped by its
administrator, not taking usage data from MCP, or not answering), tool calls stop waiting on it, and the
server looks at its usage data state again at most once an hour instead of on every tool call.
