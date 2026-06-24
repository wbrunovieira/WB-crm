import type { Activity } from "@/domain/activities/enterprise/entities/activity";
import type { ActivitySummary, ActivityDetail } from "@/domain/activities/enterprise/read-models/activity-read-models";

export interface ActivityFilters {
  type?: string;
  completed?: boolean;
  dealId?: string;
  contactId?: string;
  leadId?: string;
  leadSearch?: string;
  owner?: string;
  dateFrom?: string;
  dateTo?: string;
  outcome?: string; // "failed" | "skipped"
  includeArchivedLeads?: boolean;
  sortBy?: string;
}

export interface ActivityWithNames {
  activity: Activity;
  ownerName: string;
  clientName: string;
}

/** Read-model for call/transfer/gatekeeper analysis triggers (activity + lead + contact). */
export interface ActivityAnalysisContext {
  subject: string;
  gotoTranscriptText: string | null;
  gotoDuration: number | null;
  dueDate: Date | null;
  lead: { id: string; businessName: string | null; segment: string | null; city: string | null } | null;
  contact: { name: string; role: string | null } | null;
}

export abstract class ActivitiesRepository {
  abstract findMany(requesterId: string, requesterRole: string, filters?: ActivityFilters): Promise<ActivitySummary[]>;
  abstract findById(id: string, requesterId: string, requesterRole: string): Promise<ActivityDetail | null>;
  abstract findByIdRaw(id: string): Promise<Activity | null>;
  abstract findByIdForTranscription(id: string): Promise<ActivityWithNames | null>;
  abstract findAnalysisContext(activityId: string): Promise<ActivityAnalysisContext | null>;
  abstract findByTranscriptionJobId(jobId: string): Promise<Activity | null>;
  abstract findFirst(where: { gotoCallId?: string }): Promise<Activity | null>;
  abstract findByCampaignSendId(sendId: string): Promise<Activity | null>;
  /**
   * Outbound 1:1 email activities (type "email", composed by the user — i.e. with
   * no `emailFromAddress`) that belong to the given Gmail thread and owner. Used to
   * reconcile a bounce DSN (which Gmail threads with the original send) back to the
   * activity it failed. Returns all matches; the caller decides which to fail.
   */
  abstract findOutboundEmailByThreadId(threadId: string, ownerId: string): Promise<Activity[]>;
  abstract findAnsweredCallsMissingRecordingId(since: Date): Promise<Activity[]>;
  /** Activities whose reminder is due: remindAt <= now, not yet reminded, not completed. */
  abstract findDueReminders(now: Date): Promise<Activity[]>;
  /** Stamp remindedAt so the reminder is not fired again. */
  abstract markAsReminded(activityId: string, remindedAt: Date): Promise<void>;
  abstract save(activity: Activity): Promise<void>;
  abstract delete(id: string): Promise<void>;
  abstract markThreadReplied(threadId: string): Promise<void>;
  abstract findWhatsAppDriveIds(activityId: string): Promise<string[]>;
  abstract updateEmailOpenStats(trackingToken: string, openedAt: Date): Promise<void>;
  abstract updateEmailClickStats(trackingToken: string, clickedAt: Date): Promise<void>;
}
