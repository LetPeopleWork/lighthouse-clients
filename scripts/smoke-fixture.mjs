#!/usr/bin/env node
/**
 * smoke-fixture.mjs — Lightweight HTTP fixture server for CLI smoke tests.
 *
 * Serves the minimal set of endpoints the Lighthouse CLI exercises when
 * running `lh connection connect` followed by `lh team list`.
 *
 * Usage:
 *   node scripts/smoke-fixture.mjs
 *
 * The listening port is written to:
 *   - .fixture-port          (file in the working directory)
 *   - $GITHUB_OUTPUT         (when running inside GitHub Actions)
 *
 * The process exits automatically after FIXTURE_TIMEOUT_MS milliseconds
 * (default: 120 000) so it never hangs CI indefinitely.
 */

import { appendFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";

const TIMEOUT_MS = Number.parseInt(
  process.env.FIXTURE_TIMEOUT_MS ?? "120000",
  10,
);

const ROUTES = new Map([
  [
    "GET /api/v1/version/current",
    (res) => {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("1.0.0");
    },
  ],
  [
    "GET /api/v1/auth/mode",
    (res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ mode: "disabled" }));
    },
  ],
  [
    "GET /api/v1/teams",
    (res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify([
          { id: 1, name: "FixtureTeam", featureWIP: 0, totalFeatures: 0 },
        ]),
      );
    },
  ],
]);

const server = createServer((req, res) => {
  const key = `${req.method} ${req.url}`;
  const handler = ROUTES.get(key);
  if (handler) {
    handler(res);
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not found", route: key }));
  }
});

server.listen(0, "127.0.0.1", () => {
  const { port } = server.address();

  // Write port for CI orchestration
  writeFileSync(".fixture-port", String(port));
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `fixture_port=${port}\n`);
  }

  process.stdout.write(`Fixture listening on http://127.0.0.1:${port}\n`);
});

// Self-terminate after TIMEOUT_MS to avoid hanging CI.
setTimeout(() => {
  process.stdout.write("Fixture timeout reached — shutting down.\n");
  server.close();
  process.exit(0);
}, TIMEOUT_MS).unref();
