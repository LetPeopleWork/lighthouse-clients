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
