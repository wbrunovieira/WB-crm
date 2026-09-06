import { describe, it, expect, beforeEach, vi } from "vitest";
import { EnsureLeadConvertedUseCase } from "@/domain/lead-conversion/application/use-cases/ensure-lead-converted.use-case";
import { ConvertLeadToOrganizationUseCase } from "@/domain/lead-conversion/application/use-cases/convert-lead-to-organization.use-case";
import { FakeLeadConversionRepository } from "../../fakes/fake-lead-conversion.repository";
import { Lead } from "@/domain/leads/enterprise/entities/lead";
import { UniqueEntityID } from "@/core/unique-entity-id";

let repo: FakeLeadConversionRepository;
let sut: EnsureLeadConvertedUseCase;

function semearLead(id = "lead-001", ownerId = "user-001") {
  const lead = Lead.create(
    { ownerId, businessName: "Acme Tech Ltda", phone: "11999990000", email: "contato@acme.com" },
    new UniqueEntityID(id),
  );
  repo.seedLead({
    lead,
    contacts: [],
    secondaryCNAEIds: [],
    techProfile: { languageIds: [], frameworkIds: [], hostingIds: [], databaseIds: [], erpIds: [], crmIds: [], ecommerceIds: [] },
  });
  return lead;
}

beforeEach(() => {
  repo = new FakeLeadConversionRepository();
  sut = new EnsureLeadConvertedUseCase(repo, new ConvertLeadToOrganizationUseCase(repo));
});

describe("EnsureLeadConvertedUseCase", () => {
  it("converte o lead e devolve o id da organização criada", async () => {
    semearLead();

    const orgId = await sut.execute({ leadId: "lead-001", requesterId: "user-001", requesterRole: "sdr" });

    expect(orgId).toBeTruthy();
    expect(repo.convertedLeads.get("lead-001")?.organizationId).toBe(orgId);
  });

  it("reaproveita a organização quando o lead JÁ foi convertido, em vez de criar outra", async () => {
    // Um segundo negócio ganho no mesmo lead não pode gerar um cliente duplicado no CRM
    // nem um centro de custo duplicado no financeiro.
    semearLead();
    repo.convertedOrganizationIds.set("lead-001", "org-ja-existente");
    const spy = vi.spyOn(repo, "execute");

    const orgId = await sut.execute({ leadId: "lead-001", requesterId: "user-001", requesterRole: "sdr" });

    expect(orgId).toBe("org-ja-existente");
    expect(spy).not.toHaveBeenCalled();
  });

  it("devolve null quando o lead não existe, sem lançar", async () => {
    const orgId = await sut.execute({ leadId: "inexistente", requesterId: "user-001", requesterRole: "sdr" });

    expect(orgId).toBeNull();
  });

  it("devolve null quando o solicitante não tem acesso ao lead, sem lançar", async () => {
    semearLead("lead-001", "outro-dono");

    const orgId = await sut.execute({ leadId: "lead-001", requesterId: "user-001", requesterRole: "sdr" });

    expect(orgId).toBeNull();
  });

  it("devolve null quando a persistência da conversão falha, sem propagar o erro", async () => {
    // A venda é fato do usuário: se a conversão quebrar, quem chama precisa poder seguir
    // com o negócio ganho em vez de perder o fechamento.
    semearLead();
    vi.spyOn(repo, "execute").mockRejectedValueOnce(new Error("banco fora do ar"));

    const orgId = await sut.execute({ leadId: "lead-001", requesterId: "user-001", requesterRole: "sdr" });

    expect(orgId).toBeNull();
  });
});
