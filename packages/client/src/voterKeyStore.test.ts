import { mkdtempSync } from "node:fs";
import { stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createFileVoterKeyStore, getVoterKeyStorePath } from "./index";

const aStoreFile = () =>
  join(mkdtempSync(join(tmpdir(), "lighthouse-voter-keys-")), "keys.json");

describe("the file voter key store", () => {
  it("keeps one key per Lighthouse, readable by its owner only", async () => {
    const filePath = aStoreFile();
    const store = createFileVoterKeyStore(filePath);

    await store.save("http://localhost:5000", "first-key");
    await store.save("standalone", "second-key");

    expect(await store.load("http://localhost:5000")).toBe("first-key");
    expect(await store.load("standalone")).toBe("second-key");
    expect(await store.load("http://elsewhere:5000")).toBeNull();
    expect((await stat(filePath)).mode & 0o777).toBe(0o600);
  });

  it("keeps no key when the file is missing or unreadable", async () => {
    const filePath = aStoreFile();
    expect(
      await createFileVoterKeyStore(filePath).load("standalone"),
    ).toBeNull();

    await writeFile(filePath, "not json", "utf8");
    expect(
      await createFileVoterKeyStore(filePath).load("standalone"),
    ).toBeNull();
  });

  it("lives beside the command line's config file", () => {
    expect(
      getVoterKeyStorePath({
        LIGHTHOUSE_CLI_CONFIG_PATH: "/home/ana/lh/cli-config.json",
      }),
    ).toBe(join("/home/ana/lh", "voter-keys.json"));
    expect(getVoterKeyStorePath({})).toMatch(
      /lighthouse-clients[/\\]voter-keys\.json$/u,
    );
  });
});
