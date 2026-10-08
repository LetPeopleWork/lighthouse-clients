import { dirname, join } from "node:path";
import {
  type OwnerOnlyJsonFileFormat,
  ownerOnlyJsonFile,
} from "./ownerOnlyJsonFile";
import {
  readStoredUsageDataAnswer,
  type StoredUsageDataAnswer,
} from "./usageData";
import { getVoterKeyScope, getVoterKeyStorePath } from "./voterKeyStore";

/** The answer kept for a Lighthouse, undefined when never asked there, or "unreadable" when the file is not ours. */
export type UsageDataStoreReading =
  | StoredUsageDataAnswer
  | undefined
  | "unreadable";

/**
 * The usage data answers this machine keeps, one per Lighthouse, shared by the command line and the local
 * MCP server. A separate file from the voter keys, so a client that only knows the voter keys never writes
 * an answer away.
 */
export type UsageDataStore = {
  readonly read: (lighthouse: string) => Promise<UsageDataStoreReading>;
  /** Keeps a question's answer only if none is kept yet: the first answer wins. True when it was kept. */
  readonly answer: (
    lighthouse: string,
    answer: StoredUsageDataAnswer,
  ) => Promise<boolean>;
  /** Keeps the answer whatever was kept before. */
  readonly replace: (
    lighthouse: string,
    answer: StoredUsageDataAnswer,
  ) => Promise<void>;
  /** Replaces a yes only while it still holds `token`. True when it was replaced. */
  readonly renew: (
    lighthouse: string,
    token: string,
    answer: StoredUsageDataAnswer,
  ) => Promise<boolean>;
};

/** The part of a store that holds one Lighthouse's answer. */
export type LighthouseUsageDataStore = {
  readonly read: () => Promise<UsageDataStoreReading>;
  readonly answer: (answer: StoredUsageDataAnswer) => Promise<boolean>;
  readonly replace: (answer: StoredUsageDataAnswer) => Promise<void>;
  readonly renew: (
    token: string,
    answer: StoredUsageDataAnswer,
  ) => Promise<boolean>;
};

export const usageDataStoreFor = (
  store: UsageDataStore,
  lighthouse: string,
): LighthouseUsageDataStore => ({
  read: () => store.read(lighthouse),
  answer: (answer) => store.answer(lighthouse, answer),
  replace: (answer) => store.replace(lighthouse, answer),
  renew: (token, answer) => store.renew(lighthouse, token, answer),
});

const USAGE_DATA_FILE_NAME = "usage-data.json";

/** Beside the voter keys: `~/.config/lighthouse-clients/usage-data.json` by default. */
export const getUsageDataStorePath = (
  env: NodeJS.ProcessEnv = process.env,
): string => join(dirname(getVoterKeyStorePath(env)), USAGE_DATA_FILE_NAME);

type Answers = Readonly<Record<string, StoredUsageDataAnswer>>;

const readAnswers = (value: unknown): Answers | null => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const answers: Record<string, StoredUsageDataAnswer> = {};
  for (const [scope, kept] of Object.entries(value)) {
    const answer = readStoredUsageDataAnswer(kept);
    if (answer === null) {
      return null;
    }
    answers[scope] = answer;
  }
  return answers;
};

const usageDataFormat: OwnerOnlyJsonFileFormat<Answers> = {
  name: "usage data file",
  empty: {},
  parse: (json) => {
    const persisted = json as { version?: unknown; answers?: unknown } | null;
    return persisted?.version === 1 ? readAnswers(persisted.answers) : null;
  },
  serialize: (answers) => ({ version: 1, answers }),
};

/** A usage data store kept in one JSON file, readable by its owner only, never written over when unreadable. */
export const createFileUsageDataStore = (filePath: string): UsageDataStore => {
  const file = ownerOnlyJsonFile(filePath, usageDataFormat);
  return {
    read: async (lighthouse) => {
      const answers = await file.read();
      return answers === null
        ? "unreadable"
        : answers[getVoterKeyScope(lighthouse)];
    },
    answer: (lighthouse, answer) => {
      const scope = getVoterKeyScope(lighthouse);
      return file.updateIfChanged((kept) =>
        kept[scope] === undefined ? { ...kept, [scope]: answer } : kept,
      );
    },
    replace: async (lighthouse, answer) => {
      await file.update((kept) => ({
        ...kept,
        [getVoterKeyScope(lighthouse)]: answer,
      }));
    },
    renew: (lighthouse, token, answer) => {
      const scope = getVoterKeyScope(lighthouse);
      return file.updateIfChanged((kept) => {
        const current = kept[scope];
        return current?.answer === "yes" && current.token === token
          ? { ...kept, [scope]: answer }
          : kept;
      });
    },
  };
};
