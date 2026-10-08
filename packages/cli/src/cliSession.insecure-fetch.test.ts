import * as undiciModule from "undici";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { aFakeLighthouse } from "../../../test-support/fakeLighthouse";
import { aMachine, lhOn, NO_TERMINAL } from "../test-support/lhSession";

// Whether lh checks a server's TLS certificate is decided by the connection it saved: only a connection
// saved with --insecure goes through the dispatcher that skips the check.

vi.mock("undici", async (importOriginal) => {
  const mod = await importOriginal<typeof import("undici")>();
  const OriginalAgent = mod.Agent;
  return {
    ...mod,
    Agent: vi.fn(class extends OriginalAgent {}),
    fetch: vi.fn(mod.fetch),
  };
});

const dispatchersUsed = () =>
  vi
    .mocked(undiciModule.fetch)
    .mock.calls.map(
      (call) => (call[1] as { dispatcher?: unknown } | undefined)?.dispatcher,
    );

// lh builds its dispatchers when it loads, before any test runs, so they are read once here.
const dispatchersBuilt = vi
  .mocked(undiciModule.Agent)
  .mock.calls.map((call) => call[0]);
const theInsecureDispatcher = vi.mocked(undiciModule.Agent).mock.instances[0];

const connectAndListTeams = async (insecure: boolean) => {
  const lighthouse = await aFakeLighthouse();
  const machine = aMachine();
  const lh = lhOn(machine, { terminal: NO_TERMINAL });
  await lh.run([
    "connection",
    "connect",
    "--mode",
    "server",
    "--url",
    lighthouse.url,
    ...(insecure ? ["--insecure"] : []),
  ]);
  vi.mocked(undiciModule.fetch).mockClear();
  await lh.run(["team", "list"]);
  return lighthouse;
};

describe("lh and the server's TLS certificate", () => {
  beforeEach(() => {
    vi.mocked(undiciModule.fetch).mockClear();
  });

  it("builds one dispatcher that skips certificate verification", () => {
    expect(dispatchersBuilt).toEqual([
      { connect: { rejectUnauthorized: false } },
    ]);
  });

  it("checks the certificate of a connection saved without --insecure", async () => {
    const lighthouse = await connectAndListTeams(false);

    expect(lighthouse.requests().length).toBeGreaterThan(0);
    expect(dispatchersUsed().length).toBeGreaterThan(0);
    expect(dispatchersUsed().every((used) => used === undefined)).toBe(true);
  });

  it("skips the check for a connection saved with --insecure", async () => {
    await connectAndListTeams(true);

    expect(theInsecureDispatcher).toBeDefined();
    expect(dispatchersUsed().length).toBeGreaterThan(0);
    expect(
      dispatchersUsed().every((used) => used === theInsecureDispatcher),
    ).toBe(true);
  });
});
