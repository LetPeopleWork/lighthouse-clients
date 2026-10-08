import { formatCalendarDay } from "./calendarDates";

// How the wording modules take facts off an answer they cannot trust the shape of: an older or newer
// Lighthouse may send any field missing or of another type, and the reader must say so rather than throw.

export const isRecord = (
  value: unknown,
): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export const isText = (value: unknown): value is string =>
  typeof value === "string";

/** A text with something in it; an empty one is as good as not sent. */
export const textOf = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

export const isDay = (value: unknown): value is string =>
  isText(value) && formatCalendarDay(value) !== null;

/** The calendar day as a person reads it, or the text exactly as sent when it is not one. */
export const dayOf = (wire: string): string => formatCalendarDay(wire) ?? wire;

/** The date a list of chances gives for one probability, or undefined when it holds none for it. */
export const expectedDateAt = (
  chances: unknown,
  probability: number,
): string | undefined => {
  if (!Array.isArray(chances)) {
    return undefined;
  }
  const chance = chances.find(
    (entry) => isRecord(entry) && entry.probability === probability,
  );
  return isRecord(chance) ? textOf(chance.expectedDate) : undefined;
};
