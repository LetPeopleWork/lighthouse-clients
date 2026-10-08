import { existsSync } from "node:fs";
import {
  chmod,
  mkdir,
  readFile,
  rm,
  stat,
  utimes,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { aTempDirectory } from "../../../test-support/tempDirectories";
import {
  createFileVoterKeyStore,
  getVoterKeyScope,
  getVoterKeyStorePath,
  STANDALONE_VOTER_KEY_SCOPE,
} from "./index";

const canLockOthersOut =
  process.platform !== "win32" && process.getuid?.() !== 0;

const aMoment = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const aStoreFile = () =>
  join(aTempDirectory("lighthouse-voter-keys-"), "keys.json");

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
    expect(getVoterKeyStorePath({})).toBe(
      join(homedir(), ".config", "lighthouse-clients", "voter-keys.json"),
    );
  });

  it.each([
    { content: '{"version":1,"keys":null}' },
    { content: '{"version":1,"keys":"a-key"}' },
    { content: '{"version":1,"keys":{"standalone":42}}' },
    { content: '{"version":1}' },
    { content: "null" },
  ])(
    "keeps no key from a file whose keys it cannot read ($content), and saves none over it",
    async ({ content }) => {
      const filePath = aStoreFile();
      await writeFile(filePath, content, "utf8");

      expect(
        await createFileVoterKeyStore(filePath).load("standalone"),
      ).toBeNull();
      expect(
        await createFileVoterKeyStore(filePath).load(
          "HTTPS://Lighthouse.example:443/",
        ),
      ).toBeNull();
      await expect(
        createFileVoterKeyStore(filePath).save("standalone", "a-key"),
      ).rejects.toThrow(
        new Error(
          `The voter key file ${filePath} cannot be read; fix or remove it.`,
        ),
      );
      expect(await readFile(filePath, "utf8")).toBe(content);
    },
  );

  it("refuses to save where the file should be but something else is", async () => {
    const filePath = aStoreFile();
    await mkdir(filePath);

    expect(
      await createFileVoterKeyStore(filePath).load("standalone"),
    ).toBeNull();
    await expect(
      createFileVoterKeyStore(filePath).save("standalone", "a-key"),
    ).rejects.toThrow(
      new Error(
        `The voter key file ${filePath} cannot be read; fix or remove it.`,
      ),
    );
  });

  it("lets go of the lock when a save fails, so the next save is not kept waiting", async () => {
    const filePath = aStoreFile();
    await writeFile(filePath, "not json", "utf8");

    await expect(
      createFileVoterKeyStore(filePath).save("standalone", "a-key"),
    ).rejects.toThrow(
      new Error(
        `The voter key file ${filePath} cannot be read; fix or remove it.`,
      ),
    );

    expect(existsSync(`${filePath}.lock`)).toBe(false);
  });

  it("waits while another client holds the lock, and saves once it lets go", async () => {
    const filePath = aStoreFile();
    const lockPath = `${filePath}.lock`;
    await writeFile(lockPath, "", "utf8");

    const saving = createFileVoterKeyStore(filePath).save(
      "standalone",
      "a-key",
    );
    await aMoment(200);
    expect(existsSync(filePath)).toBe(false);

    await rm(lockPath);
    await saving;

    expect(await createFileVoterKeyStore(filePath).load("standalone")).toBe(
      "a-key",
    );
    expect(existsSync(lockPath)).toBe(false);
  });

  // @error
  it("gives up after a few seconds on a lock another client is still holding", async () => {
    const filePath = aStoreFile();
    const lockPath = `${filePath}.lock`;
    await writeFile(lockPath, "", "utf8");
    const startedAt = Date.now();

    await expect(
      createFileVoterKeyStore(filePath).save("standalone", "a-key"),
    ).rejects.toThrow(
      new Error(
        `The voter key file ${filePath} is in use by another lh or MCP server; try again.`,
      ),
    );

    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(4_500);
    expect(existsSync(lockPath)).toBe(true);
    expect(existsSync(filePath)).toBe(false);
  }, 15_000);

  // @error
  it.skipIf(!canLockOthersOut)(
    "fails at once, rather than waiting, when it may not write beside the file",
    async () => {
      const directory = aTempDirectory("lighthouse-voter-keys-");
      const filePath = join(directory, "keys.json");
      await chmod(directory, 0o500);

      try {
        await expect(
          createFileVoterKeyStore(filePath).save("standalone", "a-key"),
        ).rejects.toMatchObject({ code: "EACCES" });
      } finally {
        await chmod(directory, 0o700);
      }
    },
  );

  it.skipIf(!canLockOthersOut)(
    "still uses a key an earlier version kept when it cannot move it",
    async () => {
      const directory = aTempDirectory("lighthouse-voter-keys-");
      const filePath = join(directory, "keys.json");
      const earlierFile = JSON.stringify({
        version: 1,
        keys: { "HTTPS://Lighthouse.example:443": "the-old-key" },
      });
      await writeFile(filePath, earlierFile, "utf8");
      await chmod(directory, 0o500);

      try {
        expect(
          await createFileVoterKeyStore(filePath).load(
            "HTTPS://Lighthouse.example:443/",
          ),
        ).toBe("the-old-key");
      } finally {
        await chmod(directory, 0o700);
      }
      expect(await readFile(filePath, "utf8")).toBe(earlierFile);
    },
  );

  it("finds a key an earlier version kept under the URL given with spaces and several trailing slashes", async () => {
    const filePath = aStoreFile();
    await writeFile(
      filePath,
      JSON.stringify({
        version: 1,
        keys: { "HTTPS://Lighthouse.example:443": "the-old-key" },
      }),
      "utf8",
    );

    expect(
      await createFileVoterKeyStore(filePath).load(
        " HTTPS://Lighthouse.example:443// ",
      ),
    ).toBe("the-old-key");
  });

  it("moves a key an earlier version kept without touching the other Lighthouses' keys", async () => {
    const filePath = aStoreFile();
    await writeFile(
      filePath,
      JSON.stringify({
        version: 1,
        keys: {
          "HTTPS://Lighthouse.example:443": "the-old-key",
          standalone: "the-standalone-key",
        },
      }),
      "utf8",
    );

    await createFileVoterKeyStore(filePath).load(
      "HTTPS://Lighthouse.example:443",
    );

    expect(JSON.parse(await readFile(filePath, "utf8"))).toEqual({
      version: 1,
      keys: {
        standalone: "the-standalone-key",
        "https://lighthouse.example": "the-old-key",
      },
    });
  });

  it("keeps a Lighthouse that is no URL under its name as given, less trailing slashes", async () => {
    const store = createFileVoterKeyStore(aStoreFile());

    await store.save(" my-lighthouse// ", "the-key");

    expect(await store.load("my-lighthouse")).toBe("the-key");
  });
});

describe("the name a Lighthouse's voter key is kept under", () => {
  it.each([
    [STANDALONE_VOTER_KEY_SCOPE, "standalone"],
    [" standalone ", "standalone"],
    ["https://lighthouse.example/api", "https://lighthouse.example"],
    [
      "https://lighthouse.example/team-a/api/",
      "https://lighthouse.example/team-a",
    ],
    ["https://lighthouse.example/apis", "https://lighthouse.example/apis"],
    ["https://lighthouse.example/myapi", "https://lighthouse.example/myapi"],
    [
      "https://lighthouse.example/api/team-a",
      "https://lighthouse.example/api/team-a",
    ],
    ["my-lighthouse/", "my-lighthouse"],
  ])("keeps '%s' under %s", (lighthouse, scope) => {
    expect(getVoterKeyScope(lighthouse)).toBe(scope);
  });
});
