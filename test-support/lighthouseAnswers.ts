// Lighthouse's answers as they arrive on the wire: camelCase, enums as strings, a DateTime as ISO with
// `Z`, a DateOnly as `yyyy-mm-dd`. Each builder takes only the facts a scenario is about; the rest are the
// Lighthouse demo data (Team Gravity, Portfolio Ocean Explorer, "today" Tue 6 Oct 2026).

export type Answer =
  | { readonly ok: true; readonly value: unknown }
  | {
      readonly ok: false;
      readonly error: { readonly category: string; readonly reason: string };
    };

/** How a stub Lighthouse answers each client read, by method name. */
export type Reads = Readonly<
  Record<string, Answer | ((...args: readonly unknown[]) => Answer)>
>;

export const ok = (value: unknown): Answer => ({ ok: true, value });

export const refused = (category: string, reason: string): Answer => ({
  ok: false,
  error: { category, reason },
});

// ── Terminology ──────────────────────────────────────────────────────────────

export const SEEDED_TERMS: Readonly<Record<string, string>> = {
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

// Every one of the 23 terms renamed, for the "no seeded word survives" checks.
export const EVERY_TERM_RENAMED: Readonly<Record<string, string>> = {
  workItem: "Ticket",
  workItems: "Tickets",
  feature: "Outcome",
  features: "Outcomes",
  cycleTime: "Flow Time",
  throughput: "Flow Rate",
  workInProgress: "Ongoing Work",
  wip: "Load",
  workItemAge: "Ticket Age",
  tag: "Label",
  workTrackingSystem: "Tracker",
  workTrackingSystems: "Trackers",
  blocked: "Stuck",
  serviceLevelExpectation: "Promise",
  sle: "PRM",
  team: "Squad",
  teams: "Squads",
  portfolio: "Programme",
  portfolios: "Programmes",
  delivery: "Release",
  deliveries: "Releases",
  refinement: "Grooming",
  refinements: "Groomings",
};

export const terminology = (renamed: Readonly<Record<string, string>> = {}) =>
  Object.entries(SEEDED_TERMS).map(([key, defaultValue], index) => ({
    id: index + 1,
    key,
    description: "",
    defaultValue,
    value: renamed[key] ?? defaultValue,
  }));

// The seeded words a renamed instance must never see, matched as whole words.
export const seededWordsIn = (text: string): string[] =>
  [
    "Work Items",
    "Work Item",
    "Features",
    "Feature",
    "Cycle Time",
    "Throughput",
    "WIP",
    "Work Item Age",
    "Work Tracking Systems",
    "Work Tracking System",
    "Blocked",
    "Service Level Expectation",
    "Teams",
    "Team",
    "Portfolios",
    "Portfolio",
    "Deliveries",
    "Delivery",
  ].filter((word) => new RegExp(`\\b${word}\\b`, "u").test(text));

// ── Forecasts ────────────────────────────────────────────────────────────────

const when = (probability: number, day: string) => ({
  probability,
  expectedDate: `${day}T00:00:00Z`,
  filterApplied: false,
  excludedSummary: null,
});

// Gravity, 25 Work Items, target Fri 30 Oct 2026.
export const gravitysForecast = (facts: Record<string, unknown> = {}) => ({
  remainingItems: 25,
  targetDate: "2026-10-30T00:00:00Z",
  likelihood: 48.2034,
  whenForecasts: [
    when(50, "2026-10-30"),
    when(70, "2026-11-04"),
    when(85, "2026-11-09"),
    when(95, "2026-11-13"),
  ],
  howManyForecasts: [
    { probability: 50, value: 25 },
    { probability: 70, value: 22 },
    { probability: 85, value: 19 },
    { probability: 95, value: 16 },
  ],
  filterApplied: false,
  excludedSummary: null,
  hasSufficientData: true,
  ...facts,
});

// Gravity's September backtest against July and August: 24, 21, 18, 15 forecast, 21 actual.
export const gravitysBacktest = (facts: Record<string, unknown> = {}) => ({
  startDate: "2026-09-01",
  endDate: "2026-09-30",
  historicalStartDate: "2026-07-01",
  historicalEndDate: "2026-08-31",
  percentiles: [
    { probability: 50, value: 24 },
    { probability: 70, value: 21 },
    { probability: 85, value: 18 },
    { probability: 95, value: 15 },
  ],
  actualThroughput: 21,
  filterApplied: false,
  excludedSummary: null,
  ...facts,
});

// ── Teams and Portfolios ─────────────────────────────────────────────────────

const references = (names: readonly string[], firstId: number) =>
  names.map((name, index) => ({ id: firstId + index, name }));

const sixFeatures = references(
  [
    "Sonar mapping",
    "Deep-sea camera stream",
    "Pressure alarms",
    "Dive log export",
    "Hull telemetry",
    "Crew roster",
  ],
  1,
);

// TeamDto as GET /teams/{id} and the list send it. It carries no tags.
export const aTeam = (facts: Record<string, unknown> = {}) => ({
  name: "Gravity",
  id: 3,
  lastUpdated: "2026-10-06T05:14:00Z",
  serviceLevelExpectationProbability: 85,
  serviceLevelExpectationRange: 12,
  systemWIPLimit: 10,
  featureWip: 2,
  features: sixFeatures,
  portfolios: [
    { id: 1, name: "Apollo" },
    { id: 2, name: "Ocean Explorer" },
  ],
  workItemTypes: ["User Story", "Bug"],
  useFixedDatesForThroughput: false,
  throughputStartDate: "2026-09-07T00:00:00Z",
  throughputEndDate: "2026-10-06T00:00:00Z",
  hasThroughputBlackoutOverlap: false,
  hasForecastFilter: false,
  refinementConfigured: false,
  ...facts,
});

export const gravity = aTeam;

export const sevenTeams = () =>
  [
    ["Equinox", 1, 3],
    ["Lightspeed", 2, 1],
    ["Gravity", 3, 6],
    ["Meridian", 4, 4],
    ["Pulsar", 5, 2],
    ["Voyager", 6, 5],
    ["Zenith", 7, 3],
  ].map(([name, id, featureCount]) =>
    aTeam({
      name,
      id,
      features: Array.from({ length: Number(featureCount) }, (_, index) => ({
        id: 100 + index,
        name: `Roadmap goal ${index + 1}`,
      })),
    }),
  );

// PortfolioDto: involved Teams, no Feature WIP of its own, no tags.
export const aPortfolio = (facts: Record<string, unknown> = {}) => ({
  name: "Ocean Explorer",
  id: 2,
  lastUpdated: "2026-10-06T04:58:00Z",
  serviceLevelExpectationProbability: 85,
  serviceLevelExpectationRange: 45,
  systemWIPLimit: 5,
  features: references(
    [
      "Sonar mapping",
      "Deep-sea camera stream",
      "Pressure alarms",
      "Dive log export",
      "Hull telemetry",
      "Crew roster",
      "Ballast control",
      "Pressure alarms v2",
    ],
    1,
  ),
  involvedTeams: [
    { id: 3, name: "Gravity" },
    { id: 6, name: "Voyager" },
    { id: 7, name: "Zenith" },
  ],
  featureSizeTargetProbability: 85,
  featureSizeTargetRange: 30,
  ...facts,
});

export const oceanExplorer = aPortfolio;

export const fivePortfolios = () =>
  [
    ["Apollo", 1, 5],
    ["Ocean Explorer", 2, 8],
    ["Orion", 3, 4],
    ["NeuroLink City", 4, 6],
    ["Altobelli", 5, 2],
  ].map(([name, id, featureCount]) =>
    aPortfolio({
      name,
      id,
      features: Array.from({ length: Number(featureCount) }, (_, index) => ({
        id: 200 + index,
        name: `Roadmap goal ${index + 1}`,
      })),
    }),
  );

// ── Deliveries ───────────────────────────────────────────────────────────────

export const aDelivery = (facts: Record<string, unknown> = {}) => ({
  id: 11,
  name: "Q4 Release",
  date: "2026-12-15T00:00:00Z",
  portfolioId: 2,
  likelihoodPercentage: 78.2,
  teamsWithoutForecast: [],
  completionDates: [
    when(50, "2026-12-09"),
    when(70, "2026-12-14"),
    when(85, "2026-12-16"),
    when(95, "2026-12-22"),
  ],
  progress: 61.8,
  remainingWork: 21,
  totalWork: 55,
  features: [1, 2, 3, 4, 5],
  featureLikelihoods: [],
  hasSufficientData: true,
  metricSnapshotCount: 22,
  selectionMode: "Manual",
  sourceKey: null,
  sourceReference: null,
  sourceLastSyncedOn: null,
  sourceUnavailableReason: null,
  publishForecastToSource: false,
  lastPublishRefusedOn: null,
  lastPublishRefusalReason: null,
  isOverdue: false,
  rules: [],
  mode: "And",
  concurrencyToken: "6f1c2a9e-0000-4000-8000-000000000011",
  ...facts,
});

// Ocean Explorer's four Deliveries: on track, capped, overdue, thin history.
export const oceanExplorersDeliveries = () => [
  aDelivery(),
  aDelivery({
    id: 12,
    name: "Pilot Launch",
    date: "2026-10-30T00:00:00Z",
    likelihoodPercentage: 98.6,
    remainingWork: 2,
    totalWork: 20,
    features: [6, 7],
    completionDates: [
      when(50, "2026-10-21"),
      when(70, "2026-10-23"),
      when(85, "2026-10-27"),
      when(95, "2026-10-29"),
    ],
  }),
  aDelivery({
    id: 14,
    name: "Beta Drop",
    date: "2026-10-02T00:00:00Z",
    likelihoodPercentage: 0,
    isOverdue: true,
    remainingWork: 5,
    totalWork: 14,
    features: [8, 9, 10],
    completionDates: [
      when(50, "2026-10-09"),
      when(70, "2026-10-12"),
      when(85, "2026-10-15"),
      when(95, "2026-10-20"),
    ],
  }),
  aDelivery({
    id: 15,
    name: "Spring Rollout",
    date: "2027-03-09T00:00:00Z",
    likelihoodPercentage: 12,
    hasSufficientData: false,
    remainingWork: 31,
    totalWork: 31,
    features: [11, 12, 13, 14],
    completionDates: [],
  }),
];

// An archived Delivery as the server writes it down on closing: no Features to look up, no forecast to rerun.
export const anArchivedDelivery = (facts: Record<string, unknown> = {}) => ({
  id: 9,
  name: "Harbour Trial",
  date: "2026-08-28T00:00:00Z",
  portfolioId: 2,
  archivedOn: "2026-09-02T09:15:00Z",
  progress: 90,
  totalWork: 20,
  doneWork: 18,
  remainingWork: 2,
  likelihoodPercentage: 97.5,
  hasSufficientData: true,
  teamsWithoutForecast: [],
  featureBreakdown: breakdown(2),
  whenDistribution: [],
  selectionMode: "Manual",
  rules: [],
  mode: "And",
  metricSnapshotCount: 30,
  concurrencyToken: "6f1c2a9e-0000-4000-8000-000000000009",
  ...facts,
});

// Ocean Explorer's Deliveries as a Lighthouse since v26.8.31.7 answers them: the four running, one archived.
export const oceanExplorersPortfolioDeliveries = () => ({
  active: oceanExplorersDeliveries(),
  archived: [anArchivedDelivery()],
});

const breakdown = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    referenceId: `OE-0${10 + index}`,
    name: `Roadmap goal ${index + 1}`,
    completion: 50,
    likelihood: 60,
    totalItems: 10,
    isUsingDefaultSize: false,
  }));

const snapshot = (facts: Record<string, unknown>) => ({
  targetDateAtSnapshot: "2026-12-15T00:00:00Z",
  totalWork: 55,
  estimatedItemCount: null,
  whenDistribution: null,
  featureBreakdown: breakdown(5),
  ...facts,
});

// The Q4 Release's recorded days: three of them, the latest in full detail.
export const q4ReleaseHistory = (facts: Record<string, unknown> = {}) => ({
  deliveryDate: "2026-12-15T00:00:00Z",
  firstSnapshotDate: "2026-09-15T00:00:00Z",
  points: [
    snapshot({
      date: "2026-09-15T00:00:00Z",
      doneWork: 12,
      remainingWork: 43,
      likelihoodPercentage: 41.2,
    }),
    snapshot({
      date: "2026-09-16T00:00:00Z",
      doneWork: 13,
      remainingWork: 42,
      likelihoodPercentage: 43,
    }),
    snapshot({
      date: "2026-10-06T00:00:00Z",
      doneWork: 34,
      remainingWork: 21,
      likelihoodPercentage: 78.2,
      whenDistribution: [
        { probability: 50, expectedDate: "2026-12-09T00:00:00Z" },
        { probability: 70, expectedDate: "2026-12-14T00:00:00Z" },
        { probability: 85, expectedDate: "2026-12-16T00:00:00Z" },
        { probability: 95, expectedDate: "2026-12-22T00:00:00Z" },
      ],
      featureBreakdown: [
        {
          referenceId: "OE-001",
          name: "Sonar mapping",
          completion: 100,
          likelihood: null,
          totalItems: 12,
          isUsingDefaultSize: false,
        },
        {
          referenceId: "OE-002",
          name: "Deep-sea camera stream",
          completion: 62,
          likelihood: 81,
          totalItems: 13,
          isUsingDefaultSize: false,
        },
        {
          referenceId: "OE-007",
          name: "Pressure alarms",
          completion: 40,
          likelihood: 74,
          totalItems: 10,
          isUsingDefaultSize: true,
        },
      ],
    }),
  ],
  ...facts,
});

// ── Features and their Work Items ────────────────────────────────────────────

export const aWorkItem = (facts: Record<string, unknown> = {}) => ({
  name: "Export flow report as PDF",
  id: 61,
  referenceId: "GR-061",
  parentWorkItemReference: "OE-002",
  url: null,
  type: "User Story",
  state: "In Progress",
  isBlocked: false,
  blockedSince: null,
  stateCategory: "Doing",
  cycleTime: 0,
  namedCycleTimes: [],
  workItemAge: 14,
  startedDate: "2026-09-23T07:00:00Z",
  closedDate: null,
  currentStateEnteredAt: "2026-09-23T07:00:00Z",
  approximate: false,
  ...facts,
});

// FeatureDto: a Work Item plus the per-Team work, forecasts and the start forecast.
export const aFeature = (facts: Record<string, unknown> = {}) => ({
  ...aWorkItem({
    name: "Deep-sea camera stream",
    id: 2,
    referenceId: "OE-002",
    parentWorkItemReference: "",
    type: "Feature",
    state: "In Progress",
    workItemAge: 9,
  }),
  isUsingDefaultFeatureSize: false,
  size: 13,
  owningTeam: "",
  projects: [{ id: 2, name: "Ocean Explorer" }],
  lastUpdated: "2026-10-06T04:58:00Z",
  remainingWork: { "3": 3, "6": 2 },
  totalWork: { "3": 8, "6": 5 },
  forecasts: [
    when(50, "2026-11-10"),
    when(70, "2026-11-16"),
    when(85, "2026-11-20"),
    when(95, "2026-11-27"),
  ],
  startForecast: {
    source: "Observed",
    observedDate: "2026-09-28T00:00:00Z",
    percentiles: [],
  },
  teamForecasts: [],
  teamsWithoutForecast: [],
  position: 2,
  canMove: true,
  moveBlockReason: null,
  blockingPortfolios: [],
  dependsOn: [],
  ...facts,
});

// OE-001 done, OE-002 on its way, OE-007 without a forecast (Zenith has no history).
export const threeOceanExplorerFeatures = () => [
  aFeature({
    name: "Sonar mapping",
    id: 1,
    referenceId: "OE-001",
    state: "Done",
    stateCategory: "Done",
    remainingWork: { "3": 0 },
    totalWork: { "3": 12 },
    forecasts: [],
    startForecast: { source: "Unknown", observedDate: null, percentiles: [] },
  }),
  aFeature(),
  aFeature({
    name: "Pressure alarms",
    id: 7,
    referenceId: "OE-007",
    state: "Planned",
    stateCategory: "ToDo",
    remainingWork: { "7": 6 },
    totalWork: { "7": 10 },
    forecasts: [],
    startForecast: { source: "Unknown", observedDate: null, percentiles: [] },
    teamsWithoutForecast: ["Zenith"],
  }),
];

export const oe002sWorkItems = () => [
  aWorkItem(),
  aWorkItem({
    name: "Stream reconnect on drop",
    id: 112,
    referenceId: "VO-112",
    state: "Done",
    stateCategory: "Done",
    closedDate: "2026-10-02T09:00:00Z",
  }),
  aWorkItem({
    name: "Camera bitrate setting",
    id: 70,
    referenceId: "GR-070",
    type: "Bug",
    state: "Review",
  }),
];

// ── Housekeeping ─────────────────────────────────────────────────────────────

// RecurringBlackoutRuleDto: `summary` is built by the server, in its own words.
export const aBlackoutRule = (facts: Record<string, unknown> = {}) => ({
  id: 5,
  weekdays: ["Friday"],
  intervalWeeks: 2,
  start: "2026-10-09",
  end: null,
  description: "Focus Friday",
  summary: "Every Friday — every 2 weeks — from 2026-10-09 — no end",
  ...facts,
});

const jiraCloudOptions = [
  { key: "Jira Url", displayName: "Jira URL", isSecret: false },
  { key: "Username", displayName: "Username (Email)", isSecret: false },
  { key: "Api Token", displayName: "API Token", isSecret: true },
];

// WorkTrackingSystemConnectionDto. The server blanks a secret's value; a scenario may make it misbehave.
export const aConnection = (facts: Record<string, unknown> = {}) => ({
  id: 1,
  name: "Letpeoplework Jira",
  workTrackingSystem: "Jira",
  authenticationMethodKey: "jira.cloud",
  authenticationMethodDisplayName: "Jira Cloud (API Token)",
  availableAuthenticationMethods: [
    {
      key: "jira.cloud",
      displayName: "Jira Cloud (API Token)",
      options: jiraCloudOptions.map((option) => ({
        ...option,
        isOptional: false,
      })),
      isPremium: false,
    },
  ],
  options: [
    {
      key: "Jira Url",
      value: "https://letpeoplework.atlassian.net",
      isSecret: false,
      isOptional: false,
      secretState: null,
    },
    {
      key: "Username",
      value: "benj@letpeoplework.com",
      isSecret: false,
      isOptional: false,
      secretState: null,
    },
    {
      key: "Api Token",
      value: "",
      isSecret: true,
      isOptional: false,
      secretState: "Readable",
    },
  ],
  additionalFieldDefinitions: [],
  writeBackMappingDefinitions: [],
  requiresReconnect: null,
  concurrencyToken: null,
  ...facts,
});

export const threeConnections = () => [
  aConnection(),
  aConnection({
    id: 2,
    name: "Lighthouse ADO",
    workTrackingSystem: "AzureDevOps",
  }),
  aConnection({ id: 3, name: "Linear Demo", workTrackingSystem: "Linear" }),
];
