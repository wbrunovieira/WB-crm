import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryOrganizationsRepository } from "../../repositories/in-memory-organizations.repository";
import { CreateOrganizationUseCase } from "@/domain/organizations/application/use-cases/create-organization.use-case";
import { GetOrganizationsUseCase } from "@/domain/organizations/application/use-cases/get-organizations.use-case";
import { GetOrganizationByIdUseCase } from "@/domain/organizations/application/use-cases/get-organization-by-id.use-case";
import { UpdateOrganizationUseCase } from "@/domain/organizations/application/use-cases/update-organization.use-case";
import { DeleteOrganizationUseCase } from "@/domain/organizations/application/use-cases/delete-organization.use-case";

describe("Organizations Use Cases", () => {
  let repo: InMemoryOrganizationsRepository;
  let createUseCase: CreateOrganizationUseCase;
  let getListUseCase: GetOrganizationsUseCase;
  let getByIdUseCase: GetOrganizationByIdUseCase;
  let updateUseCase: UpdateOrganizationUseCase;
  let deleteUseCase: DeleteOrganizationUseCase;

  beforeEach(() => {
    repo = new InMemoryOrganizationsRepository();
    createUseCase = new CreateOrganizationUseCase(repo);
    getListUseCase = new GetOrganizationsUseCase(repo);
    getByIdUseCase = new GetOrganizationByIdUseCase(repo);
    updateUseCase = new UpdateOrganizationUseCase(repo);
    deleteUseCase = new DeleteOrganizationUseCase(repo);
  });

  // ─── CreateOrganizationUseCase ──────────────────────────────────────────────

  describe("CreateOrganizationUseCase", () => {
    it("cria organização com dados mínimos", async () => {
      const result = await createUseCase.execute({
        ownerId: "user-1",
        name: "Empresa Mínima",
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.organization.name).toBe("Empresa Mínima");
        expect(result.value.organization.ownerId).toBe("user-1");
        expect(result.value.organization.hasHosting).toBe(false);
        expect(result.value.organization.hostingReminderDays).toBe(30);
      }
      expect(repo.items).toHaveLength(1);
    });

    it("cria organização com todos os campos", async () => {
      const result = await createUseCase.execute({
        ownerId: "user-1",
        name: "Tech Corp Ltda",
        legalName: "Tech Corp Comércio e Serviços Ltda",
        foundationDate: new Date("2010-03-15"),
        website: "https://techcorp.com.br",
        phone: "+5511999999999",
        whatsapp: "+5511988888888",
        email: "contato@techcorp.com.br",
        country: "Brasil",
        state: "SP",
        city: "São Paulo",
        zipCode: "01310-100",
        streetAddress: "Rua das Flores, 123",
        industry: "Tecnologia",
        employeeCount: 50,
        annualRevenue: 1500000,
        taxId: "12.345.678/0001-99",
        description: "Empresa de tecnologia",
        companyOwner: "João Silva",
        companySize: "média",
        languages: JSON.stringify([{ code: "pt-BR", isPrimary: true }]),
        primaryCNAEId: "cnae-1",
        internationalActivity: "Exportação",
        instagram: "@techcorp",
        linkedin: "https://linkedin.com/company/techcorp",
        facebook: "https://facebook.com/techcorp",
        twitter: "@techcorp",
        tiktok: "@techcorp",
        sourceLeadId: "lead-1",
        externalProjectIds: JSON.stringify(["proj-1", "proj-2"]),
        driveFolderId: "drive-folder-1",
        hasHosting: true,
        hostingRenewalDate: new Date("2025-12-31"),
        hostingPlan: "Profissional",
        hostingValue: 1200,
        hostingReminderDays: 15,
        hostingNotes: "Renovar em dezembro",
        inOperationsAt: new Date("2024-01-01"),
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        const org = result.value.organization;
        expect(org.name).toBe("Tech Corp Ltda");
        expect(org.legalName).toBe("Tech Corp Comércio e Serviços Ltda");
        expect(org.hasHosting).toBe(true);
        expect(org.hostingPlan).toBe("Profissional");
        expect(org.hostingValue).toBe(1200);
        expect(org.hostingReminderDays).toBe(15);
        expect(org.taxId).toBe("12.345.678/0001-99");
        expect(org.externalProjectIds).toBe(JSON.stringify(["proj-1", "proj-2"]));
        expect(org.languages).toBe(JSON.stringify([{ code: "pt-BR", isPrimary: true }]));
        expect(org.sourceLeadId).toBe("lead-1");
      }
    });

    it("retorna erro quando nome está vazio", async () => {
      const result = await createUseCase.execute({
        ownerId: "user-1",
        name: "   ",
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.message).toContain("Nome");
      }
      expect(repo.items).toHaveLength(0);
    });

    it("faz trim no nome", async () => {
      const result = await createUseCase.execute({
        ownerId: "user-1",
        name: "  Empresa com Espaços  ",
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.organization.name).toBe("Empresa com Espaços");
      }
    });

    it("chama saveWithLabels quando labelIds é fornecido", async () => {
      const labelIds = ["label-1", "label-2"];
      const result = await createUseCase.execute({
        ownerId: "user-1",
        name: "Org Com Labels",
        labelIds,
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        const orgId = result.value.organization.id.toString();
        expect(repo.savedLabels.get(orgId)).toEqual(labelIds);
      }
    });

    it("não chama saveWithLabels quando labelIds não é fornecido", async () => {
      const result = await createUseCase.execute({
        ownerId: "user-1",
        name: "Org Sem Labels",
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        const orgId = result.value.organization.id.toString();
        expect(repo.savedLabels.has(orgId)).toBe(false);
      }
    });

    it("chama saveWithLabels com array vazio quando labelIds é []", async () => {
      const result = await createUseCase.execute({
        ownerId: "user-1",
        name: "Org Labels Vazias",
        labelIds: [],
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        const orgId = result.value.organization.id.toString();
        expect(repo.savedLabels.get(orgId)).toEqual([]);
      }
    });
  });

  // ─── GetOrganizationsUseCase ────────────────────────────────────────────────

  describe("GetOrganizationsUseCase", () => {
    beforeEach(async () => {
      await createUseCase.execute({ ownerId: "user-1", name: "Empresa Alpha", hasHosting: true });
      await createUseCase.execute({ ownerId: "user-1", name: "Empresa Beta" });
      await createUseCase.execute({ ownerId: "user-2", name: "Empresa de Outro Usuário" });
    });

    it("retorna apenas organizações do próprio usuário (não admin)", async () => {
      const result = await getListUseCase.execute({
        requesterId: "user-1",
        requesterRole: "sdr",
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.organizations).toHaveLength(2);
        expect(result.value.organizations.every((o) => o.ownerId === "user-1")).toBe(true);
      }
    });

    it("admin vê todas as organizações", async () => {
      const result = await getListUseCase.execute({
        requesterId: "admin-1",
        requesterRole: "admin",
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.organizations).toHaveLength(3);
      }
    });

    it("filtra por search no nome", async () => {
      const result = await getListUseCase.execute({
        requesterId: "user-1",
        requesterRole: "sdr",
        filters: { search: "Alpha" },
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.organizations).toHaveLength(1);
        expect(result.value.organizations[0].name).toBe("Empresa Alpha");
      }
    });

    it("filtra por hasHosting", async () => {
      const result = await getListUseCase.execute({
        requesterId: "user-1",
        requesterRole: "sdr",
        filters: { hasHosting: true },
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.organizations).toHaveLength(1);
        expect(result.value.organizations[0].hasHosting).toBe(true);
      }
    });
  });

  // ─── GetOrganizationByIdUseCase ─────────────────────────────────────────────

  describe("GetOrganizationByIdUseCase", () => {
    it("retorna organização existente do próprio usuário", async () => {
      const created = await createUseCase.execute({ ownerId: "user-1", name: "Org Detalhe" });
      expect(created.isRight()).toBe(true);
      const id = created.isRight() ? created.value.organization.id.toString() : "";

      const result = await getByIdUseCase.execute({ id, requesterId: "user-1", requesterRole: "sdr" });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.organization.name).toBe("Org Detalhe");
      }
    });

    it("retorna erro quando organização não existe", async () => {
      const result = await getByIdUseCase.execute({ id: "nao-existe", requesterId: "user-1", requesterRole: "sdr" });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.message).toContain("não encontrada");
      }
    });

    it("retorna erro quando usuário não é dono (não admin)", async () => {
      const created = await createUseCase.execute({ ownerId: "user-1", name: "Org de User 1" });
      const id = created.isRight() ? created.value.organization.id.toString() : "";

      const result = await getByIdUseCase.execute({ id, requesterId: "user-2", requesterRole: "sdr" });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.message).toContain("não encontrada");
      }
    });

    it("admin acessa organização de qualquer usuário", async () => {
      const created = await createUseCase.execute({ ownerId: "user-1", name: "Org de User 1" });
      const id = created.isRight() ? created.value.organization.id.toString() : "";

      const result = await getByIdUseCase.execute({ id, requesterId: "admin-1", requesterRole: "admin" });

      expect(result.isRight()).toBe(true);
    });
  });

  // ─── UpdateOrganizationUseCase ──────────────────────────────────────────────

  describe("UpdateOrganizationUseCase", () => {
    it("atualiza organização existente", async () => {
      const created = await createUseCase.execute({ ownerId: "user-1", name: "Org Original" });
      const id = created.isRight() ? created.value.organization.id.toString() : "";

      const result = await updateUseCase.execute({
        id,
        requesterId: "user-1",
        requesterRole: "sdr",
        name: "Org Atualizada",
        city: "Campinas",
        hasHosting: true,
        hostingPlan: "Básico",
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.organization.name).toBe("Org Atualizada");
        expect(result.value.organization.city).toBe("Campinas");
        expect(result.value.organization.hasHosting).toBe(true);
      }
    });

    it("retorna erro quando organização não existe", async () => {
      const result = await updateUseCase.execute({
        id: "nao-existe",
        requesterId: "user-1",
        requesterRole: "sdr",
        name: "Novo Nome",
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.message).toContain("não encontrada");
      }
    });

    it("retorna erro quando usuário não é dono", async () => {
      const created = await createUseCase.execute({ ownerId: "user-1", name: "Org de User 1" });
      const id = created.isRight() ? created.value.organization.id.toString() : "";

      const result = await updateUseCase.execute({
        id,
        requesterId: "user-2",
        requesterRole: "sdr",
        name: "Tentativa de update",
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.message).toContain("Não autorizado");
      }
    });

    it("admin pode atualizar organização de outro usuário", async () => {
      const created = await createUseCase.execute({ ownerId: "user-1", name: "Org Original" });
      const id = created.isRight() ? created.value.organization.id.toString() : "";

      const result = await updateUseCase.execute({
        id,
        requesterId: "admin-1",
        requesterRole: "admin",
        name: "Atualizado pelo Admin",
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.organization.name).toBe("Atualizado pelo Admin");
      }
    });

    it("chama saveWithLabels quando labelIds é fornecido no update", async () => {
      const created = await createUseCase.execute({ ownerId: "user-1", name: "Org Para Labels" });
      const id = created.isRight() ? created.value.organization.id.toString() : "";

      const labelIds = ["label-a", "label-b", "label-c"];
      const result = await updateUseCase.execute({
        id,
        requesterId: "user-1",
        requesterRole: "sdr",
        name: "Org Com Labels Atualizadas",
        labelIds,
      });

      expect(result.isRight()).toBe(true);
      expect(repo.savedLabels.get(id)).toEqual(labelIds);
    });

    it("não chama saveWithLabels quando labelIds não é fornecido no update", async () => {
      const created = await createUseCase.execute({ ownerId: "user-1", name: "Org Sem Labels Update" });
      const id = created.isRight() ? created.value.organization.id.toString() : "";
      repo.savedLabels.clear();

      const result = await updateUseCase.execute({
        id,
        requesterId: "user-1",
        requesterRole: "sdr",
        name: "Nome Atualizado Sem Labels",
      });

      expect(result.isRight()).toBe(true);
      expect(repo.savedLabels.has(id)).toBe(false);
    });

    it("chama saveWithLabels com [] para limpar labels no update", async () => {
      const created = await createUseCase.execute({ ownerId: "user-1", name: "Org Para Limpar Labels" });
      const id = created.isRight() ? created.value.organization.id.toString() : "";

      const result = await updateUseCase.execute({
        id,
        requesterId: "user-1",
        requesterRole: "sdr",
        labelIds: [],
      });

      expect(result.isRight()).toBe(true);
      expect(repo.savedLabels.get(id)).toEqual([]);
    });
  });

  // ─── DeleteOrganizationUseCase ──────────────────────────────────────────────

  describe("DeleteOrganizationUseCase", () => {
    it("deleta organização existente do próprio usuário", async () => {
      const created = await createUseCase.execute({ ownerId: "user-1", name: "Org para Deletar" });
      const id = created.isRight() ? created.value.organization.id.toString() : "";

      const result = await deleteUseCase.execute({ id, requesterId: "user-1", requesterRole: "sdr" });

      expect(result.isRight()).toBe(true);
      expect(repo.items).toHaveLength(0);
    });

    it("retorna erro quando organização não existe", async () => {
      const result = await deleteUseCase.execute({ id: "nao-existe", requesterId: "user-1", requesterRole: "sdr" });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.message).toContain("não encontrada");
      }
    });

    it("retorna erro quando usuário não é dono", async () => {
      const created = await createUseCase.execute({ ownerId: "user-1", name: "Org de User 1" });
      const id = created.isRight() ? created.value.organization.id.toString() : "";

      const result = await deleteUseCase.execute({ id, requesterId: "user-2", requesterRole: "sdr" });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.message).toContain("Não autorizado");
      }
      expect(repo.items).toHaveLength(1);
    });

    it("admin pode deletar organização de outro usuário", async () => {
      const created = await createUseCase.execute({ ownerId: "user-1", name: "Org de User 1" });
      const id = created.isRight() ? created.value.organization.id.toString() : "";

      const result = await deleteUseCase.execute({ id, requesterId: "admin-1", requesterRole: "admin" });

      expect(result.isRight()).toBe(true);
      expect(repo.items).toHaveLength(0);
    });
  });
});
