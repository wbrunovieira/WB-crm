import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { LeadsRepository } from "@/domain/leads/application/repositories/leads.repository";
import { LeadContactsRepository } from "@/domain/leads/application/repositories/lead-contacts.repository";
import { LeadAgentResearchLogRepository } from "../repositories/lead-agent-research-log.repository";

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
    instagram: string;
    linkedin: string;
    facebook: string;
    twitter: string;
    tiktok: string;
  }>;
  newContacts?: Array<{
    name: string;
    email?: string | null;
    phone?: string | null;
    role?: string | null;
  }>;
  summary?: string;
  error?: string;
}

type Output = Either<Error, { updatedFields: string[]; newContactsCount: number }>;

@Injectable()
export class HandleLeadDeepResearchWebhookUseCase {
  constructor(
    private readonly leadsRepo: LeadsRepository,
    private readonly contactsRepo: LeadContactsRepository,
    private readonly logRepo: LeadAgentResearchLogRepository,
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
          // Field is empty — auto-fill
          updates[field] = field === "foundationDate" ? new Date(value as string) : value;
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

    // Create new contacts found by agent — skip if name already exists for this lead
    let newContactsCount = 0;
    if (payload.newContacts?.length) {
      const existing = await this.contactsRepo.findByLead(payload.leadId);
      const existingNames = new Set(existing.map((c) => c.name.toLowerCase().trim()));

      for (const contact of payload.newContacts) {
        if (!contact.name) continue;
        if (existingNames.has(contact.name.toLowerCase().trim())) continue;
        await this.contactsRepo.create({
          leadId: payload.leadId,
          name: contact.name,
          email: contact.email ?? undefined,
          phone: contact.phone ?? undefined,
          role: contact.role ?? undefined,
        });
        newContactsCount++;
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

    return right({ updatedFields, newContactsCount });
  }
}
