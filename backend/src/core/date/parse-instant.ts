/**
 * Parses an incoming date string into an absolute UTC instant (Date).
 *
 * The deployed server runs in UTC. Browser clients already send absolute
 * instants (`...Z` from `toISOString()`), so those are parsed as-is. But
 * external callers (bots, the public API, cadence automation) often send a
 * **naive** wall-clock string with no timezone, e.g. "2026-06-30T16:00:00",
 * meaning "16:00 in our business timezone". A plain `new Date(...)` on a UTC
 * server would read that as 16:00 UTC = 13:00 in São Paulo — firing reminders
 * and scheduled emails ~3h early.
 *
 * So: strings that carry a timezone (Z or ±hh:mm) are absolute and parsed
 * directly; naive date-time strings are interpreted in BUSINESS_TIMEZONE.
 */
export const BUSINESS_TIMEZONE = "America/Sao_Paulo";

// Naive date-time: "YYYY-MM-DDTHH:MM(:SS(.sss))" or with a space, NO trailing
// Z / ±offset. Capturing the parts lets us place them in the business zone.
const NAIVE_DATETIME =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/;

/** Offset (ms) of `timeZone` at the given instant: local - utc (SP → -3h). */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(instant)) p[part.type] = part.value;
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - instant.getTime();
}

/** Converts a naive wall-clock (in `timeZone`) to the matching UTC instant. */
function wallTimeToUtc(
  y: number, mo: number, d: number, h: number, mi: number, s: number,
  timeZone: string,
): Date {
  // Treat the wall parts as if they were UTC, then subtract the zone offset.
  const guess = new Date(Date.UTC(y, mo - 1, d, h, mi, s));
  const offset = zoneOffsetMs(guess, timeZone); // SP: -3h (constant, no DST)
  return new Date(guess.getTime() - offset);
}

/**
 * Returns an absolute UTC Date for `value`, interpreting naive date-time
 * strings as BUSINESS_TIMEZONE. Returns undefined for null/undefined/"" and
 * returns an invalid Date (NaN) for unparseable input so callers can validate.
 */
export function parseInstant(value: string | Date | null | undefined): Date | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (value instanceof Date) return value;

  const m = NAIVE_DATETIME.exec(value.trim());
  if (m) {
    return wallTimeToUtc(+m[1], +m[2], +m[3], +m[4], +m[5], m[6] ? +m[6] : 0, BUSINESS_TIMEZONE);
  }

  // Has a timezone (Z / ±offset), is date-only, or is something else — let the
  // platform parse it (absolute instant or existing date-only UTC behavior).
  return new Date(value);
}
