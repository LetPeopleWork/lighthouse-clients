import { describe, expect, it } from "vitest";
import { resolveUsageDataSwitch } from "./bin";

describe("resolveUsageDataSwitch", () => {
  it("is off without a warning when LIGHTHOUSE_USAGE_DATA is not set", () => {
    expect(resolveUsageDataSwitch({})).toEqual({ on: false });
  });

  it.each(["on", "ON", "On", "oN", " on "])(
    "is on without a warning for %j",
    (value) => {
      expect(resolveUsageDataSwitch({ LIGHTHOUSE_USAGE_DATA: value })).toEqual({
        on: true,
      });
    },
  );

  it.each(["off", "OFF", "Off", "", "  "])(
    "is off without a warning for %j",
    (value) => {
      expect(resolveUsageDataSwitch({ LIGHTHOUSE_USAGE_DATA: value })).toEqual({
        on: false,
      });
    },
  );

  it.each(["yes", "true", "1", "enabled", "onn", "o n"])(
    "is off with one warning naming the variable, on and off for %j",
    (value) => {
      const result = resolveUsageDataSwitch({ LIGHTHOUSE_USAGE_DATA: value });

      expect(result.on).toBe(false);
      expect(result.warning).toMatch(/LIGHTHOUSE_USAGE_DATA/u);
      expect(result.warning).toMatch(/\bon\b/u);
      expect(result.warning).toMatch(/\boff\b/u);
    },
  );

  it("ignores every other variable", () => {
    expect(
      resolveUsageDataSwitch({ USAGE_DATA: "on", LIGHTHOUSE_URL: "on" }),
    ).toEqual({ on: false });
  });
});
