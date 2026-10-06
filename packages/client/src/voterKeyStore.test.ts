import { mkdtempSync } from "node:fs";
import { chmod, readFile, stat, utimes, writeFile } from "node:fs/promises";
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

  it("finds a Lighthouse's key whether its URL was given with a trailing slash or not", async () => {
    const store = createFileVoterKeyStore(aStoreFile());

    await store.save("http://localhost:5000/", "the-key");

    expect(await store.load("http://localhost:5000")).toBe("the-key");
  });

  it.each([
    "https://lighthouse.example",
    "https://lighthouse.example/",
    "https://LIGHTHOUSE.example:443",
    "https://lighthouse.example/api",
    " https://lighthouse.example/api/ ",
  ])(
    "finds the key saved under HTTPS://Lighthouse.example:443/ when the same Lighthouse is given as '%s'",
    async (sameLighthouse) => {
      const store = createFileVoterKeyStore(aStoreFile());

      await store.save("HTTPS://Lighthouse.example:443/", "the-key");

      expect(await store.load(sameLighthouse)).toBe("the-key");
      expect(await store.load("https://lighthouse.example:8443")).toBeNull();
      expect(await store.load("http://lighthouse.example")).toBeNull();
    },
  );

  it("keeps the standalone Lighthouse's key apart from every server's", async () => {
    const store = createFileVoterKeyStore(aStoreFile());

    await store.save("standalone", "the-standalone-key");

    expect(await store.load(" standalone ")).toBe("the-standalone-key");
    expect(await store.load("http://localhost:5000")).toBeNull();
  });

  it("finds a key an earlier version kept under the URL as given, and keeps it from then on under the Lighthouse it names", async () => {
    const filePath = aStoreFile();
    await writeFile(
      filePath,
      JSON.stringify({
        version: 1,
        keys: { "HTTPS://Lighthouse.example:443": "the-old-key" },
      }),
      "utf8",
    );

    const store = createFileVoterKeyStore(filePath);

    expect(await store.load("HTTPS://Lighthouse.example:443/")).toBe(
      "the-old-key",
    );
    expect(await store.load("https://lighthouse.example")).toBe("the-old-key");
    expect(JSON.parse(await readFile(filePath, "utf8"))).toEqual({
      version: 1,
      keys: { "https://lighthouse.example": "the-old-key" },
    });
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

  it("keeps every key when several clients save their first key at once", async () => {
    const filePath = aStoreFile();
    const lighthouses = [
      "http://localhost:5000",
      "http://lighthouse.example:5000",
      "https://lighthouse.example",
      "standalone",
    ];

    await Promise.all(
      lighthouses.map((lighthouse, index) =>
        createFileVoterKeyStore(filePath).save(lighthouse, `key-${index}`),
      ),
    );

    const store = createFileVoterKeyStore(filePath);
    for (const [index, lighthouse] of lighthouses.entries()) {
      expect(await store.load(lighthouse)).toBe(`key-${index}`);
    }
  });

  // @error
  it.each([
    { content: "not json" },
    { content: '{"version":1,"keys":["a list"]}' },
  ])(
    "refuses to save over a file it cannot read ($content), and leaves it as it was",
    async ({ content }) => {
      const filePath = aStoreFile();
      await writeFile(filePath, content, "utf8");

      await expect(
        createFileVoterKeyStore(filePath).save("standalone", "a-key"),
      ).rejects.toThrow(
        `The voter key file ${filePath} cannot be read; fix or remove it.`,
      );

      expect(await readFile(filePath, "utf8")).toBe(content);
    },
  );

  it.skipIf(process.platform === "win32")(
    "makes a file others could read its owner's alone when it saves",
    async () => {
      const filePath = aStoreFile();
      await writeFile(filePath, '{"version":1,"keys":{}}', "utf8");
      await chmod(filePath, 0o644);

      await createFileVoterKeyStore(filePath).save("standalone", "a-key");

      expect((await stat(filePath)).mode & 0o777).toBe(0o600);
    },
  );

  it("saves past a lock another client left behind long ago", async () => {
    const filePath = aStoreFile();
    const lockPath = `${filePath}.lock`;
    await writeFile(lockPath, "", "utf8");
    const longAgo = new Date(Date.now() - 60 * 60 * 1000);
    await utimes(lockPath, longAgo, longAgo);

    await createFileVoterKeyStore(filePath).save("standalone", "a-key");

    expect(await createFileVoterKeyStore(filePath).load("standalone")).toBe(
      "a-key",
    );
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
