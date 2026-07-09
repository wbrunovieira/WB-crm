import { describe, it, expect, beforeEach } from "vitest";
import { CreateLeadUseCase } from "@/domain/leads/application/use-cases/create-lead.use-case";
import { UpdateLeadUseCase } from "@/domain/leads/application/use-cases/update-lead.use-case";
import { InMemoryLeadsRepository } from "../../repositories/in-memory-leads.repository";

// Validação de CNPJ no update do lead (numérico ou alfanumérico).
describe("UpdateLeadUseCase — CNPJ", () => {
  let repo: InMemoryLeadsRepository;
  let create: CreateLeadUseCase;
  let update: UpdateLeadUseCase;
  let leadId: string;

  beforeEach(async () => {
    repo = new InMemoryLeadsRepository();
    create = new CreateLeadUseCase(repo);
    update = new UpdateLeadUseCase(repo);
    const r = await create.execute({ ownerId: "user-1", businessName: "Empresa Base" });
    if (r.isRight()) leadId = r.value.lead.id.toString();
  });

  it("rejeita CNPJ inválido no update", async () => {
    const r = await update.execute({
      id: leadId,
      requesterId: "user-1",
      requesterRole: "admin",
      companyRegistrationID: "11.222.333/0001-82", // DV errado
    });
    expect(r.isLeft()).toBe(true);
    if (r.isLeft()) expect(r.value.message).toContain("CNPJ");
  });

  it("aceita CNPJ alfanumérico válido e guarda normalizado", async () => {
    const r = await update.execute({
      id: leadId,
      requesterId: "user-1",
      requesterRole: "admin",
      companyRegistrationID: "12.abc.345/01de-35",
    });
    expect(r.isRight()).toBe(true);
    if (r.isRight()) expect(r.value.lead.companyRegistrationID).toBe("12ABC34501DE35");
  });
});
