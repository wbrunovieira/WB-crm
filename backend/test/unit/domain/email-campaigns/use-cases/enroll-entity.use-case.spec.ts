import { describe, it, expect, beforeEach, vi } from "vitest";
import { EnrollEntityUseCase } from "@/domain/email-campaigns/application/use-cases/enroll-entity.use-case";
import { InMemoryEmailCampaignsRepository } from "../fakes/in-memory-email-campaigns.repository";
import { InMemoryEmailCampaignRecipientsRepository } from "../fakes/in-memory-email-campaign-recipients.repository";
import { CreateEmailCampaignUseCase } from "@/domain/email-campaigns/application/use-cases/create-email-campaign.use-case";

const OWNER = "owner-1";
const FROM = "bruno@wbdigitalsolutions.com";

const LEAD_WITH_EMAIL = {
  id: "lead-1",
  businessName: "Empresa Teste",
  email: "empresa@teste.com",
  segment: null,
  sourceGroup: null,
  leadContacts: [
    { id: "lc-1", name: "João", email: "joao@teste.com", role: "CEO" },
    { id: "lc-2", name: "Maria", email: null, role: null },
  ],
};

const LEAD_WITHOUT_EMAIL = {
  id: "lead-2",
  businessName: "Empresa Sem Email",
  email: null,
  segment: null,
  sourceGroup: null,
  leadContacts: [
    { id: "lc-3", name: "Carlos", email: "carlos@sem.com", role: "CTO" },
    { id: "lc-4", name: "Ana", email: "ana@sem.com", role: null },
  ],
};

const LEAD_MIXED_CONTACTS = {
  id: "lead-3",
  businessName: "Empresa Mista",
  email: "mista@empresa.com",
  segment: null,
  sourceGroup: null,
  leadContacts: [
    { id: "lc-5", name: "Pedro", email: "pedro@mista.com", role: "COO" },
    { id: "lc-6", name: "Sandra", email: null, role: null },
    { id: "lc-7", name: "Tiago", email: null, role: null },
  ],
};

const ORG_WITH_EMAIL = {
  id: "org-1",
  name: "Org Teste",
  email: "org@teste.com",
  segment: null,
  sourceGroup: null,
  contacts: [
    { id: "c-1", name: "Ana", email: "ana@teste.com", role: "Gerente" },
    { id: "c-2", name: "Bob", email: null, role: null },
  ],
};

describe("EnrollEntityUseCase", () => {
  let campaigns: InMemoryEmailCampaignsRepository;
  let recipients: InMemoryEmailCampaignRecipientsRepository;
  let fakePrisma: {
    lead: { findUnique: ReturnType<typeof vi.fn> };
    organization: { findUnique: ReturnType<typeof vi.fn> };
  };
  let sut: EnrollEntityUseCase;
  let campaignId: string;

  beforeEach(async () => {
    campaigns = new InMemoryEmailCampaignsRepository();
    recipients = new InMemoryEmailCampaignRecipientsRepository();
    fakePrisma = {
      lead: { findUnique: vi.fn() },
      organization: { findUnique: vi.fn() },
    };
    sut = new EnrollEntityUseCase(fakePrisma as any, campaigns, recipients);

    // Create a campaign to use in tests
    const createCampaign = new CreateEmailCampaignUseCase(campaigns);
    const created = await createCampaign.execute({ name: "Test Campaign", fromEmail: FROM, ownerId: OWNER });
    campaignId = (created.value as { id: string }).id;
  });

  it("enrolls lead.email + all leadContacts with email", async () => {
    fakePrisma.lead.findUnique.mockResolvedValueOnce(LEAD_WITH_EMAIL);

    const result = await sut.execute({
      campaignId,
      entityType: "lead",
      entityId: "lead-1",
      ownerId: OWNER,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      // lead.email (empresa@teste.com) + lc-1 (joao@teste.com) = 2; lc-2 has null email so skipped
      expect(result.value.enrolled).toBe(2);
      expect(result.value.skipped).toBe(0);
    }
    expect(recipients.items).toHaveLength(2);
  });

  it("enrolls only leadContacts when lead has no email", async () => {
    fakePrisma.lead.findUnique.mockResolvedValueOnce(LEAD_WITHOUT_EMAIL);

    const result = await sut.execute({
      campaignId,
      entityType: "lead",
      entityId: "lead-2",
      ownerId: OWNER,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.enrolled).toBe(2);
      expect(result.value.skipped).toBe(0);
    }
  });

  it("skips already-enrolled recipients (deduplication)", async () => {
    fakePrisma.lead.findUnique.mockResolvedValue(LEAD_WITH_EMAIL);

    // First enrollment
    const first = await sut.execute({
      campaignId,
      entityType: "lead",
      entityId: "lead-1",
      ownerId: OWNER,
    });
    expect(first.isRight()).toBe(true);
    if (first.isRight()) {
      expect(first.value.enrolled).toBe(2);
    }

    // Second enrollment — everything should be skipped
    const second = await sut.execute({
      campaignId,
      entityType: "lead",
      entityId: "lead-1",
      ownerId: OWNER,
    });
    expect(second.isRight()).toBe(true);
    if (second.isRight()) {
      expect(second.value.enrolled).toBe(0);
      expect(second.value.skipped).toBe(2);
    }
  });

  it("returns error if campaign not found", async () => {
    const result = await sut.execute({
      campaignId: "non-existent-campaign",
      entityType: "lead",
      entityId: "lead-1",
      ownerId: OWNER,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.message).toBe("Campaign not found");
    }
  });

  it("returns error if lead not found", async () => {
    fakePrisma.lead.findUnique.mockResolvedValueOnce(null);

    const result = await sut.execute({
      campaignId,
      entityType: "lead",
      entityId: "non-existent-lead",
      ownerId: OWNER,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.message).toBe("Lead not found");
    }
  });

  it("enrolls org.email + all org contacts with email", async () => {
    fakePrisma.organization.findUnique.mockResolvedValueOnce(ORG_WITH_EMAIL);

    const result = await sut.execute({
      campaignId,
      entityType: "organization",
      entityId: "org-1",
      ownerId: OWNER,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      // org.email (org@teste.com) + c-1 (ana@teste.com) = 2; c-2 has null email so skipped
      expect(result.value.enrolled).toBe(2);
      expect(result.value.skipped).toBe(0);
    }
    expect(recipients.items).toHaveLength(2);
  });

  it("returns error if organization not found", async () => {
    fakePrisma.organization.findUnique.mockResolvedValueOnce(null);

    const result = await sut.execute({
      campaignId,
      entityType: "organization",
      entityId: "non-existent-org",
      ownerId: OWNER,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.message).toBe("Organization not found");
    }
  });

  it("skips contacts with null email silently", async () => {
    fakePrisma.lead.findUnique.mockResolvedValueOnce(LEAD_MIXED_CONTACTS);

    const result = await sut.execute({
      campaignId,
      entityType: "lead",
      entityId: "lead-3",
      ownerId: OWNER,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      // lead.email (mista@empresa.com) + lc-5 (pedro@mista.com) = 2; lc-6 and lc-7 have null email
      expect(result.value.enrolled).toBe(2);
      expect(result.value.skipped).toBe(0);
    }
  });
});
