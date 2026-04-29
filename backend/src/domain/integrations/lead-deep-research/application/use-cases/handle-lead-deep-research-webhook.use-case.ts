import { Injectable, Logger } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { LeadsRepository } from "@/domain/leads/application/repositories/leads.repository";
import { LeadContactsRepository } from "@/domain/leads/application/repositories/lead-contacts.repository";
import { LeadAgentResearchLogRepository } from "../repositories/lead-agent-research-log.repository";
import { BulkResearchSessionRepository } from "../repositories/bulk-research-session.repository";
import { StartBulkLeadResearchUseCase } from "./start-bulk-lead-research.use-case";

export interface LeadDeepResearchWebhookPayload {
  jobId: string;
  leadId: string;
  status: "completed" | "error";
  updates?: Partial<{
    registeredName: string;
    companyOwner: string;
    foundationDate: string;
    legalNature: string;
    segment: string;
    companySize: string;
    employeesCount: number;
    revenueRange: string;
    description: string;
    website: string;
    email: string;
    phone: string;
    phone2: string;
    whatsapp: string;
    instagram: string;
    linkedin: string;
    facebook: string;
    twitter: string;
    tiktok: string;
    metaAds: string | Record<string, unknown>;
    googleAds: string;
    companyRegistrationID: string;
  }>;
  // Fields that always overwrite (even when existing value present) — used by focused research
  forcedUpdates?: Partial<{
    registeredName: string;
    companyOwner: string;
    foundationDate: string;
    legalNature: string;
    segment: string;
    companySize: string;
    employeesCount: number;
    revenueRange: string;
    description: string;
    website: string;
    email: string;
    phone: string;
    phone2: string;
    whatsapp: string;
    instagram: string;
    linkedin: string;
    facebook: string;
    twitter: string;
    tiktok: string;
    metaAds: string | Record<string, unknown>;
    googleAds: string;
    companyRegistrationID: string;
  }>;
  newContacts?: Array<{
    name: string;
    email?: string | null;
    phone?: string | null;
    role?: string | null;
    linkedin?: string | null;
  }>;
  summary?: string;
  error?: string;
}

type Output = Either<Error, { updatedFields: string[]; newContactsCount: number; updatedContactsCount: number }>;

@Injectable()
export class HandleLeadDeepResearchWebhookUseCase {
  private readonly logger = new Logger(HandleLeadDeepResearchWebhookUseCase.name);

  constructor(
    private readonly leadsRepo: LeadsRepository,
    private readonly contactsRepo: LeadContactsRepository,
    private readonly logRepo: LeadAgentResearchLogRepository,
    private readonly sessionRepo: BulkResearchSessionRepository,
    private readonly startBulkUseCase: StartBulkLeadResearchUseCase,
  ) {}

  async execute(payload: LeadDeepResearchWebhookPayload): Promise<Output> {
    const lead = await this.leadsRepo.findByIdRaw(payload.leadId);
    if (!lead) return left(new Error("Lead não encontrado"));

    const updatedFields: string[] = [];
    const proposedFields: Array<{ field: string; foundValue: string; skippedReason: string }> = [];

    if (payload.status === "completed" && payload.updates) {
      const updates: Record<string, unknown> = {};

      for (const [field, value] of Object.entries(payload.updates)) {
        if (value === null || value === undefined || value === "") continue;

        const currentValue = (lead as unknown as Record<string, unknown>)[field];
        if (!currentValue) {
          // Field is empty — auto-fill; serialize objects to JSON string for Prisma
          let finalValue: unknown = value;
          if (field === "foundationDate") {
            finalValue = new Date(value as string);
          } else if (value !== null && typeof value === "object") {
            finalValue = JSON.stringify(value);
          }
          updates[field] = finalValue;
          updatedFields.push(field);
        } else {
          // Field already has value — log as proposed but skip
          proposedFields.push({
            field,
            foundValue: String(value),
            skippedReason: "Campo já possuía valor",
          });
        }
      }

      // forcedUpdates — always overwrite (focused research)
      if (payload.forcedUpdates) {
        for (const [field, value] of Object.entries(payload.forcedUpdates)) {
          if (value === null || value === undefined || value === "") continue;
          let finalValue: unknown = value;
          if (field === "foundationDate") {
            finalValue = new Date(value as string);
          } else if (value !== null && typeof value === "object") {
            finalValue = JSON.stringify(value);
          }
          updates[field] = finalValue;
          if (!updatedFields.includes(field)) updatedFields.push(field);
        }
      }

      // Accumulate agent-filled fields across re-research runs so badges persist
      const previousFields: string[] = (() => {
        try { return JSON.parse(lead.agentUpdatedFields ?? "[]") as string[]; } catch { return []; }
      })();
      const mergedFields = Array.from(new Set([...previousFields, ...updatedFields]));

      lead.update({
        ...updates,
        agentSummary: payload.summary,
        agentUpdatedFields: JSON.stringify(mergedFields),
        agentResearchAt: new Date(),
      } as Parameters<typeof lead.update>[0]);

      await this.leadsRepo.save(lead);
    }

    // Upsert contacts found by agent:
    // - new name → create (with all available fields including linkedin)
    // - existing name → fill only empty fields (never overwrite populated data)
    let newContactsCount = 0;
    let updatedContactsCount = 0;
    if (payload.newContacts?.length) {
      const existing = await this.contactsRepo.findByLead(payload.leadId);
      const existingByName = new Map(existing.map((c) => [c.name.toLowerCase().trim(), c]));

      for (const contact of payload.newContacts) {
        if (!contact.name) continue;
        const nameLower = contact.name.toLowerCase().trim();
        const found = existingByName.get(nameLower);

        if (found) {
          // Fill only fields that are currently empty
          const patch: Record<string, string> = {};
          if (!found.phone && contact.phone) patch.phone = contact.phone;
          if (!found.email && contact.email) patch.email = contact.email;
          if (!found.role && contact.role) patch.role = contact.role;
          if (!found.linkedin && contact.linkedin) patch.linkedin = contact.linkedin;
          if (Object.keys(patch).length > 0) {
            await this.contactsRepo.update(found.id, patch);
            updatedContactsCount++;
          }
        } else {
          await this.contactsRepo.create({
            leadId: payload.leadId,
            name: contact.name,
            email: contact.email ?? undefined,
            phone: contact.phone ?? undefined,
            role: contact.role ?? undefined,
            linkedin: contact.linkedin ?? undefined,
          });
          newContactsCount++;
        }
      }
    }

    // Persist audit log
    await this.logRepo.create({
      leadId: payload.leadId,
      jobId: payload.jobId,
      updatedFields,
      proposedFields,
      summary: payload.summary,
      status: payload.status,
      error: payload.error,
    });

    // Advance bulk research queue if this lead was part of a session
    setImmediate(() => void this.advanceBulkQueue(payload.leadId));

    return right({ updatedFields, newContactsCount, updatedContactsCount });
  }

  private async advanceBulkQueue(completedLeadId: string): Promise<void> {
    const session = await this.sessionRepo.findActiveContainingLead(completedLeadId);
    if (!session) return;

    const updated = await this.sessionRepo.markLeadCompleted(session.id, completedLeadId);
    const remaining = updated.leadIds.filter((id) => !updated.completedIds.includes(id));

    if (remaining.length === 0) {
      await this.sessionRepo.markCompleted(session.id);
      this.logger.log(`Bulk session ${session.id} completed: ${updated.total} leads`);
      return;
    }

    const nextLeadId = remaining[0];
    this.logger.log(`Bulk session ${session.id}: advancing to lead ${nextLeadId} (${updated.completedIds.length}/${updated.total})`);
    await this.startBulkUseCase.triggerLead(nextLeadId, session.userId, "sdr");
  }
}
