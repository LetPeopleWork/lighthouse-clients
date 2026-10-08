import { describe, expect, it } from "vitest";
import { nameOrFallback, readFeatureWording } from "./answerWording";
import { SEEDED_TERMS } from "./terminology";

const team3 = { term: "team", id: 3 } as const;

describe("nameOrFallback", () => {
  it("names the subject by the name its read answered with", () => {
    expect(
      nameOrFallback(
        { ok: true, value: { name: "Gravity" } },
        team3,
        SEEDED_TERMS,
      ),
    ).toBe("Gravity");
  });

  it.each([
    ["nothing", null],
    ["a bare text", "Gravity"],
    ["an empty name", { name: "" }],
    ["a name that is not text", { name: 3 }],
    ["no name", { id: 3 }],
  ])(
    "falls back to the term and id when the read answered with %s",
    (_case, value) => {
      expect(nameOrFallback({ ok: true, value }, team3, SEEDED_TERMS)).toBe(
        "Team [id: 3]",
      );
    },
  );
});

describe("readFeatureWording", () => {
  it("reads the Feature it is about by its id", async () => {
    const asked: (readonly number[])[] = [];
    const source = {
      getTerminology: async () => ({ ok: true as const, value: [] }),
      getFeaturesByIds: async (ids: readonly number[]) => {
        asked.push(ids);
        return {
          ok: true as const,
          value: [{ referenceId: "OE-002", name: "Deep-sea camera stream" }],
        };
      },
    };

    const wording = await readFeatureWording(source as never, 2);

    expect(asked).toEqual([[2]]);
    expect(wording.name).toBe("OE-002 Deep-sea camera stream");
  });
});
