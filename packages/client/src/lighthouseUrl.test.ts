import { describe, expect, it } from "vitest";
import { getNormalizedLighthouseUrl } from "./lighthouseUrl";

describe("a Lighthouse URL as the client talks to it", () => {
  it.each([
    ["https://lighthouse.example", "https://lighthouse.example"],
    ["HTTPS://Lighthouse.Example:443/", "https://lighthouse.example"],
    ["http://lighthouse.example:80//", "http://lighthouse.example"],
    ["http://localhost:5000", "http://localhost:5000"],
    ["https://lighthouse.example/team-a/", "https://lighthouse.example/team-a"],
    [
      "https://lighthouse.example/team-a//",
      "https://lighthouse.example/team-a",
    ],
    ["https://lighthouse.example/api", "https://lighthouse.example/api"],
    ["  https://lighthouse.example/  ", "https://lighthouse.example"],
  ])("reads '%s' as %s", (given, url) => {
    expect(getNormalizedLighthouseUrl(given)).toBe(url);
  });

  it.each([
    "",
    "   ",
    "lighthouse.example",
    "ftp://lighthouse.example",
    "file:///home/ana/lighthouse",
    "mailto:ana@lighthouse.example",
  ])("is no Lighthouse URL for '%s'", (given) => {
    expect(getNormalizedLighthouseUrl(given)).toBeNull();
  });
});
