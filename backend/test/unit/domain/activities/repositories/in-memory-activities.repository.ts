import {
  ActivitiesRepository,
  type ActivityFilters,
} from "@/domain/activities/application/repositories/activities.repository";
import type { Activity } from "@/domain/activities/enterprise/entities/activity";
import type { ActivitySummary, ActivityDetail } from "@/domain/activities/enterprise/read-models/activity-read-models";

export class InMemoryActivitiesRepository extends ActivitiesRepository {
  public items: Activity[] = [];

  async findMany(requesterId: string, requesterRole: string, filters: ActivityFilters = {}): Promise<ActivitySummary[]> {
    let results = this.items;

    if (requesterRole !== "admin") {
      results = results.filter((a) => a.ownerId === requesterId);
    }

    if (filters.type) results = results.filter((a) => a.type === filters.type);
    if (filters.completed !== undefined) results = results.filter((a) => a.completed === filters.completed);
    if (filters.dealId) results = results.filter((a) => a.dealId === filters.dealId || (a.additionalDealIds ?? "").includes(filters.dealId!));
    if (filters.contactId) results = results.filter((a) => a.contactId === filters.contactId);
    if (filters.leadId) results = results.filter((a) => a.leadId === filters.leadId);
    if (filters.outcome === "failed") results = results.filter((a) => !!a.failedAt);
    if (filters.outcome === "skipped") results = results.filter((a) => !!a.skippedAt);

    return results.map((a) => ({
      id: a.id.toString(),
      ownerId: a.ownerId,
      type: a.type,
      subject: a.subject,
      description: a.description ?? null,
      dueDate: a.dueDate ?? null,
      completed: a.completed,
      completedAt: a.completedAt ?? null,
      failedAt: a.failedAt ?? null,
      failReason: a.failReason ?? null,
      skippedAt: a.skippedAt ?? null,
      skipReason: a.skipReason ?? null,
      dealId: a.dealId ?? null,
      additionalDealIds: a.additionalDealIds ?? null,
      contactId: a.contactId ?? null,
      contactIds: a.contactIds ?? null,
      leadContactIds: a.leadContactIds ?? null,
      leadId: a.leadId ?? null,
      partnerId: a.partnerId ?? null,
      callContactType: a.callContactType ?? null,
      meetingNoShow: a.meetingNoShow,
      gotoCallId: null,
      gotoCallOutcome: null,
      gotoDuration: null,
      gotoTranscriptText: null,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      owner: null,
      deal: null,
      contact: null,
      lead: null,
      partner: null,
      cadenceActivity: null,
    }));
  }

  async findById(id: string, requesterId: string, requesterRole: string): Promise<ActivityDetail | null> {
    const activity = this.items.find((a) => a.id.toString() === id);
    if (!activity) return null;
    if (requesterRole !== "admin" && activity.ownerId !== requesterId) return null;

    return {
      id: activity.id.toString(),
      ownerId: activity.ownerId,
      type: activity.type,
      subject: activity.subject,
      description: activity.description ?? null,
      dueDate: activity.dueDate ?? null,
      completed: activity.completed,
      completedAt: activity.completedAt ?? null,
      failedAt: activity.failedAt ?? null,
      failReason: activity.failReason ?? null,
      skippedAt: activity.skippedAt ?? null,
      skipReason: activity.skipReason ?? null,
      dealId: activity.dealId ?? null,
      additionalDealIds: activity.additionalDealIds ?? null,
      contactId: activity.contactId ?? null,
      contactIds: activity.contactIds ?? null,
      leadContactIds: activity.leadContactIds ?? null,
      leadId: activity.leadId ?? null,
      partnerId: activity.partnerId ?? null,
      callContactType: activity.callContactType ?? null,
      meetingNoShow: activity.meetingNoShow,
      gotoCallId: null,
      gotoRecordingId: null,
      gotoRecordingDriveId: null,
      gotoRecordingUrl: null,
      gotoRecordingUrl2: null,
      gotoTranscriptionJobId: null,
      gotoTranscriptionJobId2: null,
      gotoTranscriptText: null,
      gotoCallOutcome: null,
      gotoDuration: null,
      emailMessageId: null,
      emailThreadId: null,
      emailSubject: null,
      emailFromAddress: null,
      emailFromName: null,
      emailReplied: activity.emailReplied,
      emailTrackingToken: null,
      emailOpenCount: activity.emailOpenCount,
      emailOpenedAt: null,
      emailLastOpenedAt: null,
      emailLinkClickCount: activity.emailLinkClickCount,
      emailLinkClickedAt: null,
      emailLastLinkClickedAt: null,
      createdAt: activity.createdAt,
      updatedAt: activity.updatedAt,
      owner: null,
      deal: null,
      contact: null,
      lead: null,
      partner: null,
      cadenceActivity: null,
      contacts: [],
      whatsappMessages: [],
    };
  }

  async findByIdRaw(id: string): Promise<Activity | null> {
    return this.items.find((a) => a.id.toString() === id) ?? null;
  }

  async findFirst(where: { gotoCallId?: string }): Promise<Activity | null> {
    if (where.gotoCallId) {
      return this.items.find((a) => a.gotoCallId === where.gotoCallId) ?? null;
    }
    return null;
  }

  async save(activity: Activity): Promise<void> {
    const idx = this.items.findIndex((a) => a.id.equals(activity.id));
    if (idx >= 0) this.items[idx] = activity;
    else this.items.push(activity);
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((a) => a.id.toString() !== id);
  }

  async markThreadReplied(_threadId: string): Promise<void> {}
}
