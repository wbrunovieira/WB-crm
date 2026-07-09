/**
 * Timeline roll-up: merges an entity's own activities (lead/partner/organization)
 * with the activities of its contacts, deduplicating by id and ordering by date
 * (most recent first). Lets the "parent" page show what happened with its contacts
 * without relying on the parent id being set on the activity.
 */
export function mergeActivities<T extends { id: string; createdAt: Date }>(
  direct: T[],
  viaContacts: T[],
  limit?: number,
): T[] {
  const seen = new Set(direct.map((a) => a.id));
  const merged = [...direct, ...viaContacts.filter((a) => !seen.has(a.id))];
  merged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return typeof limit === "number" ? merged.slice(0, limit) : merged;
}
