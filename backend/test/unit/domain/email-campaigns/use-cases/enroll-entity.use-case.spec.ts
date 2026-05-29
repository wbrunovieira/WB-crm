import { describe, it, expect, beforeEach } from "vitest";
import { EnrollEntityUseCase } from "@/domain/email-campaigns/application/use-cases/enroll-entity.use-case";
import { InMemoryEmailCampaignsRepository } from "../fakes/in-memory-email-campaigns.repository";
import { InMemoryEmailCampaignRecipientsRepository } from "../fakes/in-memory-email-campaign-recipients.repository";
import { CreateEmailCampaignUseCase } from "@/domain/email-campaigns/application/use-cases/create-email-campaign.use-case";
import {
  EnrollmentSourceRepository,
  type LeadEnrollmentView,
  type OrgEnrollmentView,
} from "@/domain/email-campaigns/application/repositories/enrollment-source.repository";

const OWNER = "owner-1";
const FROM = "bruno@wbdigitalsolutions.com";

const LEAD_WITH_EMAIL: LeadEnrollmentView = {
  id: "lead-1", businessName: "Empresa Teste", email: "empresa@teste.com", segment: null, sourceGroup: null,
  contacts: [
    { id: "lc-1", name: "João", email: "joao@teste.com", role: "CEO" },
    { id: "lc-2", name: "Maria", email: null, role: null },
  ],
};
const LEAD_WITHOUT_EMAIL: LeadEnrollmentView = {
  id: "lead-2", businessName: "Empresa Sem Email", email: null, segment: null, sourceGroup: null,
  contacts: [
    { id: "lc-3", name: "Carlos", email: "carlos@sem.com", role: "CTO" },
    { id: "lc-4", name: "Ana", email: "ana@sem.com", role: null },
  ],
};
const LEAD_MIXED_CONTACTS: LeadEnrollmentView = {
  id: "lead-3", businessName: "Empresa Mista", email: "mista@empresa.com", segment: null, sourceGroup: null,
  contacts: [
    { id: "lc-5", name: "Pedro", email: "pedro@mista.com", role: "COO" },
    { id: "lc-6", name: "Sandra", email: null, role: null },
    { id: "lc-7", name: "Tiago", email: null, role: null },
  ],
};
const ORG_WITH_EMAIL: OrgEnrollmentView = {
  id: "org-1", name: "Org Teste", email: "org@teste.com", segment: null, sourceGroup: null,
  contacts: [
    { id: "c-1", name: "Ana", email: "ana@teste.com", role: "Gerente" },
    { id: "c-2", name: "Bob", email: null, role: null },
  ],
};

class FakeEnrollmentSource extends EnrollmentSourceRepository {
  leads: Record<string, LeadEnrollmentView> = {};
  orgs: Record<string, OrgEnrollmentView> = {};
  async findLeadEnrollment(id: string) { return this.leads[id] ?? null; }
  async findOrgEnrollment(id: string) { return this.orgs[id] ?? null; }
  async findBulkEnrollmentCandidates() { return []; }
}

describe("EnrollEntityUseCase", () => {
  let campaigns: InMemoryEmailCampaignsRepository;
  let recipients: InMemoryEmailCampaignRecipientsRepository;
  let source: FakeEnrollmentSource;
  let sut: EnrollEntityUseCase;
  let campaignId: string;

  beforeEach(async () => {
    campaigns = new InMemoryEmailCampaignsRepository();
    recipients = new InMemoryEmailCampaignRecipientsRepository();
    source = new FakeEnrollmentSource();
    sut = new EnrollEntityUseCase(source, campaigns, recipients);

    const created = await new CreateEmailCampaignUseCase(campaigns).execute({ name: "Test Campaign", fromEmail: FROM, ownerId: OWNER });
    campaignId = (created.value as { id: string }).id;
  });

  it("enrolls lead.email + all leadContacts with email", async () => {
    source.leads["lead-1"] = LEAD_WITH_EMAIL;
    const result = await sut.execute({ campaignId, entityType: "lead", entityId: "lead-1", ownerId: OWNER });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) { expect(result.value.enrolled).toBe(2); expect(result.value.skipped).toBe(0); }
    expect(recipients.items).toHaveLength(2);
  });

  it("enrolls only leadContacts when lead has no email", async () => {
    source.leads["lead-2"] = LEAD_WITHOUT_EMAIL;
    const result = await sut.execute({ campaignId, entityType: "lead", entityId: "lead-2", ownerId: OWNER });
    expect(result.isRight()).toBe(true);
    if (result.isRight()) { expect(result.value.enrolled).toBe(2); expect(result.value.skipped).toBe(0); }
  });

  it("skips already-enrolled recipients (deduplication)", async () => {
    source.leads["lead-1"] = LEAD_WITH_EMAIL;
    const first = await sut.execute({ campaignId, entityType: "lead", entityId: "lead-1", ownerId: OWNER });
    if (first.isRight()) expect(first.value.enrolled).toBe(2);

    const second = await sut.execute({ campaignId, entityType: "lead", entityId: "lead-1", ownerId: OWNER });
    expect(second.isRight()).toBe(true);
    if (second.isRight()) { expect(second.value.enrolled).toBe(0); expect(second.value.skipped).toBe(2); }
  });

  it("returns error if campaign not found", async () => {
    const result = await sut.execute({ campaignId: "non-existent-campaign", entityType: "lead", entityId: "lead-1", ownerId: OWNER });
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.message).toBe("Campaign not found");
  });

  it("returns error if lead not found", async () => {
    const result = await sut.execute({ campaignId, entityType: "lead", entityId: "non-existent-lead", ownerId: OWNER });
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.message).toBe("Lead not found");
  });

  it("enrolls org.email + all org contacts with email", async () => {
    source.orgs["org-1"] = ORG_WITH_EMAIL;
    const result = await sut.execute({ campaignId, entityType: "organization", entityId: "org-1", ownerId: OWNER });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) { expect(result.value.enrolled).toBe(2); expect(result.value.skipped).toBe(0); }
    expect(recipients.items).toHaveLength(2);
    expect(recipients.items.every((r) => r.recipientType === "CONTACT")).toBe(true);
  });

  it("returns error if organization not found", async () => {
    const result = await sut.execute({ campaignId, entityType: "organization", entityId: "non-existent-org", ownerId: OWNER });
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.message).toBe("Organization not found");
  });

  it("skips contacts with null email silently", async () => {
    source.leads["lead-3"] = LEAD_MIXED_CONTACTS;
    const result = await sut.execute({ campaignId, entityType: "lead", entityId: "lead-3", ownerId: OWNER });
    expect(result.isRight()).toBe(true);
    if (result.isRight()) { expect(result.value.enrolled).toBe(2); expect(result.value.skipped).toBe(0); }
  });

  it("propagates segment (setor) and sourceGroup into the recipient customVars", async () => {
    source.leads["lead-cv"] = {
      id: "lead-cv", businessName: "ACME", email: "acme@x.com", segment: "tecnologia", sourceGroup: "G-2026",
      contacts: [],
    };
    await sut.execute({ campaignId, entityType: "lead", entityId: "lead-cv", ownerId: OWNER });

    const rec = (await recipients.findByCampaign(campaignId)).find((r) => r.email === "acme@x.com")!;
    expect(rec.customVars).toMatchObject({ setor: "tecnologia", sourceGroup: "G-2026" });
  });
});
