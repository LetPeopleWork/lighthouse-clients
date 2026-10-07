import type { LighthouseClient, TerminologyEntry } from "./index";

/** Every word an instance may rename under Settings → Terminology, by its key. */
export type TerminologyKey =
  | "workItem"
  | "workItems"
  | "feature"
  | "features"
  | "cycleTime"
  | "throughput"
  | "workInProgress"
  | "wip"
  | "workItemAge"
  | "tag"
  | "workTrackingSystem"
  | "workTrackingSystems"
  | "blocked"
  | "serviceLevelExpectation"
  | "sle"
  | "team"
  | "teams"
  | "portfolio"
  | "portfolios"
  | "delivery"
  | "deliveries"
  | "refinement"
  | "refinements";

/** The instance's word for every configurable term. */
export type Terms = Readonly<Record<TerminologyKey, string>>;

/** The words a new Lighthouse instance starts with, as its seeder writes them. */
export const SEEDED_TERMS: Terms = {
  workItem: "Work Item",
  workItems: "Work Items",
  feature: "Feature",
  features: "Features",
  cycleTime: "Cycle Time",
  throughput: "Throughput",
  workInProgress: "Work In Progress",
  wip: "WIP",
  workItemAge: "Work Item Age",
  tag: "Tag",
  workTrackingSystem: "Work Tracking System",
  workTrackingSystems: "Work Tracking Systems",
  blocked: "Blocked",
  serviceLevelExpectation: "Service Level Expectation",
  sle: "SLE",
  team: "Team",
  teams: "Teams",
  portfolio: "Portfolio",
  portfolios: "Portfolios",
  delivery: "Delivery",
  deliveries: "Deliveries",
  refinement: "Refinement",
  refinements: "Refinements",
};

const TERMINOLOGY_KEYS = Object.keys(SEEDED_TERMS) as TerminologyKey[];

/** The instance's words, a blank or missing one falling back to its entry's default, then the seeded word, as on the web. */
export const resolveTerms = (
  entries: readonly TerminologyEntry[] | null,
): Terms => {
  const wordFor = (key: TerminologyKey): string => {
    const entry = entries?.find((candidate) => candidate.key === key);
    return entry?.value || entry?.defaultValue || SEEDED_TERMS[key];
  };
  return Object.fromEntries(
    TERMINOLOGY_KEYS.map((key) => [key, wordFor(key)]),
  ) as Terms;
};

export type TermsSource = Pick<LighthouseClient, "getTerminology">;

/** The instance's words; when they cannot be read the seeded ones stand in, so this never fails. */
export const readTerms = async (source: TermsSource): Promise<Terms> => {
  try {
    const terminology = await source.getTerminology();
    return resolveTerms(terminology.ok ? terminology.value : null);
  } catch {
    return SEEDED_TERMS;
  }
};
