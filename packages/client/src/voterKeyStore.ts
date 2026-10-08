import { randomBytes } from "node:crypto";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { getNormalizedLighthouseUrl } from "./lighthouseUrl";
import {
  type OwnerOnlyJsonFile,
  type OwnerOnlyJsonFileFormat,
  ownerOnlyJsonFile,
} from "./ownerOnlyJsonFile";

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

type KeyMap = Readonly<Record<string, string>>;

type PersistedVoterKeys = {
  readonly version: 1;
  readonly keys: KeyMap;
};

const isKeyMap = (value: unknown): value is KeyMap =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every((key) => typeof key === "string");

const voterKeysFormat: OwnerOnlyJsonFileFormat<KeyMap> = {
  name: "voter key file",
  empty: {},
  parse: (json) => {
    const keys = (json as Partial<PersistedVoterKeys> | null)?.keys;
    return isKeyMap(keys) ? keys : null;
  },
  serialize: (keys): PersistedVoterKeys => ({ version: 1, keys }),
};

const voterKeysFile = (filePath: string): OwnerOnlyJsonFile<KeyMap> =>
  ownerOnlyJsonFile(filePath, voterKeysFormat);

// How earlier versions named a Lighthouse: the URL as each client was given it, less trailing slashes.
const legacyScopeOf = (lighthouse: string): string =>
  lighthouse.trim().replace(/\/+$/u, "");

const API_PATH = /\/api$/u;

/**
 * The name a Lighthouse's voter key is kept under: `standalone` for the desktop app, otherwise the server
 * as the client reaches it, so `HTTPS://Lighthouse.example:443/` and `https://lighthouse.example/api` are
 * one Lighthouse and one voter, whether `lh` or the local MCP server was given the URL.
 */
export const getVoterKeyScope = (lighthouse: string): string => {
  if (lighthouse.trim() === STANDALONE_VOTER_KEY_SCOPE) {
    return STANDALONE_VOTER_KEY_SCOPE;
  }
  const normalized = getNormalizedLighthouseUrl(lighthouse);
  return normalized === null
    ? legacyScopeOf(lighthouse)
    : normalized.replace(API_PATH, "");
};

const withoutKey = (keys: KeyMap, scope: string): KeyMap =>
  Object.fromEntries(Object.entries(keys).filter(([kept]) => kept !== scope));

// A key kept under an earlier version's spelling moves to the Lighthouse's own name the first time it is
// read, so nobody becomes a second voter by upgrading. When it cannot move, it is still the key to use.
const moveLegacyKey = async (
  filePath: string,
  legacyScope: string,
  scope: string,
  key: string,
): Promise<void> => {
  try {
    await voterKeysFile(filePath).update((kept) => ({
      ...withoutKey(kept, legacyScope),
      [scope]: kept[scope] ?? key,
    }));
  } catch {
    // The key is returned all the same; the move is tried again on the next read.
  }
};

const loadKey = async (
  filePath: string,
  lighthouse: string,
): Promise<string | null> => {
  const keys = await voterKeysFile(filePath).read();
  const scope = getVoterKeyScope(lighthouse);
  const kept = keys?.[scope];
  if (kept !== undefined) {
    return kept;
  }
  const legacyScope = legacyScopeOf(lighthouse);
  const legacyKey = legacyScope === scope ? undefined : keys?.[legacyScope];
  if (legacyKey === undefined) {
    return null;
  }
  await moveLegacyKey(filePath, legacyScope, scope, legacyKey);
  return legacyKey;
};

/**
 * A voter key store kept in one JSON file, readable by its owner only. A file it cannot read is never
 * written over: it may hold the keys a person's earlier votes were cast with.
 */
export const createFileVoterKeyStore = (filePath: string): VoterKeyStore => ({
  load: (lighthouse) => loadKey(filePath, lighthouse),
  save: (lighthouse, key) =>
    voterKeysFile(filePath).update((kept) => ({
      ...kept,
      [getVoterKeyScope(lighthouse)]: key,
    })),
});
