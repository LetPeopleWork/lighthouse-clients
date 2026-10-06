import { randomBytes } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

/**
 * The voter keys this machine keeps, one per Lighthouse. The command line and the local MCP server share
 * it, so a person is one voter on a Lighthouse whichever of the two they vote from, and either can take
 * back what the other cast.
 */
export type VoterKeyStore = {
  readonly load: (lighthouse: string) => Promise<string | null>;
  readonly save: (lighthouse: string, key: string) => Promise<void>;
};

/** The voter key a client keeps for the one Lighthouse it talks to. */
export type LighthouseVoterKeyStore = {
  readonly load: () => Promise<string | null>;
  readonly save: (key: string) => Promise<void>;
};

/** The part of a store that holds one Lighthouse's key. */
export const voterKeyStoreFor = (
  store: VoterKeyStore,
  lighthouse: string,
): LighthouseVoterKeyStore => ({
  load: () => store.load(lighthouse),
  save: (key) => store.save(lighthouse, key),
});

const MINTED_VOTER_KEY_BYTES = 32;

/** A fresh random voter key: 43 URL-safe characters from 32 random bytes. */
export const mintVoterKey = (): string =>
  randomBytes(MINTED_VOTER_KEY_BYTES).toString("base64url");

/** The key already kept, or on a client's first write a fresh one, minted and kept from then on. */
export const keepVoterKey = async (
  store: LighthouseVoterKeyStore,
): Promise<string> => {
  const kept = await store.load();
  if (kept !== null) {
    return kept;
  }
  const minted = mintVoterKey();
  await store.save(minted);
  return minted;
};

const VOTER_KEYS_FILE_NAME = "voter-keys.json";

/**
 * The name a standalone Lighthouse's key is kept under. The desktop app may come back on another port,
 * and it is still the same Lighthouse.
 */
export const STANDALONE_VOTER_KEY_SCOPE = "standalone";

/** Beside the command line's config file: `~/.config/lighthouse-clients/voter-keys.json` by default. */
export const getVoterKeyStorePath = (
  env: NodeJS.ProcessEnv = process.env,
): string => {
  const configDirectory =
    env.LIGHTHOUSE_CLI_CONFIG_PATH === undefined
      ? join(homedir(), ".config", "lighthouse-clients")
      : dirname(env.LIGHTHOUSE_CLI_CONFIG_PATH);
  return join(configDirectory, VOTER_KEYS_FILE_NAME);
};

type PersistedVoterKeys = {
  readonly version: 1;
  readonly keys: Readonly<Record<string, string>>;
};

const isKeyMap = (value: unknown): value is Readonly<Record<string, string>> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every((key) => typeof key === "string");

const readKeys = async (
  filePath: string,
): Promise<Readonly<Record<string, string>>> => {
  try {
    const parsed: unknown = JSON.parse(await readFile(filePath, "utf8"));
    const keys = (parsed as Partial<PersistedVoterKeys> | null)?.keys;
    return isKeyMap(keys) ? keys : {};
  } catch {
    return {};
  }
};

// "http://host:5000/" and "http://host:5000" are one Lighthouse, however each client was given its URL.
const scopeOf = (lighthouse: string): string =>
  lighthouse.trim().replace(/\/+$/u, "");

/** A voter key store kept in one JSON file, readable by its owner only. */
export const createFileVoterKeyStore = (filePath: string): VoterKeyStore => ({
  load: async (lighthouse) =>
    (await readKeys(filePath))[scopeOf(lighthouse)] ?? null,
  save: async (lighthouse, key) => {
    const persisted: PersistedVoterKeys = {
      version: 1,
      keys: { ...(await readKeys(filePath)), [scopeOf(lighthouse)]: key },
    };
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(persisted, null, 2), {
      encoding: "utf8",
      mode: 0o600,
    });
    await chmod(filePath, 0o600);
  },
});
