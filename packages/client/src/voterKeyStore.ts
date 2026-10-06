import { randomBytes } from "node:crypto";
import {
  chmod,
  mkdir,
  open,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";

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

const errorCodeOf = (error: unknown): string | undefined =>
  (error as NodeJS.ErrnoException | null)?.code;

const unreadableFile = (filePath: string): Error =>
  new Error(`The voter key file ${filePath} cannot be read; fix or remove it.`);

/** The keys in the file, none when there is no file yet, or null when the file is there but unreadable. */
const readKeys = async (filePath: string): Promise<KeyMap | null> => {
  let content: string;
  try {
    content = await readFile(filePath, "utf8");
  } catch (error: unknown) {
    return errorCodeOf(error) === "ENOENT" ? {} : null;
  }
  try {
    const keys = (JSON.parse(content) as Partial<PersistedVoterKeys> | null)
      ?.keys;
    return isKeyMap(keys) ? keys : null;
  } catch {
    return null;
  }
};

const OWNER_ONLY_FILE = 0o600;
const OWNER_ONLY_DIRECTORY = 0o700;

// A lock older than this was left by a client that died holding it; no save takes anywhere near as long.
const STALE_LOCK_MS = 10_000;
const LOCK_WAIT_LIMIT_MS = 5_000;
const FIRST_RETRY_MS = 5;
const LONGEST_RETRY_MS = 100;

const pause = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const isStale = async (lockPath: string): Promise<boolean> => {
  try {
    return Date.now() - (await stat(lockPath)).mtimeMs > STALE_LOCK_MS;
  } catch (error: unknown) {
    return errorCodeOf(error) === "ENOENT";
  }
};

const tryToTakeLock = async (lockPath: string): Promise<boolean> => {
  try {
    await (await open(lockPath, "wx", OWNER_ONLY_FILE)).close();
    return true;
  } catch (error: unknown) {
    if (errorCodeOf(error) === "EEXIST") {
      return false;
    }
    throw error;
  }
};

// One writer at a time across every process sharing the file: only one of them can create the lock file,
// and a writer that died holding it is outwaited rather than waited for forever.
const withLock = async (
  filePath: string,
  work: () => Promise<void>,
): Promise<void> => {
  const lockPath = `${filePath}.lock`;
  const giveUpAt = Date.now() + LOCK_WAIT_LIMIT_MS;
  let retryMs = FIRST_RETRY_MS;
  while (!(await tryToTakeLock(lockPath))) {
    if (await isStale(lockPath)) {
      await rm(lockPath, { force: true });
      continue;
    }
    if (Date.now() > giveUpAt) {
      throw new Error(
        `The voter key file ${filePath} is in use by another lh or MCP server; try again.`,
      );
    }
    await pause(retryMs);
    retryMs = Math.min(retryMs * 2, LONGEST_RETRY_MS);
  }
  try {
    await work();
  } finally {
    await rm(lockPath, { force: true });
  }
};

// Written beside the file and renamed over it, so a reader never sees half a file and a crash mid-write
// leaves the old one whole.
const writeKeysAtomically = async (
  filePath: string,
  keys: KeyMap,
): Promise<void> => {
  const persisted: PersistedVoterKeys = { version: 1, keys };
  const temporaryPath = join(
    dirname(filePath),
    `.${basename(filePath)}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`,
  );
  try {
    await writeFile(temporaryPath, JSON.stringify(persisted, null, 2), {
      encoding: "utf8",
      mode: OWNER_ONLY_FILE,
      flag: "wx",
    });
    await chmod(temporaryPath, OWNER_ONLY_FILE);
    await rename(temporaryPath, filePath);
  } catch (error: unknown) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
};

// Re-read under the lock, so a key another client saved a moment ago is kept rather than written over.
const saveKey = async (
  filePath: string,
  scope: string,
  key: string,
): Promise<void> => {
  await mkdir(dirname(filePath), {
    recursive: true,
    mode: OWNER_ONLY_DIRECTORY,
  });
  await withLock(filePath, async () => {
    const kept = await readKeys(filePath);
    if (kept === null) {
      throw unreadableFile(filePath);
    }
    await writeKeysAtomically(filePath, { ...kept, [scope]: key });
  });
};

// "http://host:5000/" and "http://host:5000" are one Lighthouse, however each client was given its URL.
const scopeOf = (lighthouse: string): string =>
  lighthouse.trim().replace(/\/+$/u, "");

/**
 * A voter key store kept in one JSON file, readable by its owner only. A file it cannot read is never
 * written over: it may hold the keys a person's earlier votes were cast with.
 */
export const createFileVoterKeyStore = (filePath: string): VoterKeyStore => ({
  load: async (lighthouse) =>
    (await readKeys(filePath))?.[scopeOf(lighthouse)] ?? null,
  save: (lighthouse, key) => saveKey(filePath, scopeOf(lighthouse), key),
});
