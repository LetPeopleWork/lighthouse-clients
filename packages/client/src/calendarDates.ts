// Fixed English name tables rather than the runtime's locale data: a compiled binary need not carry it,
// and the same day must read the same in every runtime and locale.
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const CALENDAR_DAY = /^\d{4}-\d{2}-\d{2}$/u;

// Rejects a day the calendar does not have, such as 2026-02-30, which Date would roll into March.
export const isCalendarDay = (value: string | null): boolean => {
  if (value === null || !CALENDAR_DAY.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};

const DAY_LENGTH = "yyyy-mm-dd".length;

// Lighthouse sends a calendar day either bare or as midnight UTC; only the day part is the fact.
const dayPartOf = (wire: string): string | null =>
  wire.length === DAY_LENGTH || wire[DAY_LENGTH] === "T"
    ? wire.slice(0, DAY_LENGTH)
    : null;

/** "2026-10-30" or "2026-10-30T00:00:00Z" as "Fri 30 Oct 2026", whatever the reader's time zone; null for no such day. */
export const formatCalendarDay = (wire: string): string | null => {
  const dayPart = dayPartOf(wire);
  if (dayPart === null || !isCalendarDay(dayPart)) {
    return null;
  }
  const [year, month, day] = dayPart.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${WEEKDAYS[weekday]} ${day} ${MONTHS[month - 1]} ${year}`;
};

const twoDigits = (value: number): string => String(value).padStart(2, "0");

/** A moment as "Tue 6 Oct 2026, 07:14" on the reader's own clock; null when it is not a moment. */
export const formatTimestamp = (wire: string): string | null => {
  const moment = new Date(wire);
  if (Number.isNaN(moment.getTime())) {
    return null;
  }
  return `${WEEKDAYS[moment.getDay()]} ${moment.getDate()} ${MONTHS[moment.getMonth()]} ${moment.getFullYear()}, ${twoDigits(moment.getHours())}:${twoDigits(moment.getMinutes())}`;
};
