import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryPartnersRepository } from "../../repositories/in-memory-partners.repository";
import { CreatePartnerUseCase } from "@/domain/partners/application/use-cases/create-partner.use-case";
import { GetPartnersUseCase } from "@/domain/partners/application/use-cases/get-partners.use-case";
import { GetPartnerByIdUseCase } from "@/domain/partners/application/use-cases/get-partner-by-id.use-case";
import { UpdatePartnerUseCase } from "@/domain/partners/application/use-cases/update-partner.use-case";
import { DeletePartnerUseCase } from "@/domain/partners/application/use-cases/delete-partner.use-case";
import { UpdatePartnerLastContactUseCase } from "@/domain/partners/application/use-cases/update-partner-last-contact.use-case";

describe("Partners Use Cases", () => {
  let repo: InMemoryPartnersRepository;
  let createUseCase: CreatePartnerUseCase;
  let getListUseCase: GetPartnersUseCase;
  let getByIdUseCase: GetPartnerByIdUseCase;
  let updateUseCase: UpdatePartnerUseCase;
  let deleteUseCase: DeletePartnerUseCase;
  let lastContactUseCase: UpdatePartnerLastContactUseCase;

  beforeEach(() => {
    repo = new InMemoryPartnersRepository();
    createUseCase = new CreatePartnerUseCase(repo);
    getListUseCase = new GetPartnersUseCase(repo);
    getByIdUseCase = new GetPartnerByIdUseCase(repo);
    updateUseCase = new UpdatePartnerUseCase(repo);
    deleteUseCase = new DeletePartnerUseCase(repo);
    lastContactUseCase = new UpdatePartnerLastContactUseCase(repo);
  });

  // ─── CreatePartnerUseCase ────────────────────────────────────────────────────

  describe("CreatePartnerUseCase", () => {
    it("cria parceiro com dados mínimos", async () => {
      const result = await createUseCase.execute({
        ownerId: "user-1",
        name: "Agência Alpha",
        partnerType: "agencia_digital",
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.partner.name).toBe("Agência Alpha");
        expect(result.value.partner.partnerType).toBe("agencia_digital");
        expect(result.value.partner.ownerId).toBe("user-1");
        expect(result.value.partner.lastContactDate).toBeInstanceOf(Date);
      }
      expect(repo.items).toHaveLength(1);
    });

    it("commLanguage: default 'pt' quando não informado", async () => {
      const r = await createUseCase.execute({ ownerId: "user-1", name: "Sem idioma", partnerType: "agencia_digital" });
      expect(r.isRight() && r.value.partner.commLanguage).toBe("pt");
    });

    it("commLanguage: aceita 'en'", async () => {
      const r = await createUseCase.execute({ ownerId: "user-1", name: "Inglês", partnerType: "agencia_digital", commLanguage: "en" });
      expect(r.isRight() && r.value.partner.commLanguage).toBe("en");
    });

    it("commLanguage: idioma não suportado → left", async () => {
      const r = await createUseCase.execute({ ownerId: "user-1", name: "Francês", partnerType: "agencia_digital", commLanguage: "fr" });
      expect(r.isLeft()).toBe(true);
    });

    it("cria parceiro com todos os campos", async () => {
      const result = await createUseCase.execute({
        ownerId: "user-1",
        name: "Consultoria XYZ",
        partnerType: "consultoria",
        legalName: "Consultoria XYZ Ltda",
        foundationDate: new Date("2012-06-01"),
        website: "https://xyz.com.br",
        email: "contato@xyz.com.br",
        phone: "+5511999999999",
        whatsapp: "+5511988888888",
        country: "Brasil",
        state: "SP",
        city: "São Paulo",
        zipCode: "01310-100",
        streetAddress: "Av. Paulista, 1000",
        linkedin: "https://linkedin.com/company/xyz",
        instagram: "@xyz",
        facebook: "https://facebook.com/xyz",
        twitter: "@xyz",
        industry: "Consultoria de TI",
        employeeCount: 25,
        companySize: "pequena",
        description: "Especializada em transformação digital",
        expertise: "ERP, CRM, Automação",
        notes: "Parceiro estratégico desde 2020",
        languages: JSON.stringify([{ code: "pt-BR", isPrimary: true }, { code: "en", isPrimary: false }]),
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        const p = result.value.partner;
        expect(p.name).toBe("Consultoria XYZ");
        expect(p.legalName).toBe("Consultoria XYZ Ltda");
        expect(p.expertise).toBe("ERP, CRM, Automação");
        expect(p.companySize).toBe("pequena");
        expect(p.employeeCount).toBe(25);
        expect(p.languages).toBe(JSON.stringify([{ code: "pt-BR", isPrimary: true }, { code: "en", isPrimary: false }]));
      }
    });

    it("retorna erro quando nome está vazio", async () => {
      const result = await createUseCase.execute({
        ownerId: "user-1",
        name: "  ",
        partnerType: "consultoria",
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) expect(result.value.message).toContain("Nome");
      expect(repo.items).toHaveLength(0);
    });

    it("retorna erro quando partnerType está vazio", async () => {
      const result = await createUseCase.execute({
        ownerId: "user-1",
        name: "Parceiro Sem Tipo",
        partnerType: "",
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) expect(result.value.message).toContain("Tipo");
      expect(repo.items).toHaveLength(0);
    });

    it("faz trim no nome", async () => {
      const result = await createUseCase.execute({
        ownerId: "user-1",
        name: "  Parceiro Espaços  ",
        partnerType: "indicador",
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) expect(result.value.partner.name).toBe("Parceiro Espaços");
    });

    it("usa partnerStatus 'prospect' por padrão (lead de partner)", async () => {
      const result = await createUseCase.execute({
        ownerId: "user-1",
        name: "Agência Prospect",
        partnerType: "agencia_digital",
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.partner.partnerStatus).toBe("prospect");
        expect(result.value.partner.partnershipStartedAt).toBeUndefined();
      }
    });

    it("ao criar já como 'active', define partnershipStartedAt automaticamente", async () => {
      const result = await createUseCase.execute({
        ownerId: "user-1",
        name: "Agência Ativa",
        partnerType: "agencia_digital",
        partnerStatus: "active",
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.partner.partnerStatus).toBe("active");
        expect(result.value.partner.partnershipStartedAt).toBeInstanceOf(Date);
      }
    });

    it("rejeita partnerStatus inválido", async () => {
      const result = await createUseCase.execute({
        ownerId: "user-1",
        name: "Agência Inválida",
        partnerType: "agencia_digital",
        partnerStatus: "banana",
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) expect(result.value.message).toContain("Status");
      expect(repo.items).toHaveLength(0);
    });
  });

  // ─── GetPartnersUseCase ──────────────────────────────────────────────────────

  describe("GetPartnersUseCase", () => {
    beforeEach(async () => {
      await createUseCase.execute({ ownerId: "user-1", name: "Agência Alpha", partnerType: "agencia_digital", expertise: "SEO" });
      await createUseCase.execute({ ownerId: "user-1", name: "Consultoria Beta", partnerType: "consultoria" });
      await createUseCase.execute({ ownerId: "user-2", name: "Parceiro de Outro", partnerType: "fornecedor" });
    });

    it("retorna apenas parceiros do próprio usuário (não admin)", async () => {
      const result = await getListUseCase.execute({ requesterId: "user-1", requesterRole: "sdr" });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.partners).toHaveLength(2);
        expect(result.value.partners.every((p) => p.ownerId === "user-1")).toBe(true);
      }
    });

    it("admin vê todos os parceiros", async () => {
      const result = await getListUseCase.execute({ requesterId: "admin-1", requesterRole: "admin" });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) expect(result.value.partners).toHaveLength(3);
    });

    it("filtra por search no nome", async () => {
      const result = await getListUseCase.execute({
        requesterId: "user-1",
        requesterRole: "sdr",
        filters: { search: "Alpha" },
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.partners).toHaveLength(1);
        expect(result.value.partners[0].name).toBe("Agência Alpha");
      }
    });

    it("filtra por search na expertise", async () => {
      const result = await getListUseCase.execute({
        requesterId: "user-1",
        requesterRole: "sdr",
        filters: { search: "SEO" },
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.partners).toHaveLength(1);
        expect(result.value.partners[0].expertise).toBe("SEO");
      }
    });

    it("filtra por partnerStatus", async () => {
      await createUseCase.execute({ ownerId: "user-1", name: "Agência Ativa", partnerType: "agencia_digital", partnerStatus: "active" });

      const result = await getListUseCase.execute({
        requesterId: "user-1",
        requesterRole: "sdr",
        filters: { status: "active" },
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.partners).toHaveLength(1);
        expect(result.value.partners[0].name).toBe("Agência Ativa");
        expect(result.value.partners[0].partnerStatus).toBe("active");
      }
    });
  });

  // ─── GetPartnerByIdUseCase ───────────────────────────────────────────────────

  describe("GetPartnerByIdUseCase", () => {
    it("retorna parceiro existente do próprio usuário", async () => {
      const created = await createUseCase.execute({ ownerId: "user-1", name: "Parceiro Detalhe", partnerType: "mentor" });
      const id = created.isRight() ? created.value.partner.id.toString() : "";

      const result = await getByIdUseCase.execute({ id, requesterId: "user-1", requesterRole: "sdr" });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) expect(result.value.partner.name).toBe("Parceiro Detalhe");
    });

    it("retorna erro quando parceiro não existe", async () => {
      const result = await getByIdUseCase.execute({ id: "nao-existe", requesterId: "user-1", requesterRole: "sdr" });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) expect(result.value.message).toContain("não encontrado");
    });

    it("retorna erro quando usuário não é dono", async () => {
      const created = await createUseCase.execute({ ownerId: "user-1", name: "Parceiro User 1", partnerType: "investidor" });
      const id = created.isRight() ? created.value.partner.id.toString() : "";

      const result = await getByIdUseCase.execute({ id, requesterId: "user-2", requesterRole: "sdr" });

      expect(result.isLeft()).toBe(true);
    });

    it("admin acessa parceiro de qualquer usuário", async () => {
      const created = await createUseCase.execute({ ownerId: "user-1", name: "Parceiro User 1", partnerType: "universidade" });
      const id = created.isRight() ? created.value.partner.id.toString() : "";

      const result = await getByIdUseCase.execute({ id, requesterId: "admin-1", requesterRole: "admin" });

      expect(result.isRight()).toBe(true);
    });
  });

  // ─── UpdatePartnerUseCase ────────────────────────────────────────────────────

  describe("UpdatePartnerUseCase", () => {
    it("atualiza parceiro existente", async () => {
      const created = await createUseCase.execute({ ownerId: "user-1", name: "Original", partnerType: "consultoria" });
      const id = created.isRight() ? created.value.partner.id.toString() : "";

      const result = await updateUseCase.execute({
        id,
        requesterId: "user-1",
        requesterRole: "sdr",
        name: "Atualizado",
        city: "Recife",
        expertise: "Cloud, DevOps",
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.partner.name).toBe("Atualizado");
        expect(result.value.partner.city).toBe("Recife");
        expect(result.value.partner.expertise).toBe("Cloud, DevOps");
      }
    });

    it("atualiza primaryCNAEId e internationalActivity", async () => {
      const created = await createUseCase.execute({ ownerId: "user-1", name: "Parceiro", partnerType: "consultoria" });
      const id = created.isRight() ? created.value.partner.id.toString() : "";

      const r = await updateUseCase.execute({
        id, requesterId: "user-1", requesterRole: "sdr",
        primaryCNAEId: "cnae-123", internationalActivity: "Software development",
      });
      expect(r.isRight()).toBe(true);
      if (r.isRight()) {
        expect(r.value.partner.primaryCNAEId).toBe("cnae-123");
        expect(r.value.partner.internationalActivity).toBe("Software development");
      }

      // null clears primaryCNAE
      const cleared = await updateUseCase.execute({ id, requesterId: "user-1", requesterRole: "sdr", primaryCNAEId: null });
      if (cleared.isRight()) expect(cleared.value.partner.primaryCNAEId).toBeNull();
    });

    it("atualiza starRating (classificação por estrelas)", async () => {
      const created = await createUseCase.execute({ ownerId: "user-1", name: "Parceiro", partnerType: "consultoria" });
      const id = created.isRight() ? created.value.partner.id.toString() : "";

      const set = await updateUseCase.execute({ id, requesterId: "user-1", requesterRole: "sdr", starRating: 4 });
      expect(set.isRight()).toBe(true);
      if (set.isRight()) expect(set.value.partner.starRating).toBe(4);

      // Setting null clears the rating
      const clear = await updateUseCase.execute({ id, requesterId: "user-1", requesterRole: "sdr", starRating: null });
      expect(clear.isRight()).toBe(true);
      if (clear.isRight()) expect(clear.value.partner.starRating).toBeNull();
    });

    it("atualiza languages (idiomas)", async () => {
      const created = await createUseCase.execute({ ownerId: "user-1", name: "Parceiro", partnerType: "consultoria" });
      const id = created.isRight() ? created.value.partner.id.toString() : "";

      const langs = JSON.stringify([{ code: "es", isPrimary: true }]);
      const set = await updateUseCase.execute({ id, requesterId: "user-1", requesterRole: "sdr", languages: langs });
      expect(set.isRight()).toBe(true);
      if (set.isRight()) expect(set.value.partner.languages).toBe(langs);

      // Sending null clears all languages; omitting the field preserves them
      const preserved = await updateUseCase.execute({ id, requesterId: "user-1", requesterRole: "sdr", name: "Novo Nome" });
      if (preserved.isRight()) expect(preserved.value.partner.languages).toBe(langs);

      const cleared = await updateUseCase.execute({ id, requesterId: "user-1", requesterRole: "sdr", languages: null });
      expect(cleared.isRight()).toBe(true);
      if (cleared.isRight()) expect(cleared.value.partner.languages).toBeNull();
    });

    it("rejeita starRating fora da faixa 1–5", async () => {
      const created = await createUseCase.execute({ ownerId: "user-1", name: "Parceiro", partnerType: "consultoria" });
      const id = created.isRight() ? created.value.partner.id.toString() : "";

      for (const bad of [0, 6, -3, 2.5]) {
        const r = await updateUseCase.execute({ id, requesterId: "user-1", requesterRole: "sdr", starRating: bad });
        expect(r.isLeft()).toBe(true);
        if (r.isLeft()) expect(r.value.message).toContain("entre 1 e 5");
      }
    });

    it("retorna erro quando parceiro não existe", async () => {
      const result = await updateUseCase.execute({ id: "nao-existe", requesterId: "user-1", requesterRole: "sdr", name: "X" });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) expect(result.value.message).toContain("não encontrado");
    });

    it("retorna erro quando usuário não é dono", async () => {
      const created = await createUseCase.execute({ ownerId: "user-1", name: "Parceiro User 1", partnerType: "midia" });
      const id = created.isRight() ? created.value.partner.id.toString() : "";

      const result = await updateUseCase.execute({ id, requesterId: "user-2", requesterRole: "sdr", name: "Hack" });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) expect(result.value.message).toContain("Não autorizado");
    });

    it("admin pode atualizar parceiro de outro usuário", async () => {
      const created = await createUseCase.execute({ ownerId: "user-1", name: "Original", partnerType: "outros" });
      const id = created.isRight() ? created.value.partner.id.toString() : "";

      const result = await updateUseCase.execute({ id, requesterId: "admin-1", requesterRole: "admin", name: "Admin Update" });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) expect(result.value.partner.name).toBe("Admin Update");
    });

    it("ao oficializar (prospect → active), define partnershipStartedAt", async () => {
      const created = await createUseCase.execute({ ownerId: "user-1", name: "A Oficializar", partnerType: "consultoria" });
      const id = created.isRight() ? created.value.partner.id.toString() : "";
      expect(created.isRight() && created.value.partner.partnershipStartedAt).toBeUndefined();

      const result = await updateUseCase.execute({ id, requesterId: "user-1", requesterRole: "sdr", partnerStatus: "active" });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.partner.partnerStatus).toBe("active");
        expect(result.value.partner.partnershipStartedAt).toBeInstanceOf(Date);
      }
    });

    it("não sobrescreve partnershipStartedAt já existente ao reafirmar 'active'", async () => {
      const created = await createUseCase.execute({
        ownerId: "user-1",
        name: "Já Ativa",
        partnerType: "consultoria",
        partnerStatus: "active",
      });
      const id = created.isRight() ? created.value.partner.id.toString() : "";
      const originalStarted = created.isRight() ? created.value.partner.partnershipStartedAt : null;

      const result = await updateUseCase.execute({ id, requesterId: "user-1", requesterRole: "sdr", partnerStatus: "active", city: "Recife" });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.partner.partnershipStartedAt?.getTime()).toBe(originalStarted?.getTime());
      }
    });

    it("mudar para 'inactive' não define partnershipStartedAt", async () => {
      const created = await createUseCase.execute({ ownerId: "user-1", name: "A Pausar", partnerType: "consultoria" });
      const id = created.isRight() ? created.value.partner.id.toString() : "";

      const result = await updateUseCase.execute({ id, requesterId: "user-1", requesterRole: "sdr", partnerStatus: "inactive" });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.partner.partnerStatus).toBe("inactive");
        expect(result.value.partner.partnershipStartedAt).toBeUndefined();
      }
    });

    it("rejeita partnerStatus inválido no update", async () => {
      const created = await createUseCase.execute({ ownerId: "user-1", name: "Original", partnerType: "consultoria" });
      const id = created.isRight() ? created.value.partner.id.toString() : "";

      const result = await updateUseCase.execute({ id, requesterId: "user-1", requesterRole: "sdr", partnerStatus: "xpto" });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) expect(result.value.message).toContain("Status");
    });
  });

  // ─── DeletePartnerUseCase ────────────────────────────────────────────────────

  describe("DeletePartnerUseCase", () => {
    it("deleta parceiro existente", async () => {
      const created = await createUseCase.execute({ ownerId: "user-1", name: "Para Deletar", partnerType: "fornecedor" });
      const id = created.isRight() ? created.value.partner.id.toString() : "";

      const result = await deleteUseCase.execute({ id, requesterId: "user-1", requesterRole: "sdr" });

      expect(result.isRight()).toBe(true);
      expect(repo.items).toHaveLength(0);
    });

    it("retorna erro quando parceiro não existe", async () => {
      const result = await deleteUseCase.execute({ id: "nao-existe", requesterId: "user-1", requesterRole: "sdr" });

      expect(result.isLeft()).toBe(true);
    });

    it("retorna erro quando usuário não é dono", async () => {
      const created = await createUseCase.execute({ ownerId: "user-1", name: "Parceiro User 1", partnerType: "associacao" });
      const id = created.isRight() ? created.value.partner.id.toString() : "";

      const result = await deleteUseCase.execute({ id, requesterId: "user-2", requesterRole: "sdr" });

      expect(result.isLeft()).toBe(true);
      expect(repo.items).toHaveLength(1);
    });

    it("admin pode deletar parceiro de outro usuário", async () => {
      const created = await createUseCase.execute({ ownerId: "user-1", name: "Parceiro User 1", partnerType: "parceiro_tecnologico" });
      const id = created.isRight() ? created.value.partner.id.toString() : "";

      const result = await deleteUseCase.execute({ id, requesterId: "admin-1", requesterRole: "admin" });

      expect(result.isRight()).toBe(true);
      expect(repo.items).toHaveLength(0);
    });
  });

  // ─── UpdatePartnerLastContactUseCase ─────────────────────────────────────────

  describe("UpdatePartnerLastContactUseCase", () => {
    it("atualiza lastContactDate do parceiro", async () => {
      const created = await createUseCase.execute({ ownerId: "user-1", name: "Parceiro Contato", partnerType: "indicador" });
      const id = created.isRight() ? created.value.partner.id.toString() : "";
      const originalDate = created.isRight() ? created.value.partner.lastContactDate : null;

      await new Promise((r) => setTimeout(r, 5));

      const result = await lastContactUseCase.execute({ id, requesterId: "user-1", requesterRole: "sdr" });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.partner.lastContactDate).toBeInstanceOf(Date);
        expect(result.value.partner.lastContactDate!.getTime()).toBeGreaterThan(originalDate!.getTime());
      }
    });

    it("retorna erro quando parceiro não existe", async () => {
      const result = await lastContactUseCase.execute({ id: "nao-existe", requesterId: "user-1", requesterRole: "sdr" });

      expect(result.isLeft()).toBe(true);
    });

    it("retorna erro quando usuário não é dono", async () => {
      const created = await createUseCase.execute({ ownerId: "user-1", name: "Parceiro User 1", partnerType: "mentor" });
      const id = created.isRight() ? created.value.partner.id.toString() : "";

      const result = await lastContactUseCase.execute({ id, requesterId: "user-2", requesterRole: "sdr" });

      expect(result.isLeft()).toBe(true);
    });
  });
});
