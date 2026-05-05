import type { ActivitySummary } from "@/domain/activities/enterprise/read-models/activity-read-models";

/**
 * Default sort: group by calendar day (UTC), with completed activities
 * sinking to the bottom of each day group.
 *
 * Within the same day + same completion status, higher star rating leads
 * come first, then earlier dueDate. Failed/skipped bubble to the very top
 * regardless of day.
 */
export function sortActivitiesDefaultOrder(items: ActivitySummary[]): ActivitySummary[] {
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
