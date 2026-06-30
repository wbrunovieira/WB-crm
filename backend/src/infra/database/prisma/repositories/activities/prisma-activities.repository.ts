import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import {
  ActivitiesRepository,
  type ActivityFilters,
  type ActivityWithNames,
  type ActivityAnalysisContext,
} from "@/domain/activities/application/repositories/activities.repository";
import type { Activity } from "@/domain/activities/enterprise/entities/activity";
import type { ActivitySummary, ActivityDetail } from "@/domain/activities/enterprise/read-models/activity-read-models";
import { ActivityMapper } from "../../mappers/activities/activity.mapper";
import { sortActivitiesDefaultOrder } from "@/domain/activities/application/sort/default-activities-sort";

@Injectable()
export class PrismaActivitiesRepository extends ActivitiesRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findMany(requesterId: string, requesterRole: string, filters: ActivityFilters = {}): Promise<ActivitySummary[]> {
    const ownerFilter =
      requesterRole === "admin" && filters.owner === "all"
        ? {}
        : requesterRole === "admin" && filters.owner && filters.owner !== "mine"
          ? { ownerId: filters.owner }
          : { ownerId: requesterId };

    // Archived leads filter
    const archivedLeadFilter = filters.includeArchivedLeads
      ? {}
      : { NOT: { lead: { isArchived: true } } };

    // Outcome filter
    const outcomeFilter =
      filters.outcome === "failed"
        ? { failedAt: { not: null as Date | null } }
        : filters.outcome === "skipped"
          ? { skippedAt: { not: null as Date | null } }
          : {};

    // Pending filter — exclude failed/skipped
    const pendingFilter =
      filters.completed === false && !filters.outcome
        ? { skippedAt: null, failedAt: null }
        : {};

    // Deal filter — primary OR additionalDealIds contains
    const dealFilter = filters.dealId
      ? {
          OR: [
            { dealId: filters.dealId },
            { additionalDealIds: { contains: filters.dealId } },
          ],
        }
      : {};

    // Date filter
    const dateFilter =
      filters.dateFrom || filters.dateTo
        ? {
            dueDate: {
              ...(filters.dateFrom && { gte: new Date(filters.dateFrom) }),
              ...(filters.dateTo && { lte: new Date(`${filters.dateTo}T23:59:59.999Z`) }),
            },
          }
        : {};

    // Ordering
    type OrderClause = Record<string, string | Record<string, string>>;
    const orderBy: OrderClause[] = this.buildOrderBy(filters.sortBy);

    const rows = await this.prisma.activity.findMany({
      where: {
        ...ownerFilter,
        ...(archivedLeadFilter as object),
        ...(filters.type && { type: filters.type }),
        ...(filters.completed !== undefined && { completed: filters.completed }),
        ...pendingFilter,
        ...dealFilter,
        ...(filters.contactId && { contactId: filters.contactId }),
        ...(filters.leadId && { leadId: filters.leadId }),
        ...(filters.leadSearch && { lead: { businessName: { contains: filters.leadSearch, mode: "insensitive" as const } } }),
        ...outcomeFilter,
        ...dateFilter,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        deal: { select: { id: true, title: true, organization: { select: { id: true, name: true } } } },
        contact: { select: { id: true, name: true, organization: { select: { id: true, name: true } }, partner: { select: { id: true, name: true } } } },
        lead: { select: { id: true, businessName: true, isArchived: true, starRating: true } },
        partner: { select: { id: true, name: true } },
        organization: { select: { id: true, name: true } },
        cadenceActivity: {
          select: {
            id: true,
            leadCadence: {
              select: {
                cadence: {
                  select: {
                    id: true, name: true,
                    icp: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: orderBy as any,
    });

    const mapped: ActivitySummary[] = rows.map((r: any) => ({
      id: r.id,
      ownerId: r.ownerId,
      type: r.type,
      subject: r.subject,
      description: r.description,
      dueDate: r.dueDate,
      scheduledSendAt: r.scheduledSendAt,
      completed: r.completed,
      completedAt: r.completedAt,
      failedAt: r.failedAt,
      failReason: r.failReason,
      skippedAt: r.skippedAt,
      skipReason: r.skipReason,
      dealId: r.dealId,
      additionalDealIds: r.additionalDealIds,
      contactId: r.contactId,
      contactIds: r.contactIds,
      leadContactIds: r.leadContactIds,
      leadId: r.leadId,
      partnerId: r.partnerId,
      callContactType: r.callContactType,
      meetingNoShow: r.meetingNoShow,
      gotoCallId: r.gotoCallId,
      gotoCallOutcome: r.gotoCallOutcome,
      gotoDuration: r.gotoDuration,
      gotoTranscriptText: r.gotoTranscriptText,
      emailThreadId: r.emailThreadId,
      emailSubject: r.emailSubject,
      emailFromAddress: r.emailFromAddress,
      emailFromName: r.emailFromName,
      emailReplied: r.emailReplied,
      emailOpenCount: r.emailOpenCount,
      emailOpenedAt: r.emailOpenedAt,
      emailLinkClickCount: r.emailLinkClickCount,
      emailLinkClickedAt: r.emailLinkClickedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      owner: r.owner,
      deal: r.deal,
      contact: r.contact,
      lead: r.lead,
      partner: r.partner,
      organization: r.organization,
      cadenceActivity: r.cadenceActivity,
    }));

    // Default sort applies the "completed sinks to end of its day" rule in JS
    // because Prisma cannot ORDER BY DATE_TRUNC('day', dueDate).
    if (filters.sortBy) return mapped;

    // Leads already CALLED TODAY → their pending activities (even overdue ones)
    // sink to the bottom of the queue. Computed independent of the status filter,
    // so the default pending view still drops a lead the rep already tried today.
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const attemptedRows = await this.prisma.activity.findMany({
      where: {
        ...ownerFilter,
        type: "call",
        completed: true,
        leadId: { not: null },
        completedAt: { gte: startOfToday },
      },
      select: { leadId: true },
    });
    const attemptedLeadIds = new Set<string>();
    for (const r of attemptedRows as Array<{ leadId: string | null }>) {
      if (r.leadId) attemptedLeadIds.add(r.leadId);
    }
    return sortActivitiesDefaultOrder(mapped, attemptedLeadIds);
  }

  async findById(id: string, requesterId: string, requesterRole: string): Promise<ActivityDetail | null> {
    const ownerFilter = requesterRole === "admin" ? {} : { ownerId: requesterId };

    const row = await this.prisma.activity.findFirst({
      where: { id, ...ownerFilter },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        deal: { select: { id: true, title: true, organization: { select: { id: true, name: true } } } },
        contact: { select: { id: true, name: true, organization: { select: { id: true, name: true } }, partner: { select: { id: true, name: true } } } },
        lead: { select: { id: true, businessName: true, isArchived: true, starRating: true } },
        partner: { select: { id: true, name: true } },
        organization: { select: { id: true, name: true } },
        cadenceActivity: {
          select: {
            id: true,
            leadCadence: {
              select: {
                cadence: {
                  select: {
                    id: true, name: true,
                    icp: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
        whatsappMessages: {
          where: { mediaDriveId: { not: null } },
          select: {
            id: true, fromMe: true, pushName: true, timestamp: true,
            messageType: true, mediaDriveId: true, mediaMimeType: true,
            mediaLabel: true, mediaTranscriptText: true,
          },
          orderBy: { timestamp: "asc" },
        },
      },
    });

    if (!row) return null;

    const r = row as any;

    // Resolve additional contacts from contactIds JSON
    let contacts: Array<{ id: string; name: string; email: string | null; phone: string | null }> = [];
    if (r.contactIds) {
      try {
        const ids: string[] = JSON.parse(r.contactIds);
        if (ids.length > 0) {
          contacts = await this.prisma.contact.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true, email: true, phone: true },
          });
        }
      } catch { /* ignore */ }
    }

    return {
      id: r.id,
      ownerId: r.ownerId,
      type: r.type,
      subject: r.subject,
      description: r.description,
      dueDate: r.dueDate,
      scheduledSendAt: r.scheduledSendAt,
      completed: r.completed,
      completedAt: r.completedAt,
      failedAt: r.failedAt,
      failReason: r.failReason,
      skippedAt: r.skippedAt,
      skipReason: r.skipReason,
      dealId: r.dealId,
      additionalDealIds: r.additionalDealIds,
      contactId: r.contactId,
      contactIds: r.contactIds,
      leadContactIds: r.leadContactIds,
      leadId: r.leadId,
      partnerId: r.partnerId,
      callContactType: r.callContactType,
      meetingNoShow: r.meetingNoShow,
      gotoCallId: r.gotoCallId,
      gotoRecordingId: r.gotoRecordingId,
      gotoRecordingDriveId: r.gotoRecordingDriveId,
      gotoRecordingUrl: r.gotoRecordingUrl,
      gotoRecordingUrl2: r.gotoRecordingUrl2,
      gotoTranscriptionJobId: r.gotoTranscriptionJobId,
      gotoTranscriptionJobId2: r.gotoTranscriptionJobId2,
      gotoTranscriptText: r.gotoTranscriptText,
      gotoCallOutcome: r.gotoCallOutcome,
      gotoDuration: r.gotoDuration,
      emailMessageId: r.emailMessageId,
      emailThreadId: r.emailThreadId,
      emailSubject: r.emailSubject,
      emailFromAddress: r.emailFromAddress,
      emailFromName: r.emailFromName,
      emailReplied: r.emailReplied,
      emailTrackingToken: r.emailTrackingToken,
      emailOpenCount: r.emailOpenCount,
      emailOpenedAt: r.emailOpenedAt,
      emailLastOpenedAt: r.emailLastOpenedAt,
      emailLinkClickCount: r.emailLinkClickCount,
      emailLinkClickedAt: r.emailLinkClickedAt,
      emailLastLinkClickedAt: r.emailLastLinkClickedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      owner: r.owner,
      deal: r.deal,
      contact: r.contact,
      lead: r.lead,
      partner: r.partner,
      organization: r.organization,
      cadenceActivity: r.cadenceActivity,
      contacts,
      whatsappMessages: r.whatsappMessages ?? [],
    };
  }

  async findByIdRaw(id: string): Promise<Activity | null> {
    const row = await this.prisma.activity.findUnique({ where: { id } });
    if (!row) return null;
    return ActivityMapper.toDomain(row);
  }

  async findAnalysisContext(activityId: string): Promise<ActivityAnalysisContext | null> {
    const a = await this.prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        lead: { select: { id: true, businessName: true, segment: true, city: true } },
        contact: { select: { name: true, role: true } },
      },
    });
    if (!a) return null;
    return {
      subject: a.subject,
      gotoTranscriptText: a.gotoTranscriptText ?? null,
      gotoDuration: a.gotoDuration ?? null,
      dueDate: a.dueDate ?? null,
      lead: a.lead
        ? { id: a.lead.id, businessName: a.lead.businessName ?? null, segment: a.lead.segment ?? null, city: a.lead.city ?? null }
        : null,
      contact: a.contact ? { name: a.contact.name, role: a.contact.role ?? null } : null,
    };
  }

  async findByIdForTranscription(id: string): Promise<ActivityWithNames | null> {
    const row = await this.prisma.activity.findUnique({
      where: { id },
      include: {
        owner: { select: { name: true } },
        contact: { select: { name: true } },
        lead: { select: { businessName: true } },
        partner: { select: { name: true } },
      },
    });
    if (!row) return null;

    const clientName =
      row.contact?.name ??
      row.lead?.businessName ??
      row.partner?.name ??
      "Cliente";

    return {
      activity: ActivityMapper.toDomain(row),
      ownerName: row.owner?.name ?? "Agente",
      clientName,
    };
  }

  async findByTranscriptionJobId(jobId: string): Promise<Activity | null> {
    const row = await this.prisma.activity.findFirst({
      where: {
        OR: [
          { gotoTranscriptionJobId: jobId },
          { gotoTranscriptionJobId2: jobId },
        ],
      },
    });
    if (!row) return null;
    return ActivityMapper.toDomain(row);
  }

  async findFirst(where: { gotoCallId?: string }): Promise<Activity | null> {
    const row = await this.prisma.activity.findFirst({ where });
    if (!row) return null;
    return ActivityMapper.toDomain(row);
  }

  async findAnsweredCallsMissingRecordingId(since: Date): Promise<Activity[]> {
    const rows = await this.prisma.activity.findMany({
      where: {
        gotoCallId: { not: null },
        gotoRecordingId: null,
        gotoRecordingUrl: null,
        gotoTranscriptText: null,
        gotoDuration: { gt: 30 },
        completedAt: { gte: since },
      },
    });
    return rows.map((r) => ActivityMapper.toDomain(r));
  }

  async findDueReminders(now: Date): Promise<Activity[]> {
    const rows = await this.prisma.activity.findMany({
      where: {
        remindAt: { not: null, lte: now },
        remindedAt: null,
        completed: false,
      },
      orderBy: { remindAt: "asc" },
      take: 200,
    });
    return rows.map((r) => ActivityMapper.toDomain(r));
  }

  async markAsReminded(activityId: string, remindedAt: Date): Promise<void> {
    await this.prisma.activity.update({
      where: { id: activityId },
      data: { remindedAt },
    });
  }

  async save(activity: Activity): Promise<void> {
    const data = ActivityMapper.toPrisma(activity);
    await this.prisma.activity.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.activity.delete({ where: { id } });
  }

  async findWhatsAppDriveIds(activityId: string): Promise<string[]> {
    const messages = await this.prisma.whatsAppMessage.findMany({
      where: { activityId, mediaDriveId: { not: null } },
      select: { mediaDriveId: true },
    });
    return messages.map((m) => m.mediaDriveId!);
  }

  async markThreadReplied(threadId: string): Promise<void> {
    await this.prisma.activity.updateMany({
      where: { emailThreadId: threadId, emailReplied: false, emailFromAddress: { not: null } },
      data: { emailReplied: true },
    });
  }

  async updateEmailOpenStats(trackingToken: string, openedAt: Date): Promise<void> {
    await this.prisma.activity.updateMany({
      where: { emailTrackingToken: trackingToken },
      data: { emailOpenCount: { increment: 1 } },
    });
    await this.prisma.activity.updateMany({
      where: { emailTrackingToken: trackingToken, emailOpenedAt: null },
      data: { emailOpenedAt: openedAt },
    });
  }

  async updateEmailClickStats(trackingToken: string, clickedAt: Date): Promise<void> {
    await this.prisma.activity.updateMany({
      where: { emailTrackingToken: trackingToken },
      data: { emailLinkClickCount: { increment: 1 } },
    });
    await this.prisma.activity.updateMany({
      where: { emailTrackingToken: trackingToken, emailLinkClickedAt: null },
      data: { emailLinkClickedAt: clickedAt },
    });
  }

  async findByCampaignSendId(sendId: string): Promise<Activity | null> {
    const raw = await this.prisma.activity.findFirst({
      where: { emailCampaignSendId: sendId } as any,
    });
    return raw ? ActivityMapper.toDomain(raw) : null;
  }

  async findOutboundEmailByThreadId(threadId: string, ownerId: string): Promise<Activity[]> {
    const rows = await this.prisma.activity.findMany({
      where: { type: "email", emailThreadId: threadId, ownerId, emailFromAddress: null },
    });
    return rows.map((r) => ActivityMapper.toDomain(r));
  }

  private buildOrderBy(sortBy?: string): Record<string, any>[] {
    switch (sortBy) {
      case "dueDate-asc":
        return [
          { dueDate: { sort: "asc", nulls: "last" } },
          { lead: { starRating: { sort: "desc", nulls: "last" } } },
        ];
      case "dueDate-desc":
        return [
          { dueDate: { sort: "desc", nulls: "last" } },
          { lead: { starRating: { sort: "desc", nulls: "last" } } },
        ];
      case "created-asc":
        return [{ createdAt: "asc" }];
      case "created-desc":
        return [{ createdAt: "desc" }];
      case "subject":
        return [{ subject: "asc" }];
      default:
        // JS post-sort (sortActivitiesDefaultOrder) handles completed-last-per-day.
        // Prisma just fetches in a reasonable order for the JS sort to refine.
        return [
          { dueDate: { sort: "asc", nulls: "last" } },
          { createdAt: "asc" },
        ];
    }
  }
}
