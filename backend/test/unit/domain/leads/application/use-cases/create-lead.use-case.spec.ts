import { describe, it, expect, beforeEach } from "vitest";
import { CreateLeadUseCase } from "@/domain/leads/application/use-cases/create-lead.use-case";
import { InMemoryLeadsRepository } from "../../repositories/in-memory-leads.repository";

describe("CreateLeadUseCase", () => {
  let repo: InMemoryLeadsRepository;
  let sut: CreateLeadUseCase;

  beforeEach(() => {
    repo = new InMemoryLeadsRepository();
    sut = new CreateLeadUseCase(repo);
  });

  it("cria lead com dados mínimos", async () => {
    const result = await sut.execute({
      ownerId: "user-1",
      businessName: "Empresa Mínima",
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.lead.businessName).toBe("Empresa Mínima");
      expect(result.value.lead.ownerId).toBe("user-1");
    }
    expect(repo.items).toHaveLength(1);
  });

  it("cria lead com todos os campos", async () => {
    const result = await sut.execute({
      ownerId: "user-1",
      businessName: "Tech Solutions Ltda",
      registeredName: "Tech Solutions Ltda ME",
      foundationDate: new Date("2010-03-15"),
      companyRegistrationID: "12.345.678/0001-99",
      address: "Rua das Flores, 123",
      city: "São Paulo",
      state: "SP",
      country: "Brasil",
      zipCode: "01310-100",
      phone: "+55 11 3456-7890",
      whatsapp: "+5511987654321",
      website: "https://techsolutions.com.br",
      email: "contato@techsolutions.com.br",
      instagram: "@techsolutions",
      linkedin: "linkedin.com/company/techsolutions",
      companyOwner: "João Silva",
      companySize: "11-50",
      revenue: 500000,
      employeesCount: 30,
      description: "Empresa de tecnologia focada em soluções web",
      quality: "warm",
      status: "contacted",
      starRating: 4,
      socialMedia: "artes_frequentes",
      metaAds: "sim",
      googleAds: "nao",
      source: "Indicação",
      languages: JSON.stringify([{ code: "pt-BR", isPrimary: true }, { code: "en", isPrimary: false }]),
      referredByPartnerId: "partner-123",
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const lead = result.value.lead;
      expect(lead.businessName).toBe("Tech Solutions Ltda");
      expect(lead.registeredName).toBe("Tech Solutions Ltda ME");
      expect(lead.city).toBe("São Paulo");
      expect(lead.state).toBe("SP");
      expect(lead.quality).toBe("warm");
      expect(lead.status).toBe("contacted");
      expect(lead.starRating).toBe(4);
      expect(lead.referredByPartnerId).toBe("partner-123");
      const langs = JSON.parse(lead.languages!);
      expect(langs).toBeInstanceOf(Array);
      expect(langs.some((l: { code: string }) => l.code === "pt-BR")).toBe(true);
      expect(langs.some((l: { code: string }) => l.code === "en")).toBe(true);
    }
  });

  it("lead criado tem status 'new' por padrão", async () => {
    const result = await sut.execute({
      ownerId: "user-1",
      businessName: "Empresa Padrão",
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.lead.status).toBe("new");
    }
  });

  it("lead criado tem isArchived false por padrão", async () => {
    const result = await sut.execute({
      ownerId: "user-1",
      businessName: "Empresa Não Arquivada",
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.lead.isArchived).toBe(false);
    }
  });

  it("retorna erro quando businessName está vazio", async () => {
    const result = await sut.execute({
      ownerId: "user-1",
      businessName: "   ",
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.message).toContain("obrigatório");
    }
  });
});
