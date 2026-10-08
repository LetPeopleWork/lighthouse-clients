import type { RecurringBlackoutRule } from "./index";
import type { OwnerKind } from "./ownerWording";
import type { Terms } from "./terminology";

/** What a write did, as its confirmation opens: "Created:", "Updated:" or "Deleted:". */
export type WriteVerb = "Created" | "Updated" | "Deleted";

/** The Team or Portfolio a write is confirmed for: its id, and its name when there is one to give. */
export type WrittenOwner = {
  readonly id: number;
  readonly name?: string;
};

/** The recurring blackout rule a write is confirmed for, with Lighthouse's own wording of its schedule. */
export type WrittenBlackoutRule = Pick<RecurringBlackoutRule, "id"> &
  Partial<Pick<RecurringBlackoutRule, "summary" | "description">>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const textOf = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

/** The id and name a Team or Portfolio write answered with, or null when the answer does not say which it is. */
export const readWrittenOwner = (value: unknown): WrittenOwner | null => {
  if (!isRecord(value) || typeof value.id !== "number") {
    return null;
  }
  const name = textOf(value.name);
  return name === undefined ? { id: value.id } : { id: value.id, name };
};

/** The rule a blackout write answered with, or null when the answer does not say which rule it is. */
export const readWrittenBlackoutRule = (
  value: unknown,
): WrittenBlackoutRule | null => {
  if (!isRecord(value) || typeof value.id !== "number") {
    return null;
  }
  return {
    id: value.id,
    summary: textOf(value.summary),
    description: textOf(value.description),
  };
};

const ownerTerm = (kind: OwnerKind, terms: Terms): string =>
  kind === "team" ? terms.team : terms.portfolio;

/** "Created: Team Lightspeed [id: 9]."; without a name, as a delete always is, "Deleted: Team [id: 9]." */
export const describeOwnerWriteConfirmation = (
  verb: WriteVerb,
  kind: OwnerKind,
  { id, name }: WrittenOwner,
  terms: Terms,
): string => {
  const thing = [ownerTerm(kind, terms), name].filter(Boolean).join(" ");
  return `${verb}: ${thing} [id: ${id}].`;
};

/** A refresh only joins Lighthouse's queue, so the line says it was queued, not that it is done. */
export const describeRefreshConfirmation = (
  kind: OwnerKind,
  id: number,
  terms: Terms,
): string =>
  `Refresh queued: ${ownerTerm(kind, terms)} [id: ${id}]. Lighthouse updates it in the background.`;

/**
 * "Created: recurring blackout rule [id: 5] — Every Friday — every 2 weeks — from 2026-10-09 — no end
 * (Focus Friday)." The schedule is Lighthouse's own summary, word for word, so it reads as the settings
 * page states it; a delete names the id only.
 */
export const describeBlackoutRuleWriteConfirmation = (
  verb: WriteVerb,
  { id, summary, description }: WrittenBlackoutRule,
): string => {
  const schedule = summary === undefined ? "" : ` — ${summary}`;
  const note = description === undefined ? "" : ` (${description})`;
  return `${verb}: recurring blackout rule [id: ${id}]${schedule}${note}.`;
};
