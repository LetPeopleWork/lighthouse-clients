import { describe, expect, it } from "vitest";
import { readTerms, resolveTerms, SEEDED_TERMS } from "./terminology";

const entry = (key: string, value: string, defaultValue: string) => ({
  id: 1,
  key,
  description: "",
  defaultValue,
  value,
});

describe("resolveTerms", () => {
  it.each([
    { value: "Ticket", defaultValue: "Story", says: "Ticket" },
    { value: "", defaultValue: "Story", says: "Story" },
    { value: "", defaultValue: "", says: "Work Item" },
  ])(
    "says '$says' for an instance value '$value' over a default '$defaultValue'",
    ({ value, defaultValue, says }) => {
      const terms = resolveTerms([entry("workItem", value, defaultValue)]);

      expect(terms).toEqual({ ...SEEDED_TERMS, workItem: says });
    },
  );

  it("keeps every seeded word when there is no terminology to read", () => {
    expect(resolveTerms(null)).toEqual(SEEDED_TERMS);
    expect(Object.keys(SEEDED_TERMS)).toHaveLength(23);
  });

  it("leaves the seeded words standing when the terminology cannot be read", async () => {
    const terms = await readTerms({
      getTerminology: async () => ({
        ok: false,
        error: { category: "unexpected", reason: "down" },
      }),
    });

    expect(terms).toEqual(SEEDED_TERMS);
  });

  it("leaves the seeded words standing when the read itself throws", async () => {
    const terms = await readTerms({
      getTerminology: async () => {
        throw new Error("socket hang up");
      },
    });

    expect(terms).toEqual(SEEDED_TERMS);
  });
});
