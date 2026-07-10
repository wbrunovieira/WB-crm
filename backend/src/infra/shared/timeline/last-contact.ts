/**
 * Derives an entity's "last contact" from its activities: the most recent
 * contact-type activity (call/meeting/email/whatsapp/physical_visit/instagram_dm —
 * everything except "task"). Per activity it uses completedAt, then dueDate, then
 * createdAt. Returns null when there was no contact yet.
 */
const CONTACT_TYPES = new Set([
  "call",
  "meeting",
  "email",
  "whatsapp",
  "physical_visit",
  "instagram_dm",
]);

export interface ActivityDates {
  type: string;
  completedAt?: Date | null;
  dueDate?: Date | null;
  createdAt: Date;
}

export function computeLastContactAt(
  activities: ActivityDates[],
  now: Date = new Date(),
): Date | null {
  const nowMs = now.getTime();
  let latest: Date | null = null;
  for (const a of activities) {
    if (!CONTACT_TYPES.has(a.type)) continue;
    const d = a.completedAt ?? a.dueDate ?? a.createdAt;
    // "Last contact" means something that already happened — a future-scheduled
    // (not-yet-completed) activity is not a past contact.
    if (!d || d.getTime() > nowMs) continue;
    if (!latest || d.getTime() > latest.getTime()) latest = d;
  }
  return latest;
}
