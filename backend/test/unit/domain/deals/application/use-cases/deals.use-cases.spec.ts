import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryDealsRepository } from "../../repositories/in-memory-deals.repository";
import { InMemoryPartnersRepository } from "../../../partners/repositories/in-memory-partners.repository";
import { PartnerOwnershipValidator } from "@/domain/partners/application/services/partner-ownership.validator";
import { Partner } from "@/domain/partners/enterprise/entities/partner";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { GetDealsUseCase } from "@/domain/deals/application/use-cases/get-deals.use-case";
import { GetDealByIdUseCase } from "@/domain/deals/application/use-cases/get-deal-by-id.use-case";
import { CreateDealUseCase } from "@/domain/deals/application/use-cases/create-deal.use-case";
import { UpdateDealUseCase } from "@/domain/deals/application/use-cases/update-deal.use-case";
import { DeleteDealUseCase } from "@/domain/deals/application/use-cases/delete-deal.use-case";
import { UpdateDealStageUseCase } from "@/domain/deals/application/use-cases/update-deal-stage.use-case";

const OWNER_ID = "user-1";
const OTHER_ID = "user-2";
const STAGE_PROSP = { id: "stage-prosp", name: "Prospecção", probability: 20 };
const STAGE_WON = { id: "stage-won", name: "Ganho", probability: 100 };
const STAGE_LOST = { id: "stage-lost", name: "Perdido", probability: 0 };

function seedPartner(repo: InMemoryPartnersRepository, id: string, ownerId: string) {
  repo.items.push(
    Partner.create(
      { ownerId, name: `Parceiro ${id}`, partnerType: "indicador", partnerStatus: "active" },
      new UniqueEntityID(id),
    ),
  );
}

describe("Deals Use Cases", () => {
  let repo: InMemoryDealsRepository;
  let partnersRepo: InMemoryPartnersRepository;
  let getList: GetDealsUseCase;
  let getById: GetDealByIdUseCase;
  let create: CreateDealUseCase;
  let update: UpdateDealUseCase;
  let deleteDeal: DeleteDealUseCase;
  let updateStage: UpdateDealStageUseCase;

  beforeEach(() => {
    repo = new InMemoryDealsRepository();
    repo.stages = [STAGE_PROSP, STAGE_WON, STAGE_LOST];
    partnersRepo = new InMemoryPartnersRepository();
    // Partners referenced by the existing tests, all owned by OWNER_ID
    ["partner-1", "partner-2", "partner-x", "partner-y"].forEach((id) => seedPartner(partnersRepo, id, OWNER_ID));
    const partnerOwnership = new PartnerOwnershipValidator(partnersRepo);
    getList = new GetDealsUseCase(repo);
    getById = new GetDealByIdUseCase(repo);
    create = new CreateDealUseCase(repo, partnerOwnership);
    update = new UpdateDealUseCase(repo, partnerOwnership);
    deleteDeal = new DeleteDealUseCase(repo);
    updateStage = new UpdateDealStageUseCase(repo);
  });

  // ─── CreateDealUseCase ─────────────────────────────────────────────────────

  describe("CreateDealUseCase", () => {
    it("cria deal com dados mínimos", async () => {
      const result = await create.execute({
        ownerId: OWNER_ID,
        title: "Website Empresa ABC",
        stageId: STAGE_PROSP.id,
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        const d = result.value.deal;
        expect(d.title).toBe("Website Empresa ABC");
        expect(d.ownerId).toBe(OWNER_ID);
        expect(d.stageId).toBe(STAGE_PROSP.id);
        expect(d.value).toBe(0);
        expect(d.currency).toBe("BRL");
        expect(d.status).toBe("open");
      }
      expect(repo.items).toHaveLength(1);
    });

    it("cria deal com todos os campos", async () => {
      const result = await create.execute({
        ownerId: OWNER_ID,
        title: "ERP Completo",
        description: "Implementação de ERP com módulos financeiro e fiscal",
        value: 120000,
        currency: "BRL",
        stageId: STAGE_PROSP.id,
        contactId: "contact-1",
        organizationId: "org-1",
        expectedCloseDate: new Date("2025-12-31"),
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        const d = result.value.deal;
        expect(d.value).toBe(120000);
        expect(d.contactId).toBe("contact-1");
        expect(d.organizationId).toBe("org-1");
        expect(d.expectedCloseDate).toBeInstanceOf(Date);
      }
    });

    it("falha se título não for fornecido", async () => {
      const result = await create.execute({ ownerId: OWNER_ID, title: "", stageId: STAGE_PROSP.id });
      expect(result.isLeft()).toBe(true);
    });

    it("falha se stageId não for fornecido", async () => {
      const result = await create.execute({ ownerId: OWNER_ID, title: "Deal Teste", stageId: "" });
      expect(result.isLeft()).toBe(true);
    });

    it("falha se stage não existir", async () => {
      const result = await create.execute({ ownerId: OWNER_ID, title: "Deal Teste", stageId: "stage-inexistente" });
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) expect(result.value.message).toContain("Etapa não encontrada");
    });

    it("cria histórico de etapa ao criar deal", async () => {
      await create.execute({ ownerId: OWNER_ID, title: "Deal Teste", stageId: STAGE_PROSP.id });
      expect(repo.stageHistories).toHaveLength(1);
      expect(repo.stageHistories[0].fromStageId).toBeNull();
      expect(repo.stageHistories[0].toStageId).toBe(STAGE_PROSP.id);
    });

    it("cria deal com partner-cliente e partner-indicador", async () => {
      const result = await create.execute({
        ownerId: OWNER_ID,
        title: "Negócio de parceiro",
        stageId: STAGE_PROSP.id,
        partnerId: "partner-1",
        referredByPartnerId: "partner-2",
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.deal.partnerId).toBe("partner-1");
        expect(result.value.deal.referredByPartnerId).toBe("partner-2");
      }
    });

    it("rejeita partner-cliente de outro dono", async () => {
      seedPartner(partnersRepo, "partner-alheio", OTHER_ID);
      const result = await create.execute({
        ownerId: OWNER_ID,
        title: "Negócio inválido",
        stageId: STAGE_PROSP.id,
        partnerId: "partner-alheio",
      });
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) expect(result.value.message).toContain("Não autorizado");
      expect(repo.items).toHaveLength(0);
    });

    it("rejeita partner-indicador de outro dono", async () => {
      seedPartner(partnersRepo, "partner-alheio", OTHER_ID);
      const result = await create.execute({
        ownerId: OWNER_ID,
        title: "Negócio inválido",
        stageId: STAGE_PROSP.id,
        referredByPartnerId: "partner-alheio",
      });
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) expect(result.value.message).toContain("Não autorizado");
    });

    it("admin pode vincular partner de outro dono", async () => {
      seedPartner(partnersRepo, "partner-alheio", OTHER_ID);
      const result = await create.execute({
        ownerId: OWNER_ID,
        requesterRole: "admin",
        title: "Negócio admin",
        stageId: STAGE_PROSP.id,
        partnerId: "partner-alheio",
      });
      expect(result.isRight()).toBe(true);
    });

    it("rejeita partner inexistente", async () => {
      const result = await create.execute({
        ownerId: OWNER_ID,
        title: "Negócio inválido",
        stageId: STAGE_PROSP.id,
        partnerId: "partner-fantasma",
      });
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) expect(result.value.message).toContain("Parceiro não encontrado");
    });

    it("rejeita o mesmo parceiro como cliente e indicador", async () => {
      const result = await create.execute({
        ownerId: OWNER_ID,
        title: "Negócio inválido",
        stageId: STAGE_PROSP.id,
        partnerId: "partner-1",
        referredByPartnerId: "partner-1",
      });
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) expect(result.value.message).toContain("mesmo parceiro");
    });
  });

  // ─── GetDealsUseCase ───────────────────────────────────────────────────────

  describe("GetDealsUseCase", () => {
    beforeEach(async () => {
      await create.execute({ ownerId: OWNER_ID, title: "Deal A", stageId: STAGE_PROSP.id });
      await create.execute({ ownerId: OWNER_ID, title: "Deal B", stageId: STAGE_PROSP.id, value: 5000 });
      await create.execute({ ownerId: "user-2", title: "Deal C", stageId: STAGE_PROSP.id });
    });

    it("retorna apenas deals do owner", async () => {
      const result = await getList.execute({ requesterId: OWNER_ID, requesterRole: "sdr" });
      expect(result.isRight()).toBe(true);
      if (result.isRight()) expect(result.value.deals).toHaveLength(2);
    });

    it("admin vê todos os deals", async () => {
      const result = await getList.execute({ requesterId: "admin-1", requesterRole: "admin" });
      if (result.isRight()) expect(result.value.deals).toHaveLength(3);
    });

    it("filtra por search", async () => {
      const result = await getList.execute({ requesterId: OWNER_ID, requesterRole: "sdr", filters: { search: "Deal A" } });
      if (result.isRight()) expect(result.value.deals).toHaveLength(1);
    });

    it("filtra por stageId", async () => {
      const result = await getList.execute({ requesterId: OWNER_ID, requesterRole: "sdr", filters: { stageId: STAGE_PROSP.id } });
      if (result.isRight()) expect(result.value.deals).toHaveLength(2);
    });

    it("filtra por partnerId (parceiro-cliente)", async () => {
      await create.execute({ ownerId: OWNER_ID, title: "Deal do Parceiro", stageId: STAGE_PROSP.id, partnerId: "partner-x" });

      const result = await getList.execute({ requesterId: OWNER_ID, requesterRole: "sdr", filters: { partnerId: "partner-x" } });
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.deals).toHaveLength(1);
        expect(result.value.deals[0].partnerId).toBe("partner-x");
      }
    });

    it("filtra por referredByPartnerId (indicação)", async () => {
      await create.execute({ ownerId: OWNER_ID, title: "Deal Indicado", stageId: STAGE_PROSP.id, referredByPartnerId: "partner-y" });

      const result = await getList.execute({ requesterId: OWNER_ID, requesterRole: "sdr", filters: { referredByPartnerId: "partner-y" } });
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.deals).toHaveLength(1);
        expect(result.value.deals[0].referredByPartnerId).toBe("partner-y");
      }
    });
  });

  // ─── GetDealByIdUseCase ────────────────────────────────────────────────────

  describe("GetDealByIdUseCase", () => {
    it("retorna deal por ID", async () => {
      const created = await create.execute({ ownerId: OWNER_ID, title: "Deal Test", stageId: STAGE_PROSP.id });
      const dealId = (created as any).value.deal.id.toString();

      const result = await getById.execute({ id: dealId, requesterId: OWNER_ID, requesterRole: "sdr" });
      expect(result.isRight()).toBe(true);
      if (result.isRight()) expect(result.value.deal.title).toBe("Deal Test");
    });

    it("retorna erro se deal não existe", async () => {
      const result = await getById.execute({ id: "nao-existe", requesterId: OWNER_ID, requesterRole: "sdr" });
      expect(result.isLeft()).toBe(true);
    });

    it("não retorna deal de outro owner", async () => {
      const created = await create.execute({ ownerId: "user-2", title: "Deal Alheio", stageId: STAGE_PROSP.id });
      const dealId = (created as any).value.deal.id.toString();

      const result = await getById.execute({ id: dealId, requesterId: OWNER_ID, requesterRole: "sdr" });
      expect(result.isLeft()).toBe(true);
    });
  });

  // ─── UpdateDealUseCase ─────────────────────────────────────────────────────

  describe("UpdateDealUseCase", () => {
    it("atualiza campos do deal", async () => {
      const created = await create.execute({ ownerId: OWNER_ID, title: "Deal Original", stageId: STAGE_PROSP.id });
      const dealId = (created as any).value.deal.id.toString();

      const result = await update.execute({
        id: dealId,
        requesterId: OWNER_ID,
        requesterRole: "sdr",
        title: "Deal Atualizado",
        value: 50000,
        description: "Nova descrição",
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.deal.title).toBe("Deal Atualizado");
        expect(result.value.deal.value).toBe(50000);
        expect(result.value.deal.description).toBe("Nova descrição");
      }
    });

    it("atualiza status para won e define closedAt", async () => {
      const created = await create.execute({ ownerId: OWNER_ID, title: "Deal Won", stageId: STAGE_PROSP.id });
      const dealId = (created as any).value.deal.id.toString();

      const result = await update.execute({
        id: dealId,
        requesterId: OWNER_ID,
        requesterRole: "sdr",
        status: "won",
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.deal.status).toBe("won");
        expect(result.value.deal.closedAt).toBeInstanceOf(Date);
      }
    });

    it("reabrir deal limpa closedAt", async () => {
      const created = await create.execute({ ownerId: OWNER_ID, title: "Deal", stageId: STAGE_PROSP.id });
      const dealId = (created as any).value.deal.id.toString();

      await update.execute({ id: dealId, requesterId: OWNER_ID, requesterRole: "sdr", status: "won" });

      const result = await update.execute({
        id: dealId,
        requesterId: OWNER_ID,
        requesterRole: "sdr",
        status: "open",
      });

      if (result.isRight()) {
        expect(result.value.deal.status).toBe("open");
        expect(result.value.deal.closedAt).toBeUndefined();
      }
    });

    it("falha se deal não existir", async () => {
      const result = await update.execute({ id: "nao-existe", requesterId: OWNER_ID, requesterRole: "sdr", title: "X" });
      expect(result.isLeft()).toBe(true);
    });

    it("falha se não for owner e não for admin", async () => {
      const created = await create.execute({ ownerId: "user-2", title: "Deal Alheio", stageId: STAGE_PROSP.id });
      const dealId = (created as any).value.deal.id.toString();

      const result = await update.execute({ id: dealId, requesterId: OWNER_ID, requesterRole: "sdr", title: "Hack" });
      expect(result.isLeft()).toBe(true);
    });

    it("vincula partner-cliente e indicador via update", async () => {
      const created = await create.execute({ ownerId: OWNER_ID, title: "Deal", stageId: STAGE_PROSP.id });
      const dealId = (created as any).value.deal.id.toString();

      const result = await update.execute({
        id: dealId,
        requesterId: OWNER_ID,
        requesterRole: "sdr",
        partnerId: "partner-1",
        referredByPartnerId: "partner-2",
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.deal.partnerId).toBe("partner-1");
        expect(result.value.deal.referredByPartnerId).toBe("partner-2");
      }
    });

    it("desvincula partner (partnerId null) via update", async () => {
      const created = await create.execute({ ownerId: OWNER_ID, title: "Deal", stageId: STAGE_PROSP.id, partnerId: "partner-1" });
      const dealId = (created as any).value.deal.id.toString();

      const result = await update.execute({
        id: dealId,
        requesterId: OWNER_ID,
        requesterRole: "sdr",
        partnerId: undefined,
      });
      // undefined means "no change"; explicit null is what unlinks
      const unlinked = await update.execute({
        id: dealId,
        requesterId: OWNER_ID,
        requesterRole: "sdr",
        partnerId: null as unknown as string,
      });

      expect(result.isRight()).toBe(true);
      expect(unlinked.isRight()).toBe(true);
      if (unlinked.isRight()) expect(unlinked.value.deal.partnerId).toBeNull();
    });

    it("rejeita vincular partner de outro dono via update", async () => {
      seedPartner(partnersRepo, "partner-alheio", OTHER_ID);
      const created = await create.execute({ ownerId: OWNER_ID, title: "Deal", stageId: STAGE_PROSP.id });
      const dealId = (created as any).value.deal.id.toString();

      const result = await update.execute({
        id: dealId,
        requesterId: OWNER_ID,
        requesterRole: "sdr",
        partnerId: "partner-alheio",
      });
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) expect(result.value.message).toContain("Não autorizado");
    });

    it("rejeita mesmo parceiro cliente+indicador considerando estado existente", async () => {
      // Deal already has partner-1 as referrer; now try to set it as client too
      const created = await create.execute({ ownerId: OWNER_ID, title: "Deal", stageId: STAGE_PROSP.id, referredByPartnerId: "partner-1" });
      const dealId = (created as any).value.deal.id.toString();

      const result = await update.execute({
        id: dealId,
        requesterId: OWNER_ID,
        requesterRole: "sdr",
        partnerId: "partner-1",
      });
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) expect(result.value.message).toContain("mesmo parceiro");
    });
  });

  // ─── DeleteDealUseCase ─────────────────────────────────────────────────────

  describe("DeleteDealUseCase", () => {
    it("deleta deal do owner", async () => {
      const created = await create.execute({ ownerId: OWNER_ID, title: "Deal Delete", stageId: STAGE_PROSP.id });
      const dealId = (created as any).value.deal.id.toString();

      const result = await deleteDeal.execute({ id: dealId, requesterId: OWNER_ID, requesterRole: "sdr" });
      expect(result.isRight()).toBe(true);
      expect(repo.items).toHaveLength(0);
    });

    it("falha se deal não existir", async () => {
      const result = await deleteDeal.execute({ id: "nao-existe", requesterId: OWNER_ID, requesterRole: "sdr" });
      expect(result.isLeft()).toBe(true);
    });

    it("admin pode deletar qualquer deal", async () => {
      const created = await create.execute({ ownerId: "user-2", title: "Deal Alheio", stageId: STAGE_PROSP.id });
      const dealId = (created as any).value.deal.id.toString();

      const result = await deleteDeal.execute({ id: dealId, requesterId: "admin-1", requesterRole: "admin" });
      expect(result.isRight()).toBe(true);
    });
  });

  // ─── UpdateDealStageUseCase ────────────────────────────────────────────────

  describe("UpdateDealStageUseCase", () => {
    it("move deal para nova etapa", async () => {
      const created = await create.execute({ ownerId: OWNER_ID, title: "Deal Stage", stageId: STAGE_PROSP.id });
      const dealId = (created as any).value.deal.id.toString();

      const result = await updateStage.execute({
        id: dealId,
        stageId: STAGE_WON.id,
        requesterId: OWNER_ID,
        requesterRole: "sdr",
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.deal.stageId).toBe(STAGE_WON.id);
      }
    });

    it("mover para etapa com probabilidade 100 define status won", async () => {
      const created = await create.execute({ ownerId: OWNER_ID, title: "Deal Won", stageId: STAGE_PROSP.id });
      const dealId = (created as any).value.deal.id.toString();

      const result = await updateStage.execute({
        id: dealId,
        stageId: STAGE_WON.id,
        requesterId: OWNER_ID,
        requesterRole: "sdr",
      });

      if (result.isRight()) {
        expect(result.value.deal.status).toBe("won");
        expect(result.value.deal.closedAt).toBeInstanceOf(Date);
      }
    });

    it("mover para etapa com probabilidade 0 define status lost", async () => {
      const created = await create.execute({ ownerId: OWNER_ID, title: "Deal Lost", stageId: STAGE_PROSP.id });
      const dealId = (created as any).value.deal.id.toString();

      const result = await updateStage.execute({
        id: dealId,
        stageId: STAGE_LOST.id,
        requesterId: OWNER_ID,
        requesterRole: "sdr",
      });

      if (result.isRight()) {
        expect(result.value.deal.status).toBe("lost");
        expect(result.value.deal.closedAt).toBeInstanceOf(Date);
      }
    });

    it("mover para etapa intermediária reabre deal", async () => {
      const created = await create.execute({ ownerId: OWNER_ID, title: "Deal Reopen", stageId: STAGE_PROSP.id });
      const dealId = (created as any).value.deal.id.toString();
      await updateStage.execute({ id: dealId, stageId: STAGE_WON.id, requesterId: OWNER_ID, requesterRole: "sdr" });

      const result = await updateStage.execute({
        id: dealId,
        stageId: STAGE_PROSP.id,
        requesterId: OWNER_ID,
        requesterRole: "sdr",
      });

      if (result.isRight()) {
        expect(result.value.deal.status).toBe("open");
        expect(result.value.deal.closedAt).toBeUndefined();
      }
    });

    it("cria histórico ao mover etapa", async () => {
      const created = await create.execute({ ownerId: OWNER_ID, title: "Deal Hist", stageId: STAGE_PROSP.id });
      const dealId = (created as any).value.deal.id.toString();
      const historiesBefore = repo.stageHistories.length;

      await updateStage.execute({ id: dealId, stageId: STAGE_WON.id, requesterId: OWNER_ID, requesterRole: "sdr" });

      expect(repo.stageHistories).toHaveLength(historiesBefore + 1);
      const last = repo.stageHistories[repo.stageHistories.length - 1];
      expect(last.fromStageId).toBe(STAGE_PROSP.id);
      expect(last.toStageId).toBe(STAGE_WON.id);
    });

    it("falha se deal não existir", async () => {
      const result = await updateStage.execute({ id: "nao-existe", stageId: STAGE_WON.id, requesterId: OWNER_ID, requesterRole: "sdr" });
      expect(result.isLeft()).toBe(true);
    });

    it("falha se stage não existir", async () => {
      const created = await create.execute({ ownerId: OWNER_ID, title: "Deal", stageId: STAGE_PROSP.id });
      const dealId = (created as any).value.deal.id.toString();

      const result = await updateStage.execute({ id: dealId, stageId: "stage-inexistente", requesterId: OWNER_ID, requesterRole: "sdr" });
      expect(result.isLeft()).toBe(true);
    });

    it("não autorizado para usuário sem acesso", async () => {
      const created = await create.execute({ ownerId: "user-2", title: "Deal Alheio", stageId: STAGE_PROSP.id });
      const dealId = (created as any).value.deal.id.toString();

      const result = await updateStage.execute({ id: dealId, stageId: STAGE_WON.id, requesterId: OWNER_ID, requesterRole: "sdr" });
      expect(result.isLeft()).toBe(true);
    });
  });
});
