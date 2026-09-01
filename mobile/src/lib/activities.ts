import { apiFetch } from "./api";

interface NamedRef {
  id: string;
  name: string;
}

/** An activity as GET /activities/:id returns it. The payload is much wider (e-mail tracking,
 *  cadence, WhatsApp threads…); only what the detail screen renders is typed. */
export interface ActivityDetail {
  id: string;
  type: string;
  subject: string;
  description: string | null;
  dueDate: string | null;
  createdAt: string;
  completed: boolean;
  completedAt: string | null;
  failedAt: string | null;
  failReason: string | null;
  skippedAt: string | null;
  skipReason: string | null;
  meetingNoShow: boolean | null;
  // Call (GoTo) — present only on call activities that were recorded/transcribed.
  gotoDuration: number | null;
  gotoCallOutcome: string | null;
  gotoTranscriptText: string | null;
  lead: { id: string; businessName: string } | null;
  organization: NamedRef | null;
  contact: NamedRef | null;
  partner: NamedRef | null;
  deal: { id: string; title: string } | null;
  owner: NamedRef | null;
}

export type ActivityStatus = "pending" | "done" | "failed" | "skipped";

/** `completed` wins over the outcome timestamps: an activity can be marked failed and later
 *  completed, and the final state is what matters. Same rule as the visits list. */
export function activityStatus(a: {
  completed: boolean;
  failedAt: string | null;
  skippedAt: string | null;
}): ActivityStatus {
  if (a.completed) return "done";
  if (a.failedAt) return "failed";
  if (a.skippedAt) return "skipped";
  return "pending";
}

export async function getActivity(id: string): Promise<ActivityDetail> {
  return apiFetch<ActivityDetail>(`/activities/${id}`);
}

/** "12min 34s" — GoTo reports call length in seconds. */
export function formatDuration(seconds: number | null): string | null {
  if (seconds == null || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}min ${s}s` : `${s}s`;
}

/** The transcript is stored as JSON (segments emitted by the transcriber), but older rows hold
 *  plain text — render whatever is there rather than failing on the ones that don't parse. */
export function transcriptToText(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((seg: { text?: string }) => (seg?.text ?? "").trim())
        .filter(Boolean)
        .join("\n");
    }
    if (typeof parsed === "object" && parsed && Array.isArray((parsed as { segments?: unknown }).segments)) {
      return ((parsed as { segments: { text?: string }[] }).segments)
        .map((seg) => (seg?.text ?? "").trim())
        .filter(Boolean)
        .join("\n");
    }
  } catch {
    // Not JSON — it's already plain text.
  }
  return raw;
}
