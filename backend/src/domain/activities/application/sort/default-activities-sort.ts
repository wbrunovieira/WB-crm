import type { ActivitySummary } from "@/domain/activities/enterprise/read-models/activity-read-models";

const dayKey = (d: Date | null | undefined): string | null =>
  d ? d.toISOString().slice(0, 10) : null;

/**
 * Default sort: group by calendar day (UTC), with completed activities
 * sinking to the bottom of each day group.
 *
 * Within the same day + same completion status, leads already attempted that
 * day (a completed call exists) sink below not-yet-attempted leads; then higher
 * star rating leads come first, then earlier dueDate. Failed/skipped bubble to
 * the very top regardless of day.
 */
export function sortActivitiesDefaultOrder(
  items: ActivitySummary[],
  attemptedLeadDays?: Set<string>,
): ActivitySummary[] {
  // Leads that already had a call attempt on a given day → "leadId|YYYY-MM-DD".
  // A completed call activity (e.g. the GoTo "Caixa postal"/"Não atendeu" record)
  // means the rep already tried that lead today, so their still-pending activities
  // sink to the bottom of that day — work fresh leads first, circle back to retries.
  //
  // The set is seeded from `attemptedLeadDays` (passed by the repository, since the
  // default /activities view filters to pending and won't contain completed calls)
  // and also auto-derived from any completed calls present in `items` (e.g. "Todas").
  const attemptedByDay = new Set<string>(attemptedLeadDays ?? []);
  for (const a of items) {
    if (a.type === "call" && a.completed && a.leadId) {
      const day = dayKey(a.completedAt ?? a.dueDate);
      if (day) attemptedByDay.add(`${a.leadId}|${day}`);
    }
  }
  const attemptedOnItsDay = (a: ActivitySummary): boolean => {
    if (!a.leadId) return false;
    const day = dayKey(a.dueDate);
    return day ? attemptedByDay.has(`${a.leadId}|${day}`) : false;
  };

  return [...items].sort((a, b) => {
    // 1. Failed/skipped surface above everything else
    const aOutcome = a.failedAt ?? a.skippedAt;
    const bOutcome = b.failedAt ?? b.skippedAt;
    if (aOutcome && !bOutcome) return -1;
    if (!aOutcome && bOutcome) return 1;

    // 2. Group by calendar day (YYYY-MM-DD, UTC); null dueDate goes last
    const dayA = a.dueDate ? a.dueDate.toISOString().slice(0, 10) : "9999-99-99";
    const dayB = b.dueDate ? b.dueDate.toISOString().slice(0, 10) : "9999-99-99";
    if (dayA < dayB) return -1;
    if (dayA > dayB) return 1;

    // 3. Within the same day: incomplete first, completed last
    if (!a.completed && b.completed) return -1;
    if (a.completed && !b.completed) return 1;

    // 3b. Pending group: leads already attempted today sink below fresh ones
    if (!a.completed && !b.completed) {
      const aAtt = attemptedOnItsDay(a);
      const bAtt = attemptedOnItsDay(b);
      if (aAtt !== bAtt) return aAtt ? 1 : -1;
    }

    // 4. Completed group: sort by completedAt asc — most recently completed sinks to bottom
    if (a.completed && b.completed) {
      return (a.completedAt?.getTime() ?? 0) - (b.completedAt?.getTime() ?? 0);
    }

    // 5. Pending group: higher star rating first, then earlier dueDate
    const starA = a.lead?.starRating ?? 0;
    const starB = b.lead?.starRating ?? 0;
    if (starB !== starA) return starB - starA;

    return (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity);
  });
}
