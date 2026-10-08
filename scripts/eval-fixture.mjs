#!/usr/bin/env node
// A Lighthouse that answers from one static fixture file, for running a skill's eval cases by hand:
//   node scripts/eval-fixture.mjs skills/<skill>/evals/fixtures/<fixture>.json
// It prints the address to point MCP or lh at, answers each request by method and path (the query is
// ignored), answers 404 to anything the fixture does not list, and prints every request it receives.

import { readFileSync } from "node:fs";
import { createServer } from "node:http";

const VERSION_ROUTE = "GET /api/v1/version/current";

const fixturePath = process.argv[2];
if (fixturePath === undefined) {
  process.stderr.write("usage: node scripts/eval-fixture.mjs <fixture.json>\n");
  process.exit(2);
}

const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
const routes = new Map(Object.entries(fixture.routes ?? {}));

const routeOf = (request) =>
  `${request.method} ${(request.url ?? "").split("?")[0]}`;

const answer = (route, response) => {
  if (route === VERSION_ROUTE) {
    response.writeHead(200, { "Content-Type": "text/plain" });
    response.end(String(fixture.version));
    return;
  }
  if (!routes.has(route)) {
    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "not in the fixture", route }));
    return;
  }
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify(routes.get(route)));
};

const server = createServer((request, response) => {
  process.stdout.write(`${request.method} ${request.url}\n`);
  request.resume();
  request.on("end", () => answer(routeOf(request), response));
});

server.listen(0, "127.0.0.1", () => {
  const { port } = server.address();
  process.stdout.write(
    `Lighthouse fixture listening on http://127.0.0.1:${port}\n`,
  );
});
