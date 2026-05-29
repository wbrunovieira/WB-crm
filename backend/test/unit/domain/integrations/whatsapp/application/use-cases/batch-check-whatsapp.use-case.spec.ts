import { describe, it, expect, beforeEach, vi } from "vitest";
import { BatchCheckWhatsAppUseCase } from "@/domain/integrations/whatsapp/application/use-cases/batch-check-whatsapp.use-case";
import { FakeEvolutionApiPort } from "../../fakes/fake-evolution-api.port";
import { Lead } from "@/domain/leads/enterprise/entities/lead";

class InMemoryBatchCheckRepository {
  leads: Lead[] = [];
  savedVerifications: Array<{
    leadId: string;
    whatsappVerified: boolean;
    whatsappVerifiedAt: Date;
    whatsappVerifiedNumber: string;
  }> = [];

  async findBySourceGroup(sourceGroup: string): Promise<Lead[]> {
    return this.leads.filter(l => l.sourceGroup === sourceGroup);
  }

  async saveWhatsAppVerification(
    leadId: string,
    data: { whatsappVerified: boolean; whatsappVerifiedAt: Date; whatsappVerifiedNumber: string },
  ): Promise<void> {
    this.savedVerifications.push({ leadId, ...data });
  }
}

const OWNER = "user-1";

const makeLead = (overrides: Partial<{ phone: string; whatsapp: string; sourceGroup: string; ownerId: string }> = {}) =>
  Lead.create({
    ownerId: overrides.ownerId ?? OWNER,
    businessName: "Empresa Teste",
    ...overrides,
  });

let evolutionApi: FakeEvolutionApiPort;
let repo: InMemoryBatchCheckRepository;
let sut: BatchCheckWhatsAppUseCase;

function runBatch(input: Partial<Parameters<BatchCheckWhatsAppUseCase["execute"]>[0]> & { sourceGroup: string }) {
  return sut.execute({ requesterId: OWNER, requesterRole: "sdr", ...input });
}

beforeEach(() => {
  evolutionApi = new FakeEvolutionApiPort();
  repo = new InMemoryBatchCheckRepository();
  sut = new BatchCheckWhatsAppUseCase(evolutionApi, repo as any);
});

describe("BatchCheckWhatsAppUseCase", () => {
  it("retorna erro quando sourceGroup está vazio", async () => {
    const result = await runBatch({ sourceGroup: "" });
    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(Error);
  });

  it("retorna left quando nenhum lead encontrado no grupo", async () => {
    const result = await runBatch({ sourceGroup: "GrupoInexistente" });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("Nenhum lead encontrado");
  });

  it("verifica leads com phone no grupo e salva resultado", async () => {
    const lead1 = makeLead({ phone: "+552422226134", sourceGroup: "Lote1" });
    const lead2 = makeLead({ phone: "+552499999999", sourceGroup: "Lote1" });
    repo.leads.push(lead1, lead2);

    evolutionApi.checkNumberResult = { exists: true, number: "552422226134" };

    const result = await runBatch({ sourceGroup: "Lote1", delayMs: 0 });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.total).toBe(2);
      expect(result.value.checked).toBe(2);
      expect(result.value.found).toBe(2);
      expect(result.value.skipped).toBe(0);
    }
    expect(repo.savedVerifications).toHaveLength(2);
  });

  it("usa whatsapp se phone ausente", async () => {
    const lead = makeLead({ whatsapp: "+552422226134", sourceGroup: "Lote1" });
    repo.leads.push(lead);

    evolutionApi.checkNumberResult = { exists: true, number: "552422226134" };

    const result = await runBatch({ sourceGroup: "Lote1", delayMs: 0 });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.checked).toBe(1);
    }
  });

  it("pula leads sem phone e sem whatsapp", async () => {
    const lead = makeLead({ sourceGroup: "Lote1" });
    repo.leads.push(lead);

    const result = await runBatch({ sourceGroup: "Lote1", delayMs: 0 });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.total).toBe(1);
      expect(result.value.skipped).toBe(1);
      expect(result.value.checked).toBe(0);
    }
    expect(repo.savedVerifications).toHaveLength(0);
  });

  it("contabiliza notFound quando Evolution API retorna exists: false", async () => {
    const lead = makeLead({ phone: "+552422226134", sourceGroup: "Lote1" });
    repo.leads.push(lead);

    evolutionApi.checkNumberResult = { exists: false };

    const result = await runBatch({ sourceGroup: "Lote1", delayMs: 0 });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.notFound).toBe(1);
      expect(result.value.found).toBe(0);
    }
    expect(repo.savedVerifications).toHaveLength(1);
    expect(repo.savedVerifications[0].whatsappVerified).toBe(false);
  });

  it("continua após erro de um lead sem abortar o lote", async () => {
    const lead1 = makeLead({ phone: "+552422226134", sourceGroup: "Lote1" });
    const lead2 = makeLead({ phone: "+552499999999", sourceGroup: "Lote1" });
    repo.leads.push(lead1, lead2);

    let callCount = 0;
    evolutionApi.checkNumber = async (_phone: string) => {
      callCount++;
      if (callCount === 1) throw new Error("API error simulado");
      return { exists: true, number: "552499999999" };
    };

    const result = await runBatch({ sourceGroup: "Lote1", delayMs: 0 });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.errors).toBe(1);
      expect(result.value.found).toBe(1);
    }
  });

  // ── Authorization / data isolation ────────────────────────────────────────────

  it("só verifica leads do próprio requester (ignora de outros donos)", async () => {
    repo.leads.push(makeLead({ phone: "+552422226134", sourceGroup: "Lote1" }));
    repo.leads.push(makeLead({ phone: "+552499999999", sourceGroup: "Lote1", ownerId: "another-user" }));

    evolutionApi.checkNumberResult = { exists: true, number: "x" };

    const result = await runBatch({ sourceGroup: "Lote1", delayMs: 0 });
    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.total).toBe(1);
    expect(repo.savedVerifications).toHaveLength(1);
  });

  it("admin verifica todos os leads do grupo independente do dono", async () => {
    repo.leads.push(makeLead({ phone: "+552422226134", sourceGroup: "Lote1" }));
    repo.leads.push(makeLead({ phone: "+552499999999", sourceGroup: "Lote1", ownerId: "another-user" }));

    evolutionApi.checkNumberResult = { exists: true, number: "x" };

    const result = await runBatch({ sourceGroup: "Lote1", delayMs: 0, requesterRole: "admin", requesterId: "admin-user" });
    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.total).toBe(2);
  });

  it("retorna left quando o requester não possui nenhum lead do grupo", async () => {
    repo.leads.push(makeLead({ phone: "+552499999999", sourceGroup: "Lote1", ownerId: "another-user" }));

    const result = await runBatch({ sourceGroup: "Lote1", delayMs: 0 });
    expect(result.isLeft()).toBe(true);
  });
});
