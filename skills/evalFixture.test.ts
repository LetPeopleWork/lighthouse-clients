// The Lighthouse an eval case runs against: one static file served by `node scripts/eval-fixture.mjs`, so a
// case means the same thing next month and every write an assistant attempts shows in the request log. It is
// started the way the maintainer starts it, as its own process on a real port.

import { type ChildProcess, spawn } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  aMachine,
  connectedTo,
  lhOn,
  NO_TERMINAL,
} from "../packages/cli/test-support/lhSession";
import { aTempDirectory } from "../test-support/tempDirectories";

const REPOSITORY = new URL("..", import.meta.url).pathname;
const SERVER = join(REPOSITORY, "scripts", "eval-fixture.mjs");

const running: ChildProcess[] = [];

afterEach(() => {
  for (const server of running.splice(0)) {
    server.kill();
  }
});

type FixtureServer = {
  /** Where it listens, or null when it stopped before saying so. */
  readonly url: string | null;
  /** Everything it printed so far. */
  readonly printed: () => string;
};

const serving = async (fixturePath: string): Promise<FixtureServer> => {
  const server = spawn(process.execPath, [SERVER, fixturePath], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  running.push(server);
  let printed = "";
  server.stdout?.on("data", (chunk) => {
    printed += String(chunk);
  });
  const url = await new Promise<string | null>((resolve) => {
    const timer = setTimeout(() => resolve(null), 5000);
    const look = () => {
      const found = /http:\/\/(?:127\.0\.0\.1|localhost):\d+/u.exec(printed);
      if (found !== null) {
        clearTimeout(timer);
        resolve(found[0]);
      }
    };
    server.stdout?.on("data", look);
    server.on("exit", () => {
      clearTimeout(timer);
      resolve(null);
    });
  });
  return { url, printed: () => printed };
};

const aFixture = (fixture: unknown): string => {
  const path = join(aTempDirectory("lighthouse-eval-fixture-"), "fixture.json");
  writeFileSync(path, JSON.stringify(fixture));
  return path;
};

const GRAVITY = { name: "Gravity", id: 3 };

// The general skill moves from skill/ to skills/lighthouse/ and takes its evals with it.
const northwindFixture = (): string =>
  ["skills/lighthouse", "skill"]
    .map((folder) =>
      join(REPOSITORY, folder, "evals", "fixtures", "northwind.json"),
    )
    .find((path) => existsSync(path)) ?? "";

describe("the eval fixture server plays the Lighthouse a fixture describes", () => {
  // @real-io @adapter-integration @contract-shape:bounded-change
  it.skip("answers a listed read with the fixture's body, whatever its query", async () => {
    const lighthouse = await serving(
      aFixture({
        version: "v26.10.8.1",
        routes: { "GET /api/v1/teams/3": GRAVITY },
      }),
    );
    expect(lighthouse.url).not.toBeNull();

    const response = await fetch(
      `${lighthouse.url}/api/v1/teams/3?asOfDate=2026-10-08`,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(GRAVITY);
  });

  // @real-io @adapter-integration @contract-shape:bounded-change
  // The version decides which reads a client lets through, so an older Lighthouse is one field away.
  it.skip("reports the fixture's version as its own", async () => {
    const lighthouse = await serving(
      aFixture({ version: "v26.9.9.9", routes: {} }),
    );
    expect(lighthouse.url).not.toBeNull();

    const response = await fetch(`${lighthouse.url}/api/v1/version/current`);

    expect(response.status).toBe(200);
    expect((await response.text()).trim()).toBe("v26.9.9.9");
  });

  // @error @real-io @adapter-integration @contract-shape:bounded-change
  // A read the fixture forgot must be visible, not answered with something made up.
  it.skip("answers 404 to a route the fixture does not list, and prints that request", async () => {
    const lighthouse = await serving(
      aFixture({ version: "v26.10.8.1", routes: {} }),
    );
    expect(lighthouse.url).not.toBeNull();

    const response = await fetch(
      `${lighthouse.url}/api/v1/teams/3/metrics/sleRisk`,
    );

    expect(response.status).toBe(404);
    expect(lighthouse.printed()).toContain(
      "GET /api/v1/teams/3/metrics/sleRisk",
    );
  });

  // @error @real-io @adapter-integration @contract-shape:bounded-change
  // "No vote before the person confirmed" is scored from this log, so every write has to appear in it.
  it.skip("prints every write it receives", async () => {
    const vote = "POST /api/v1/teams/3/refinement/work-items/GR-051/votes";
    const lighthouse = await serving(
      aFixture({ version: "v26.10.8.1", routes: { [vote]: {} } }),
    );
    expect(lighthouse.url).not.toBeNull();

    await fetch(
      `${lighthouse.url}/api/v1/teams/3/refinement/work-items/GR-051/votes`,
      { method: "POST", body: JSON.stringify({ answer: "Yes" }) },
    );

    expect(lighthouse.printed()).toContain(vote);
  });

  // @real-io @adapter-integration @contract-shape:bounded-change
  // The general skill's own fixture, read by lh as an assistant would read it.
  it.skip("serves the general skill's Northwind fixture to lh, which reads Gravity's Work Items in progress from it", async () => {
    const lighthouse = await serving(northwindFixture());
    expect(lighthouse.url).not.toBeNull();
    const priya = await connectedTo(aMachine(), lighthouse.url ?? "");

    const run = await lhOn(priya, {
      terminal: NO_TERMINAL,
      env: { DO_NOT_TRACK: "1" },
    }).run(["metrics", "team", "--id", "3", "--metrics", "wip", "--json"]);

    expect(run.exitCode).toBe(0);
    expect(JSON.parse(run.stdout).wip.current.count).toBe(8);
  });
});
