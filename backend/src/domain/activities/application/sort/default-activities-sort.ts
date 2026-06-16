import type { ActivitySummary } from "@/domain/activities/enterprise/read-models/activity-read-models";

/**
 * Default sort — a work queue.
 *
 * - Failed/skipped bubble to the very top.
 * - Pending activities of a lead ALREADY CALLED TODAY sink to the bottom of the
 *   pending list — even when their dueDate is older/overdue. This overrides day
 *   grouping so the rep works leads not yet touched today first, and circles
 *   back to today's retries last.
 * - Otherwise: group by calendar day (UTC), incomplete before completed, then
 *   higher star rating, then earlier dueDate.
 *
 * `attemptedLeadIds` = ids of leads with a completed call today, supplied by the
 * repository (which knows "today"). When omitted, it is derived from completed
 * call activities present in `items` (e.g. the "Todas" view).
 */
export function sortActivitiesDefaultOrder(
  items: ActivitySummary[],
  attemptedLeadIds?: Set<string>,
): ActivitySummary[] {
  const attempted = new Set<string>(attemptedLeadIds ?? []);
  if (!attemptedLeadIds) {
    for (const a of items) {
      if (a.type === "call" && a.completed && a.leadId) attempted.add(a.leadId);
    }
  }
  const leadAttempted = (a: ActivitySummary): boolean =>
    !!a.leadId && attempted.has(a.leadId);

  return [...items].sort((a, b) => {
    // 1. Failed/skipped surface above everything else
    const aOutcome = a.failedAt ?? a.skippedAt;
    const bOutcome = b.failedAt ?? b.skippedAt;
    if (aOutcome && !bOutcome) return -1;
    if (!aOutcome && bOutcome) return 1;

    // 2. Between two pending activities, the one whose lead was already called
    //    today sinks below the not-yet-attempted one. Comes BEFORE day grouping
    //    so an overdue task of an already-called lead still drops to the bottom.
    if (!a.completed && !b.completed && !aOutcome && !bOutcome) {
      const aAtt = leadAttempted(a);
      const bAtt = leadAttempted(b);
      if (aAtt !== bAtt) return aAtt ? 1 : -1;
    }

    // 3. Group by calendar day (YYYY-MM-DD, UTC); null dueDate goes last
    const dayA = a.dueDate ? a.dueDate.toISOString().slice(0, 10) : "9999-99-99";
    const dayB = b.dueDate ? b.dueDate.toISOString().slice(0, 10) : "9999-99-99";
    if (dayA < dayB) return -1;
    if (dayA > dayB) return 1;

    // 4. Within the same day: incomplete first, completed last
    if (!a.completed && b.completed) return -1;
    if (a.completed && !b.completed) return 1;

    // 5. Completed group: sort by completedAt asc — most recently completed sinks to bottom
    if (a.completed && b.completed) {
      return (a.completedAt?.getTime() ?? 0) - (b.completedAt?.getTime() ?? 0);
    }

    // 6. Pending group: higher star rating first, then earlier dueDate
    const starA = a.lead?.starRating ?? 0;
    const starB = b.lead?.starRating ?? 0;
    if (starB !== starA) return starB - starA;

    return (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity);
  });
}
