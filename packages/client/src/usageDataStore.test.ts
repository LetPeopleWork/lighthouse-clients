import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { aTempDirectory } from "../../../test-support/tempDirectories";
import { createFileUsageDataStore, type StoredUsageDataAnswer } from "./index";

const LIGHTHOUSE = "https://lighthouse.northwind.example";

const A_YES: StoredUsageDataAnswer = {
  answer: "yes",
  token: "lenas-token",
  confirmedAt: "2026-10-08T08:00:00.000Z",
};

const A_NO: StoredUsageDataAnswer = {
  answer: "no",
  decidedAt: "2026-10-08T08:01:00.000Z",
};

const anAnswersFile = () =>
  join(aTempDirectory("lighthouse-usage-data-"), "usage-data.json");

describe("the file usage data store", () => {
  it("keeps the first answer given and turns away a later one", async () => {
    const store = createFileUsageDataStore(anAnswersFile());

    const firstKept = await store.answer(LIGHTHOUSE, A_YES);
    const secondKept = await store.answer(LIGHTHOUSE, A_NO);

    expect([firstKept, secondKept]).toEqual([true, false]);
    expect(await store.read(LIGHTHOUSE)).toEqual(A_YES);
  });

  it("replaces whatever answer was kept", async () => {
    const store = createFileUsageDataStore(anAnswersFile());
    await store.answer(LIGHTHOUSE, A_YES);

    await store.replace(LIGHTHOUSE, A_NO);

    expect(await store.read(LIGHTHOUSE)).toEqual(A_NO);
  });

  it("drops a yes's token from the file when a No replaces it", async () => {
    const filePath = anAnswersFile();
    const store = createFileUsageDataStore(filePath);
    await store.answer(LIGHTHOUSE, A_YES);

    await store.replace(LIGHTHOUSE, A_NO);

    expect(await readFile(filePath, "utf8")).not.toContain("lenas-token");
  });

  it.each([
    "not json",
    '{"version":2,"answers":{}}',
    `{"version":1,"answers":[${JSON.stringify(A_NO)}]}`,
    '{"version":1,"answers":{"standalone":{"answer":"maybe"}}}',
  ])(
    "reads a file of another shape (%s) as unreadable and never writes over it",
    async (content) => {
      const filePath = anAnswersFile();
      await writeFile(filePath, content, "utf8");
      const store = createFileUsageDataStore(filePath);

      expect(await store.read(LIGHTHOUSE)).toBe("unreadable");
      await expect(store.answer(LIGHTHOUSE, A_YES)).rejects.toThrow(
        "cannot be read",
      );
      await expect(store.replace(LIGHTHOUSE, A_YES)).rejects.toThrow(
        "cannot be read",
      );
      await expect(store.renew(LIGHTHOUSE, A_YES.token, A_YES)).rejects.toThrow(
        "cannot be read",
      );
      expect(await readFile(filePath, "utf8")).toBe(content);
    },
  );
});

// Each child loads the store from source, as a separate lh would, and answers once. Node strips the types
// itself; the hook only adds the ".ts" the source's imports leave out.
const A_SEPARATE_CLIENT = `
import { registerHooks } from "node:module";
registerHooks({
  resolve: (specifier, context, next) => {
    try {
      return next(specifier, context);
    } catch (error) {
      if (specifier.startsWith(".")) {
        return next(specifier + ".ts", context);
      }
      throw error;
    }
  },
});
const [storeModule, filePath, lighthouse, answer] = process.argv.slice(2);
const { createFileUsageDataStore } = await import(storeModule);
const kept = await createFileUsageDataStore(filePath).answer(lighthouse, JSON.parse(answer));
process.stdout.write(String(kept));
`;

describe("two clients answering at the same moment", () => {
  it("keeps the answer of the one that recorded first, and the other is told it was not kept", async () => {
    const directory = aTempDirectory("lighthouse-usage-data-clients-");
    const filePath = join(directory, "usage-data.json");
    const client = join(directory, "client.mjs");
    await writeFile(client, A_SEPARATE_CLIENT, "utf8");
    const storeModule = new URL("./usageDataStore.ts", import.meta.url).href;
    const answerIn = async (answer: StoredUsageDataAnswer) =>
      (
        await promisify(execFile)(process.execPath, [
          client,
          storeModule,
          filePath,
          LIGHTHOUSE,
          JSON.stringify(answer),
        ])
      ).stdout;

    const [yesKept, noKept] = await Promise.all([
      answerIn(A_YES),
      answerIn(A_NO),
    ]);

    expect(new Set([yesKept, noKept])).toEqual(new Set(["true", "false"]));
    expect(await createFileUsageDataStore(filePath).read(LIGHTHOUSE)).toEqual(
      yesKept === "true" ? A_YES : A_NO,
    );
  });
});
