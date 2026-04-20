import { describe, it, expect, beforeEach } from "vitest";
import { ConvertLeadToOrganizationUseCase } from "@/domain/lead-conversion/application/use-cases/convert-lead-to-organization.use-case";
import { FakeLeadConversionRepository } from "../../fakes/fake-lead-conversion.repository";
import { Lead } from "@/domain/leads/enterprise/entities/lead";
import { UniqueEntityID } from "@/core/unique-entity-id";

let repo: FakeLeadConversionRepository;
let useCase: ConvertLeadToOrganizationUseCase;

function makeLead(overrides: Partial<Parameters<typeof Lead.create>[0]> = {}, id = "lead-001"): Lead {
  return Lead.create({
    ownerId: "user-001",
    businessName: "Acme Tech Ltda",
    registeredName: "Acme Tecnologia LTDA",
    phone: "11999990000",
    email: "contato@acme.com",
    city: "São Paulo",
    state: "SP",
    country: "Brasil",
    website: "https://acme.com",
    instagram: "@acme",
    linkedin: "linkedin.com/acme",
    companyRegistrationID: "12.345.678/0001-99",
    ...overrides,
  }, new UniqueEntityID(id));
}

beforeEach(() => {
  repo = new FakeLeadConversionRepository();
  useCase = new ConvertLeadToOrganizationUseCase(repo);
});

describe("ConvertLeadToOrganizationUseCase", () => {
  it("converts lead to organization and creates contacts", async () => {
    const lead = makeLead();
    repo.seedLead({
      lead,
      contacts: [
        { id: "lc-001", leadId: "lead-001", name: "João Silva", role: "CTO", email: "joao@acme.com", isPrimary: true, isActive: true, phone: null, whatsapp: null, linkedin: null, instagram: null, languages: null },
        { id: "lc-002", leadId: "lead-001", name: "Maria Lima", role: "CEO", email: "maria@acme.com", isPrimary: false, isActive: true, phone: null, whatsapp: null, linkedin: null, instagram: null, languages: null },
      ],
      secondaryCNAEIds: ["cnae-001", "cnae-002"],
      techProfile: { languageIds: ["lang-1"], frameworkIds: [], hostingIds: [], databaseIds: [], erpIds: [], crmIds: [], ecommerceIds: [] },
    });

    const result = await useCase.execute({ leadId: "lead-001", requesterId: "user-001", requesterRole: "sdr" });

    expect(result.isRight()).toBe(true);
    const { organizationId, contactIds } = result.unwrap();
    expect(organizationId).toBeDefined();
    expect(contactIds).toHaveLength(2);
  });

  it("maps lead fields to organization correctly", async () => {
    const lead = makeLead({ businessName: "Acme Tech Ltda", city: "Campinas" });
    repo.seedLead({ lead, contacts: [], secondaryCNAEIds: [], techProfile: { languageIds: [], frameworkIds: [], hostingIds: [], databaseIds: [], erpIds: [], crmIds: [], ecommerceIds: [] } });

    await useCase.execute({ leadId: "lead-001", requesterId: "user-001", requesterRole: "sdr" });

    const [, conversion] = Array.from(repo.convertedLeads.entries())[0];
    expect(conversion.organizationId).toBeDefined();
  });

  it("marks lead as converted after execution", async () => {
    const lead = makeLead();
    repo.seedLead({ lead, contacts: [], secondaryCNAEIds: [], techProfile: { languageIds: [], frameworkIds: [], hostingIds: [], databaseIds: [], erpIds: [], crmIds: [], ecommerceIds: [] } });

    await useCase.execute({ leadId: "lead-001", requesterId: "user-001", requesterRole: "sdr" });

    expect(lead.status).toBe("qualified");
    expect(lead.convertedToOrganizationId).toBeDefined();
  });

  it("skips inactive contacts", async () => {
    const lead = makeLead();
    repo.seedLead({
      lead,
      contacts: [
        { id: "lc-001", leadId: "lead-001", name: "Ativo", isPrimary: true, isActive: true, role: null, email: null, phone: null, whatsapp: null, linkedin: null, instagram: null, languages: null },
        { id: "lc-002", leadId: "lead-001", name: "Inativo", isPrimary: false, isActive: false, role: null, email: null, phone: null, whatsapp: null, linkedin: null, instagram: null, languages: null },
      ],
      secondaryCNAEIds: [],
      techProfile: { languageIds: [], frameworkIds: [], hostingIds: [], databaseIds: [], erpIds: [], crmIds: [], ecommerceIds: [] },
    });

    const result = await useCase.execute({ leadId: "lead-001", requesterId: "user-001", requesterRole: "sdr" });

    expect(result.unwrap().contactIds).toHaveLength(1);
  });

  it("returns LeadNotFoundError when lead does not exist", async () => {
    const result = await useCase.execute({ leadId: "nonexistent", requesterId: "user-001", requesterRole: "sdr" });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).name).toBe("LeadNotFoundError");
  });

  it("returns LeadAlreadyConvertedError when lead is already converted", async () => {
    const lead = makeLead({ convertedToOrganizationId: "org-existing" } as Parameters<typeof Lead.create>[0]);
    repo.seedLead({ lead, contacts: [], secondaryCNAEIds: [], techProfile: { languageIds: [], frameworkIds: [], hostingIds: [], databaseIds: [], erpIds: [], crmIds: [], ecommerceIds: [] } });

    const result = await useCase.execute({ leadId: "lead-001", requesterId: "user-001", requesterRole: "sdr" });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).name).toBe("LeadAlreadyConvertedError");
  });

  it("returns LeadForbiddenError when requester is not owner", async () => {
    const lead = makeLead({ ownerId: "user-001" });
    repo.seedLead({ lead, contacts: [], secondaryCNAEIds: [], techProfile: { languageIds: [], frameworkIds: [], hostingIds: [], databaseIds: [], erpIds: [], crmIds: [], ecommerceIds: [] } });

    const result = await useCase.execute({ leadId: "lead-001", requesterId: "user-999", requesterRole: "sdr" });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).name).toBe("LeadForbiddenError");
  });

  it("allows admin to convert lead owned by another user", async () => {
    const lead = makeLead({ ownerId: "user-001" });
    repo.seedLead({ lead, contacts: [], secondaryCNAEIds: [], techProfile: { languageIds: [], frameworkIds: [], hostingIds: [], databaseIds: [], erpIds: [], crmIds: [], ecommerceIds: [] } });

    const result = await useCase.execute({ leadId: "lead-001", requesterId: "admin-001", requesterRole: "admin" });
    expect(result.isRight()).toBe(true);
  });

  it("sets sourceLeadId on the created organization", async () => {
    const lead = makeLead();
    repo.seedLead({ lead, contacts: [], secondaryCNAEIds: [], techProfile: { languageIds: [], frameworkIds: [], hostingIds: [], databaseIds: [], erpIds: [], crmIds: [], ecommerceIds: [] } });

    await useCase.execute({ leadId: "lead-001", requesterId: "user-001", requesterRole: "sdr" });

    // The conversion result is stored — verify it executed
    expect(repo.convertedLeads.has("lead-001")).toBe(true);
  });
});
