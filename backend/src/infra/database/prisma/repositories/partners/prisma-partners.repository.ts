import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { PartnersRepository, type PartnerFilters } from "@/domain/partners/application/repositories/partners.repository";
import type { Partner } from "@/domain/partners/enterprise/entities/partner";
import type { PartnerSummary, PartnerDetail } from "@/domain/partners/enterprise/read-models/partner-read-models";
import { PartnerMapper } from "../../mappers/partners/partner.mapper";
import { mergeActivities } from "@/infra/shared/timeline/merge-activities";
import { computeLastContactAt } from "@/infra/shared/timeline/last-contact";

/**
 * Rich activity field set for the partner detail timeline — mirrors the lead page so the
 * partner page can render the full activity experience (GoTo, e-mail tracking, outcomes).
 * `emailCampaignSendId` is selected to enrich campaign e-mails with click data afterwards.
 */
const RICH_ACTIVITY_SELECT = {
  id: true,
  type: true,
  subject: true,
  completed: true,
  completedAt: true,
  dueDate: true,
  createdAt: true,
  description: true,
  failedAt: true,
  failReason: true,
  skippedAt: true,
  skipReason: true,
  contactId: true,
  leadContactIds: true,
  callContactType: true,
  gotoCallId: true,
  gotoCallOutcome: true,
  gotoDuration: true,
  gotoRecordingUrl: true,
  gotoRecordingUrl2: true,
  gotoTranscriptText: true,
  emailThreadId: true,
  emailSubject: true,
  emailFromAddress: true,
  emailFromName: true,
  emailReplied: true,
  emailOpenCount: true,
  emailOpenedAt: true,
  emailLinkClickCount: true,
  emailLinkClickedAt: true,
  emailCampaignSendId: true,
} as const;

@Injectable()
export class PrismaPartnersRepository extends PartnersRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findMany(requesterId: string, requesterRole: string, filters: PartnerFilters = {}): Promise<PartnerSummary[]> {
    let ownerFilter: Record<string, unknown>;
    if (requesterRole === "admin") {
      ownerFilter = !filters.owner || filters.owner === "all"
        ? {}
        : filters.owner === "mine" ? { ownerId: requesterId } : { ownerId: filters.owner };
    } else {
      const shared = await this.prisma.sharedEntity.findMany({
        where: { entityType: "partner", sharedWithUserId: requesterId },
        select: { entityId: true },
      });
      const sharedIds = shared.map((s) => s.entityId);
      ownerFilter = sharedIds.length > 0
        ? { OR: [{ ownerId: requesterId }, { id: { in: sharedIds } }] }
        : { ownerId: requesterId };
    }

    const rows = await this.prisma.partner.findMany({
      where: {
        ...ownerFilter,
        ...(filters.search && {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { partnerType: { contains: filters.search, mode: "insensitive" } },
            { expertise: { contains: filters.search, mode: "insensitive" } },
            { email: { contains: filters.search, mode: "insensitive" } },
          ],
        }),
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { contacts: true, activities: true, referredLeads: true } },
      },
      orderBy: [{ lastContactDate: "desc" }, { createdAt: "desc" }],
    });

    return rows.map((row) => ({
      id: row.id,
      ownerId: row.ownerId,
      name: row.name,
      legalName: row.legalName,
      partnerType: row.partnerType,
      email: row.email,
      phone: row.phone,
      city: row.city,
      state: row.state,
      country: row.country,
      industry: row.industry,
      expertise: row.expertise,
      companySize: row.companySize,
      lastContactDate: row.lastContactDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      owner: row.owner,
      _count: row._count,
    }));
  }

  async findById(id: string, requesterId: string, requesterRole: string): Promise<PartnerDetail | null> {
    const row = await this.prisma.partner.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { contacts: true, activities: true, referredLeads: true } },
        contacts: {
          select: { id: true, name: true, email: true, phone: true, whatsapp: true, role: true, isPrimary: true, linkedin: true, instagram: true, status: true },
          orderBy: { name: "asc" },
        },
        activities: {
          select: RICH_ACTIVITY_SELECT,
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        referredLeads: {
          select: { id: true, businessName: true, status: true, convertedToOrganizationId: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!row) return null;

    // Access check for non-admin
    if (requesterRole !== "admin" && row.ownerId !== requesterId) {
      const shared = await this.prisma.sharedEntity.findFirst({
        where: { entityType: "partner", entityId: id, sharedWithUserId: requesterId },
      });
      if (!shared) return null;
    }

    const r = row as any;

    // Timeline roll-up: also show activities of the partner's contacts, even when the
    // activity has only contactId (inbound sync) and not partnerId. Merge + dedup + sort.
    // Uses the same rich select as the partner's own activities so the merged shape is uniform.
    const contactIds: string[] = (r.contacts ?? []).map((c: { id: string }) => c.id);
    let activities = r.activities;
    if (contactIds.length > 0) {
      const viaContacts = await this.prisma.activity.findMany({
        where: { contactId: { in: contactIds } },
        select: RICH_ACTIVITY_SELECT,
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      activities = mergeActivities(r.activities, viaContacts, 50);
    }

    // Enrich campaign e-mail activities with click data + recipient address (one extra query).
    const campaignSendIds = (activities as Array<{ emailCampaignSendId?: string | null }>)
      .map((a) => a.emailCampaignSendId)
      .filter((sid): sid is string => !!sid);

    const clickDataMap = new Map<string, Record<string, number>>();
    const recipientEmailMap = new Map<string, string>();
    if (campaignSendIds.length > 0) {
      const sends = await this.prisma.emailCampaignSend.findMany({
        where: { id: { in: campaignSendIds } },
        select: { id: true, clickData: true, recipient: { select: { email: true } } },
      });
      for (const send of sends) {
        if (send.clickData) {
          try { clickDataMap.set(send.id, JSON.parse(send.clickData)); } catch { /* ignore */ }
        }
        if (send.recipient?.email) recipientEmailMap.set(send.id, send.recipient.email);
      }
    }

    const mappedActivities = (activities as Array<Record<string, unknown>>).map((a) => {
      const sendId = a.emailCampaignSendId as string | null | undefined;
      const rawClickData = sendId ? (clickDataMap.get(sendId) ?? {}) : {};
      const clickUrls = Object.entries(rawClickData)
        .map(([url, count]) => ({ url, count }))
        .sort((x, y) => y.count - x.count);
      return {
        id: a.id as string,
        type: a.type as string,
        subject: a.subject as string,
        description: (a.description as string | null) ?? null,
        completed: a.completed as boolean,
        completedAt: (a.completedAt as Date | null) ?? null,
        dueDate: (a.dueDate as Date | null) ?? null,
        createdAt: a.createdAt as Date,
        failedAt: (a.failedAt as Date | null) ?? null,
        failReason: (a.failReason as string | null) ?? null,
        skippedAt: (a.skippedAt as Date | null) ?? null,
        skipReason: (a.skipReason as string | null) ?? null,
        contactId: (a.contactId as string | null) ?? null,
        leadContactIds: (a.leadContactIds as string | null) ?? null,
        callContactType: (a.callContactType as string | null) ?? null,
        gotoCallId: (a.gotoCallId as string | null) ?? null,
        gotoCallOutcome: (a.gotoCallOutcome as string | null) ?? null,
        gotoDuration: (a.gotoDuration as number | null) ?? null,
        gotoRecordingUrl: (a.gotoRecordingUrl as string | null) ?? null,
        gotoRecordingUrl2: (a.gotoRecordingUrl2 as string | null) ?? null,
        gotoTranscriptText: (a.gotoTranscriptText as string | null) ?? null,
        emailThreadId: (a.emailThreadId as string | null) ?? null,
        emailSubject: (a.emailSubject as string | null) ?? null,
        emailFromAddress: (a.emailFromAddress as string | null) ?? null,
        emailFromName: (a.emailFromName as string | null) ?? null,
        emailReplied: (a.emailReplied as boolean | null) ?? false,
        emailOpenCount: (a.emailOpenCount as number | null) ?? 0,
        emailOpenedAt: (a.emailOpenedAt as Date | null) ?? null,
        emailLinkClickCount: (a.emailLinkClickCount as number | null) ?? 0,
        emailLinkClickedAt: (a.emailLinkClickedAt as Date | null) ?? null,
        emailToAddress: sendId ? (recipientEmailMap.get(sendId) ?? null) : null,
        clickUrls,
      };
    });

    return {
      id: r.id,
      ownerId: r.ownerId,
      name: r.name,
      legalName: r.legalName,
      partnerType: r.partnerType,
      email: r.email,
      phone: r.phone,
      city: r.city,
      state: r.state,
      country: r.country,
      industry: r.industry,
      expertise: r.expertise,
      companySize: r.companySize,
      lastContactDate: r.lastContactDate,
      foundationDate: r.foundationDate,
      website: r.website,
      whatsapp: r.whatsapp,
      zipCode: r.zipCode,
      streetAddress: r.streetAddress,
      employeeCount: r.employeeCount,
      description: r.description,
      notes: r.notes,
      linkedin: r.linkedin,
      instagram: r.instagram,
      facebook: r.facebook,
      twitter: r.twitter,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      owner: r.owner,
      _count: r._count,
      contacts: r.contacts,
      activities: mappedActivities,
      lastContactAt: computeLastContactAt(mappedActivities),
      referredLeads: r.referredLeads,
    };
  }

  async findByIdRaw(id: string): Promise<Partner | null> {
    const row = await this.prisma.partner.findUnique({ where: { id } });
    if (!row) return null;
    return PartnerMapper.toDomain(row);
  }

  async save(partner: Partner): Promise<void> {
    const data = PartnerMapper.toPrisma(partner);
    await this.prisma.partner.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.partner.delete({ where: { id } });
  }
}
