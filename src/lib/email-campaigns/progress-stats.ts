/**
 * Pure helpers for the campaign "Progresso" tab. Kept out of the component so
 * the bounce-exclusion and ETA math can be unit-tested.
 */

export interface ProgressRecipient {
  status: string;
  stepsSent: number[];
  lastSentAt?: string;
}

export interface ProgressStats {
  /** Real sends: have a send record AND did not bounce. */
  delivered: number;
  bounced: number;
  pending: number;
  /** Estimated time to finish the remaining sends, in ms (null if not computable). */
  etaMs: number | null;
  /** Average interval between sends so far, in ms (null if not computable). */
  avgIntervalMs: number | null;
}

export function computeProgressStats(recipients: ProgressRecipient[]): ProgressStats {
  const delivered = recipients.filter(
    (r) => r.stepsSent.length > 0 && r.status !== "BOUNCED",
  ).length;
  const bounced = recipients.filter((r) => r.status === "BOUNCED").length;
  const pending = recipients.filter((r) => r.status === "PENDING").length;

  const sentTimes = recipients
    .filter((r) => r.lastSentAt)
    .map((r) => new Date(r.lastSentAt as string).getTime())
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b);

  let etaMs: number | null = null;
  let avgIntervalMs: number | null = null;
  if (pending > 0 && sentTimes.length >= 2) {
    const span = sentTimes[sentTimes.length - 1] - sentTimes[0];
    const avg = span / (sentTimes.length - 1);
    if (avg > 0) {
      avgIntervalMs = avg;
      etaMs = pending * avg;
    }
  }

  return { delivered, bounced, pending, etaMs, avgIntervalMs };
}

export function formatDuration(ms: number): string {
  if (ms < 60_000) return "menos de 1 min";
  const totalMin = Math.round(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  return `${h}h ${m}min`;
}
