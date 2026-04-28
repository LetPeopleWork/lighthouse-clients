# @letpeoplework/lighthouse-mcp-http

Streamable HTTP MCP runtime for [Lighthouse](https://github.com/LetPeopleWork/Lighthouse).

Use this package when you want to host Lighthouse as a shared MCP endpoint instead of starting a local stdio process per client.

## What It Exposes

The HTTP runtime exposes Lighthouse as MCP tools for:

- Health and version checks.
- Work tracking, team, and portfolio lookups.
- Team and portfolio refresh operations.
- Team and portfolio metrics.
- Feature, delivery, and forecast operations.

## Runtime Configuration

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `LIGHTHOUSE_URL` | Yes | Lighthouse base URL used by the MCP runtime. |
| `LIGHTHOUSE_API_KEY` | No | API key used for outbound Lighthouse requests. |
| `LIGHTHOUSE_BEARER_TOKEN` | No | Bearer token used for outbound Lighthouse requests. |
| `HOST` | No | Bind host. Defaults to `127.0.0.1`. |
| `PORT` | No | Bind port. Defaults to `3333`. |

Set either `LIGHTHOUSE_API_KEY` or `LIGHTHOUSE_BEARER_TOKEN` when the target Lighthouse instance requires authentication.

## Run Locally

The simplest local startup flow uses `npx`:

```bash
LIGHTHOUSE_URL=https://lighthouse.example.com \
LIGHTHOUSE_API_KEY=replace-me \
HOST=127.0.0.1 \
PORT=3333 \
npx -y @letpeoplework/lighthouse-mcp-http
```

If startup succeeds, the process writes a banner like:

```text
Lighthouse MCP HTTP server running at http://127.0.0.1:3333
```

The runtime exposes:

- `GET /health` for health checks.
- `POST /mcp` for MCP JSON-RPC requests.

Quick health check:

```bash
curl http://127.0.0.1:3333/health
```

## VS Code / GitHub Copilot

Add the server URL to `.vscode/mcp.json` in your workspace or to your user MCP configuration:

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

Notes:

- The HTTP runtime itself reads Lighthouse credentials from its own environment. You do not need to repeat `LIGHTHOUSE_API_KEY` in the VS Code MCP client configuration unless you add your own gateway or proxy in front of the MCP server.
- After saving `mcp.json`, start or restart the server from the MCP commands in VS Code.

## Claude Code

Add the server as a remote HTTP MCP endpoint:

```bash
claude mcp add --transport http --scope user \
  lighthouse http://127.0.0.1:3333/mcp
```

If your deployment sits behind an authenticated reverse proxy, add the required request headers there:

```bash
claude mcp add --transport http --scope user \
  --header "Authorization: Bearer replace-me" \
  lighthouse https://mcp.example.com/mcp
```

You can also commit a project-scoped `.mcp.json` file for Claude Code:

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

After adding the server, use `/mcp` in Claude Code to verify that it is connected.

## Docker Use Case

The HTTP package is the right fit when you want to run Lighthouse MCP as a small shared service for a team, a remote development environment, or a hosted AI setup where local stdio processes are inconvenient.

Run the published container image from GHCR:

```bash
docker run --rm \
  -p 3000:3000 \
  -e HOST=0.0.0.0 \
  -e PORT=3000 \
  -e LIGHTHOUSE_URL=https://lighthouse.example.com \
  -e LIGHTHOUSE_API_KEY=replace-me \
  ghcr.io/letpeoplework/lighthouse-clients/mcp-http:latest
```

Important details:

- Set `HOST=0.0.0.0` so the container is reachable outside the container namespace.
- Set `PORT=3000` to match the container's exposed port.
- Point clients at `http://<host>:3000/mcp`.

Example `docker-compose.yml` service:

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

Health check the running container:

```bash
curl http://127.0.0.1:3000/health
```

## When to Use HTTP vs stdio

Use `@letpeoplework/lighthouse-mcp-http` when you want one hosted MCP endpoint that many clients can connect to.

Use `@letpeoplework/lighthouse-mcp-stdio` when each developer should run Lighthouse tools locally inside their own MCP client process.
