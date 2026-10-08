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
import { basename, dirname, join } from "node:path";

/** How one kind of owner-only file is named in messages, and how its content is read and written. */
export type OwnerOnlyJsonFileFormat<Content> = {
  /** How messages name the file, as in "The voter key file … cannot be read". */
  readonly name: string;
  /** The content when there is no file yet. */
  readonly empty: Content;
  /** The content of parsed JSON, or null when it is not this format. */
  readonly parse: (json: unknown) => Content | null;
  /** The JSON the content is written as. */
  readonly serialize: (content: Content) => unknown;
};

/**
 * A JSON file readable by its owner only, shared by every lh and MCP server on the machine. A file it cannot
 * read is never written over: it may hold what a person cannot get back.
 */
export type OwnerOnlyJsonFile<Content> = {
  /** The content, the empty content when there is no file yet, or null when the file is there but unreadable. */
  readonly read: () => Promise<Content | null>;
  /** Writes what `change` makes of the content kept at that moment, one writer at a time. */
  readonly update: (change: (kept: Content) => Content) => Promise<void>;
};

const errorCodeOf = (error: unknown): string | undefined =>
  (error as NodeJS.ErrnoException | null)?.code;

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
  name: string,
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
        `The ${name} ${filePath} is in use by another lh or MCP server; try again.`,
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
const writeAtomically = async (
  filePath: string,
  json: unknown,
): Promise<void> => {
  const temporaryPath = join(
    dirname(filePath),
    `.${basename(filePath)}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`,
  );
  try {
    await writeFile(temporaryPath, JSON.stringify(json, null, 2), {
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

const readContent = async <Content>(
  filePath: string,
  format: OwnerOnlyJsonFileFormat<Content>,
): Promise<Content | null> => {
  let text: string;
  try {
    text = await readFile(filePath, "utf8");
  } catch (error: unknown) {
    return errorCodeOf(error) === "ENOENT" ? format.empty : null;
  }
  try {
    return format.parse(JSON.parse(text));
  } catch {
    return null;
  }
};

// Re-read under the lock, so what another client wrote a moment ago is kept rather than written over.
const updateContent = async <Content>(
  filePath: string,
  format: OwnerOnlyJsonFileFormat<Content>,
  change: (kept: Content) => Content,
): Promise<void> => {
  await mkdir(dirname(filePath), {
    recursive: true,
    mode: OWNER_ONLY_DIRECTORY,
  });
  await withLock(filePath, format.name, async () => {
    const kept = await readContent(filePath, format);
    if (kept === null) {
      throw new Error(
        `The ${format.name} ${filePath} cannot be read; fix or remove it.`,
      );
    }
    await writeAtomically(filePath, format.serialize(change(kept)));
  });
};

export const ownerOnlyJsonFile = <Content>(
  filePath: string,
  format: OwnerOnlyJsonFileFormat<Content>,
): OwnerOnlyJsonFile<Content> => ({
  read: () => readContent(filePath, format),
  update: (change) => updateContent(filePath, format, change),
});
