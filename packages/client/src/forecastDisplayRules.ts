// RED scaffold (story 6218, slice 01): the web's forecast display rules, restated once for the CLI and the
// MCP summaries. DELIVER slice 01 replaces the bodies and exports the module from index.ts.
export const __SCAFFOLD__ = true;

export type ForecastLevelName = "Certain" | "Confident" | "Realistic" | "Risky";

export type LikelihoodPrecision = "round" | "fixed2";

export const levelOf = (_chance: number | null): ForecastLevelName | null => {
  throw new Error("Not yet implemented -- RED scaffold");
};

export const formatLikelihood = (
  _value: number,
  _options: {
    readonly hasRemainingWork: boolean;
    readonly precision: LikelihoodPrecision;
  },
): string => {
  throw new Error("Not yet implemented -- RED scaffold");
};
