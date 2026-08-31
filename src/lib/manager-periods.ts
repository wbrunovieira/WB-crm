/**
 * Period ranges for the Manager Dashboard's navigable periods (day/week/month).
 *
 * Single source of truth for both the range sent to the backend and the labels the
 * navigator shows — these used to be computed independently in the page and in
 * DateRangePicker, so a change to one silently disagreed with the other.
 *
 * Everything is expressed in UTC calendar days: ranges are emitted as "YYYY-MM-DD"
 * strings, which the backend normalizes to full UTC days (see resolveDateRange).
 */

export interface PeriodRange {
  /** Inclusive start, "YYYY-MM-DD". */
  start: string;
  /** Inclusive end, "YYYY-MM-DD". */
  end: string;
}

const toDateOnly = (date: Date): string => date.toISOString().slice(0, 10);

const utcDay = (year: number, month: number, day: number): Date =>
  new Date(Date.UTC(year, month, day));

/** Monday of the week at `offset` (0 = current week, -1 = last week, ...). */
function mondayOf(offset: number): Date {
  const now = new Date();
  const weekday = now.getUTCDay();
  // getUTCDay() is 0 for Sunday, which belongs to the week that started 6 days earlier.
  const toMonday = weekday === 0 ? -6 : 1 - weekday;
  return utcDay(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + toMonday + offset * 7);
}

/**
 * Monday through SUNDAY. The full week on purpose: with a Monday–Friday range a deal
 * closed on a weekend belonged to no week at all and vanished from the dashboard.
 */
export function getWeekRange(offset: number): PeriodRange {
  const monday = mondayOf(offset);
  const sunday = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000);
  return { start: toDateOnly(monday), end: toDateOnly(sunday) };
}

/** A single day (0 = today, -1 = yesterday, ...). */
export function getDayRange(offset: number): PeriodRange {
  const now = new Date();
  const day = utcDay(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset);
  const dateOnly = toDateOnly(day);
  return { start: dateOnly, end: dateOnly };
}

/** First through last day of a calendar month (0 = current, -1 = last, ...). */
export function getMonthRange(offset: number): PeriodRange {
  const now = new Date();
  const start = utcDay(now.getUTCFullYear(), now.getUTCMonth() + offset, 1);
  // Day 0 of the next month is the last day of this one.
  const end = utcDay(now.getUTCFullYear(), now.getUTCMonth() + offset + 1, 0);
  return { start: toDateOnly(start), end: toDateOnly(end) };
}
