import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { aTempDirectory } from "../../../test-support/tempDirectories";
import { createFileVoterKeyStore } from "./index";

const failing = vi.hoisted(() => ({
  step: null as "writing" | "renaming" | null,
}));

const theDiskIsFull = () =>
  Object.assign(new Error("the disk is full"), { code: "ENOSPC" });

// A full disk, or a file another program holds, can stop a save while it writes the new file or while it
// puts that file in place of the old one.
vi.mock("node:fs/promises", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...original,
    writeFile: async (...args: Parameters<typeof original.writeFile>) => {
      if (failing.step === "writing") {
        throw theDiskIsFull();
      }
      return original.writeFile(...args);
    },
    rename: async (...args: Parameters<typeof original.rename>) => {
      if (failing.step === "renaming") {
        throw theDiskIsFull();
      }
      return original.rename(...args);
    },
  };
});

describe("a save that fails while writing the voter key file", () => {
  afterEach(() => {
    failing.step = null;
  });

  it.each(["writing", "renaming"] as const)(
    "says why, and leaves the file it had as it was with nothing of its own beside it, when %s fails",
    async (step) => {
      const directory = aTempDirectory("lighthouse-voter-keys-");
      const filePath = join(directory, "keys.json");
      const keptFile = JSON.stringify({
        version: 1,
        keys: { standalone: "the-kept-key" },
      });
      await writeFile(filePath, keptFile, "utf8");
      failing.step = step;

      await expect(
        createFileVoterKeyStore(filePath).save("standalone", "a-new-key"),
      ).rejects.toMatchObject({ message: "the disk is full", code: "ENOSPC" });

      failing.step = null;
      expect(await readFile(filePath, "utf8")).toBe(keptFile);
      expect(await readdir(directory)).toEqual(["keys.json"]);
    },
  );

  it("leaves nothing but the file after a save that works", async () => {
    const directory = aTempDirectory("lighthouse-voter-keys-");
    const filePath = join(directory, "keys.json");

    await createFileVoterKeyStore(filePath).save("standalone", "a-key");

    expect(await readdir(directory)).toEqual(["keys.json"]);
  });
});
