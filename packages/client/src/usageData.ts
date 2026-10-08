/** Where a usage event came from, as Lighthouse names it. A client only ever declares its own. */
export type UsageDataSource = "Browser" | "Cli" | "Mcp";

export type ClientUsageDataSource = Exclude<UsageDataSource, "Browser">;

/** The usage events a client reports that carry nothing but their name. */
export type PlainUsageDataEventName =
  | "TeamCreated"
  | "TeamDeleted"
  | "PortfolioCreated"
  | "PortfolioDeleted"
  | "TeamManualForecastRun"
  | "TeamRefreshTriggered"
  | "PortfolioRefreshTriggered";

/** The usage events that say when, relative to the Team's Refinement, a vote was cast. */
export type SizingUsageDataEventName =
  | "TeamSizingVoteCast"
  | "TeamSizingReadinessReached";

/** The usage events a client reports, by the names Lighthouse already counts for the web. */
export type UsageDataEventName =
  | PlainUsageDataEventName
  | SizingUsageDataEventName;

export type UsageDataSizingMoment =
  | "NoCadence"
  | "OnRefinementDay"
  | "OnOtherDay";

/** Something a person did that is worth counting: names and values from closed lists, never free text. */
export type UsageDataOccurrence =
  | { readonly name: PlainUsageDataEventName }
  | {
      readonly name: SizingUsageDataEventName;
      readonly sizingMoment: UsageDataSizingMoment;
    };

/** What Lighthouse's answer about a Team's Refinement says about today. */
export type RefinementMomentFacts = {
  readonly nextRefinementDate: string | null;
  readonly isRefinementDay: boolean;
};

/**
 * When a vote was cast, from Lighthouse's answer rather than this machine's clock: Lighthouse counts days in
 * the instance's time zone and knows which cadence days are blacked out. The web counts it the same way.
 */
export const sizingMomentOf = ({
  nextRefinementDate,
  isRefinementDay,
}: RefinementMomentFacts): UsageDataSizingMoment => {
  if (nextRefinementDate === null) {
    return "NoCadence";
  }
  return isRefinementDay ? "OnRefinementDay" : "OnOtherDay";
};

export type UsageDataEvent = UsageDataOccurrence & {
  readonly offsetMs: number;
  readonly sequence: number;
};

export type UsageDataBatch = {
  readonly source: ClientUsageDataSource;
  readonly events: readonly UsageDataEvent[];
};

/** What Lighthouse says about usage data from this client; `acceptedSources` is null on a server that predates it. */
export type UsageDataState = {
  readonly decision: string | null;
  readonly mayAsk: boolean;
  readonly administratorDisabled: boolean;
  readonly acceptedSources: readonly string[] | null;
};

/** The answer a person gave for one Lighthouse. */
export type StoredUsageDataAnswer =
  | {
      readonly answer: "yes";
      readonly token: string;
      readonly confirmedAt: string;
    }
  | { readonly answer: "no"; readonly decidedAt: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isStringList = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

/** Lighthouse's state answer, or null when it is not one. */
export const readUsageDataState = (json: unknown): UsageDataState | null => {
  if (
    !isRecord(json) ||
    typeof json.mayAsk !== "boolean" ||
    typeof json.administratorDisabled !== "boolean"
  ) {
    return null;
  }
  return {
    decision: typeof json.decision === "string" ? json.decision : null,
    mayAsk: json.mayAsk,
    administratorDisabled: json.administratorDisabled,
    acceptedSources: isStringList(json.acceptedSources)
      ? json.acceptedSources
      : null,
  };
};

/** A stored answer, or null when the value is not one. */
export const readStoredUsageDataAnswer = (
  value: unknown,
): StoredUsageDataAnswer | null => {
  if (!isRecord(value)) {
    return null;
  }
  if (
    value.answer === "yes" &&
    typeof value.token === "string" &&
    typeof value.confirmedAt === "string"
  ) {
    return {
      answer: "yes",
      token: value.token,
      confirmedAt: value.confirmedAt,
    };
  }
  if (value.answer === "no" && typeof value.decidedAt === "string") {
    return { answer: "no", decidedAt: value.decidedAt };
  }
  return null;
};

/**
 * `DO_NOT_TRACK` asks every tool to send nothing. Set to anything but empty, `0` or `false` (any case), it is
 * honoured.
 */
export const isDoNotTrackSet = (
  env: Readonly<Record<string, string | undefined>>,
): boolean => {
  const value = env.DO_NOT_TRACK?.trim().toLowerCase();
  return (
    value !== undefined && value !== "" && value !== "0" && value !== "false"
  );
};

/** Which of a command line's three streams are terminals. */
export type TerminalStreams = {
  readonly stdinIsTTY: boolean;
  readonly stdoutIsTTY: boolean;
  readonly stderrIsTTY: boolean;
};

/**
 * A question needs a person: one who can type (stdin), sees the answer (stdout) and the question (stderr),
 * and is not a build agent behind a pseudo-terminal (`CI` set to anything).
 */
export const isAPersonAtTheTerminal = (
  streams: TerminalStreams,
  env: Readonly<Record<string, string | undefined>>,
): boolean =>
  streams.stdinIsTTY &&
  streams.stdoutIsTTY &&
  streams.stderrIsTTY &&
  (env.CI === undefined || env.CI === "");

// Lighthouse forgets a grant it has not seen for a month. Checking it at most once a day keeps it alive
// without a read on every command.
const RECONFIRM_AFTER_MS = 24 * 60 * 60 * 1000;

export type UsageDataStepFacts = {
  readonly doNotTrack: boolean;
  /** The answer kept for this Lighthouse: undefined when never asked there. */
  readonly stored: StoredUsageDataAnswer | undefined | "unreadable";
  /** Lighthouse's state: not read yet, or could not be read. */
  readonly state: UsageDataState | "unread" | "unavailable";
  readonly source: ClientUsageDataSource;
  /** Whether a person is there to be asked. */
  readonly mayPrompt: boolean;
  /** Whether the command reached Lighthouse and succeeded. */
  readonly reached: boolean;
  readonly occurrences: readonly UsageDataOccurrence[];
  readonly now: Date;
};

export type UsageDataPlan =
  | { readonly kind: "nothing" }
  | { readonly kind: "read-state"; readonly token: string | undefined }
  | { readonly kind: "ask" }
  | {
      readonly kind: "send";
      readonly token: string;
      readonly batch: UsageDataBatch;
      /** Lighthouse has just confirmed the grant, so it is kept as confirmed now. */
      readonly reconfirmed: boolean;
    }
  | {
      readonly kind: "re-grant-then-send";
      readonly formerToken: string;
      readonly batch: UsageDataBatch;
    };

const NOTHING: UsageDataPlan = { kind: "nothing" };

const batchOf = (
  source: ClientUsageDataSource,
  occurrences: readonly UsageDataOccurrence[],
): UsageDataBatch => ({
  source,
  events: occurrences.map((occurrence, sequence) => ({
    ...occurrence,
    offsetMs: 0,
    sequence,
  })),
});

const labels = (state: UsageDataState, source: ClientUsageDataSource) =>
  state.acceptedSources?.includes(source) === true;

const isFresh = (confirmedAt: string, now: Date): boolean => {
  const confirmed = Date.parse(confirmedAt);
  return (
    !Number.isNaN(confirmed) && now.getTime() - confirmed < RECONFIRM_AFTER_MS
  );
};

const planForYes = (
  token: string,
  confirmedAt: string,
  facts: UsageDataStepFacts,
): UsageDataPlan => {
  if (facts.occurrences.length === 0) {
    return NOTHING;
  }
  const batch = batchOf(facts.source, facts.occurrences);
  if (isFresh(confirmedAt, facts.now)) {
    return { kind: "send", token, batch, reconfirmed: false };
  }
  if (facts.state === "unread") {
    return { kind: "read-state", token };
  }
  if (
    facts.state === "unavailable" ||
    facts.state.administratorDisabled ||
    !labels(facts.state, facts.source)
  ) {
    return NOTHING;
  }
  return facts.state.decision === "Granted"
    ? { kind: "send", token, batch, reconfirmed: true }
    : { kind: "re-grant-then-send", formerToken: token, batch };
};

const planForUndecided = (facts: UsageDataStepFacts): UsageDataPlan => {
  if (!facts.mayPrompt) {
    return NOTHING;
  }
  if (facts.state === "unread") {
    return { kind: "read-state", token: undefined };
  }
  if (
    facts.state === "unavailable" ||
    facts.state.administratorDisabled ||
    !facts.state.mayAsk ||
    !labels(facts.state, facts.source)
  ) {
    return NOTHING;
  }
  return { kind: "ask" };
};

/** What to do about usage data after a command, decided from facts alone. */
export const planUsageDataStep = (facts: UsageDataStepFacts): UsageDataPlan => {
  if (
    facts.doNotTrack ||
    !facts.reached ||
    facts.stored === "unreadable" ||
    facts.stored?.answer === "no"
  ) {
    return NOTHING;
  }
  if (facts.stored === undefined) {
    return planForUndecided(facts);
  }
  return planForYes(facts.stored.token, facts.stored.confirmedAt, facts);
};
