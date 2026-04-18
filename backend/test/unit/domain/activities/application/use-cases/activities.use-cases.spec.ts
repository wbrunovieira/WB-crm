import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryActivitiesRepository } from "../../repositories/in-memory-activities.repository";
import { GetActivitiesUseCase } from "@/domain/activities/application/use-cases/get-activities.use-case";
import { GetActivityByIdUseCase } from "@/domain/activities/application/use-cases/get-activity-by-id.use-case";
import { CreateActivityUseCase } from "@/domain/activities/application/use-cases/create-activity.use-case";
import { UpdateActivityUseCase } from "@/domain/activities/application/use-cases/update-activity.use-case";
import { DeleteActivityUseCase } from "@/domain/activities/application/use-cases/delete-activity.use-case";
import { ToggleActivityCompletedUseCase } from "@/domain/activities/application/use-cases/toggle-activity-completed.use-case";
import { MarkActivityFailedUseCase } from "@/domain/activities/application/use-cases/mark-activity-failed.use-case";
import { MarkActivitySkippedUseCase } from "@/domain/activities/application/use-cases/mark-activity-skipped.use-case";
import { RevertActivityOutcomeUseCase } from "@/domain/activities/application/use-cases/revert-activity-outcome.use-case";
import { LinkActivityToDealUseCase } from "@/domain/activities/application/use-cases/link-activity-to-deal.use-case";
import { UnlinkActivityFromDealUseCase } from "@/domain/activities/application/use-cases/unlink-activity-from-deal.use-case";

const OWNER_ID = "user-1";
const OTHER_ID = "user-2";

describe("Activities Use Cases", () => {
  let repo: InMemoryActivitiesRepository;
  let getList: GetActivitiesUseCase;
  let getById: GetActivityByIdUseCase;
  let create: CreateActivityUseCase;
  let update: UpdateActivityUseCase;
  let deleteActivity: DeleteActivityUseCase;
  let toggleCompleted: ToggleActivityCompletedUseCase;
  let markFailed: MarkActivityFailedUseCase;
  let markSkipped: MarkActivitySkippedUseCase;
  let revertOutcome: RevertActivityOutcomeUseCase;
  let linkToDeal: LinkActivityToDealUseCase;
  let unlinkFromDeal: UnlinkActivityFromDealUseCase;

  beforeEach(() => {
    repo = new InMemoryActivitiesRepository();
    getList = new GetActivitiesUseCase(repo);
    getById = new GetActivityByIdUseCase(repo);
    create = new CreateActivityUseCase(repo);
    update = new UpdateActivityUseCase(repo);
    deleteActivity = new DeleteActivityUseCase(repo);
    toggleCompleted = new ToggleActivityCompletedUseCase(repo);
    markFailed = new MarkActivityFailedUseCase(repo);
    markSkipped = new MarkActivitySkippedUseCase(repo);
    revertOutcome = new RevertActivityOutcomeUseCase(repo);
    linkToDeal = new LinkActivityToDealUseCase(repo);
    unlinkFromDeal = new UnlinkActivityFromDealUseCase(repo);
  });

  // ─── CreateActivityUseCase ────────────────────────────────────────────────

  describe("CreateActivityUseCase", () => {
    it("cria atividade com dados mínimos", async () => {
      const result = await create.execute({
        ownerId: OWNER_ID,
        type: "call",
        subject: "Ligação com João",
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        const a = result.value.activity;
        expect(a.type).toBe("call");
        expect(a.subject).toBe("Ligação com João");
        expect(a.ownerId).toBe(OWNER_ID);
        expect(a.completed).toBe(false);
        expect(a.meetingNoShow).toBe(false);
        expect(a.emailReplied).toBe(false);
        expect(a.emailOpenCount).toBe(0);
        expect(a.emailLinkClickCount).toBe(0);
      }
      expect(repo.items).toHaveLength(1);
    });

    it("cria atividade com dealId e contactIds", async () => {
      const result = await create.execute({
        ownerId: OWNER_ID,
        type: "meeting",
        subject: "Reunião de kickoff",
        dealId: "deal-1",
        contactIds: ["contact-1", "contact-2"],
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        const a = result.value.activity;
        expect(a.dealId).toBe("deal-1");
        expect(a.contactId).toBe("contact-1"); // first becomes primary
        expect(a.contactIds).toBe(JSON.stringify(["contact-1", "contact-2"]));
      }
    });

    it("cria atividade com leadContactIds", async () => {
      const result = await create.execute({
        ownerId: OWNER_ID,
        type: "call",
        subject: "Prospecção lead",
        leadId: "lead-1",
        leadContactIds: ["lc-1", "lc-2"],
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        const a = result.value.activity;
        expect(a.leadId).toBe("lead-1");
        expect(a.leadContactIds).toBe(JSON.stringify(["lc-1", "lc-2"]));
      }
    });
  });

  // ─── GetActivitiesUseCase ─────────────────────────────────────────────────

  describe("GetActivitiesUseCase", () => {
    beforeEach(async () => {
      await create.execute({ ownerId: OWNER_ID, type: "call", subject: "Call 1" });
      await create.execute({ ownerId: OWNER_ID, type: "meeting", subject: "Meeting 1" });
      await create.execute({ ownerId: OTHER_ID, type: "call", subject: "Other call" });
    });

    it("lista apenas as atividades do requester (sdr)", async () => {
      const result = await getList.execute({
        requesterId: OWNER_ID,
        requesterRole: "sdr",
        filters: {},
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.activities).toHaveLength(2);
        expect(result.value.activities.every((a) => a.ownerId === OWNER_ID)).toBe(true);
      }
    });

    it("admin lista todas as atividades", async () => {
      const result = await getList.execute({
        requesterId: OWNER_ID,
        requesterRole: "admin",
        filters: {},
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.activities).toHaveLength(3);
      }
    });

    it("filtra por type", async () => {
      const result = await getList.execute({
        requesterId: OWNER_ID,
        requesterRole: "sdr",
        filters: { type: "call" },
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.activities).toHaveLength(1);
        expect(result.value.activities[0].type).toBe("call");
      }
    });
  });

  // ─── GetActivityByIdUseCase ───────────────────────────────────────────────

  describe("GetActivityByIdUseCase", () => {
    it("retorna atividade pelo id", async () => {
      const created = await create.execute({ ownerId: OWNER_ID, type: "call", subject: "Test" });
      const id = (created.value as any).activity.id.toString();

      const result = await getById.execute({ id, requesterId: OWNER_ID, requesterRole: "sdr" });
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.activity.subject).toBe("Test");
      }
    });

    it("retorna erro se não encontrada", async () => {
      const result = await getById.execute({ id: "nope", requesterId: OWNER_ID, requesterRole: "sdr" });
      expect(result.isLeft()).toBe(true);
    });

    it("não permite acesso de outro usuário", async () => {
      const created = await create.execute({ ownerId: OWNER_ID, type: "call", subject: "Private" });
      const id = (created.value as any).activity.id.toString();

      const result = await getById.execute({ id, requesterId: OTHER_ID, requesterRole: "sdr" });
      expect(result.isLeft()).toBe(true);
    });
  });

  // ─── UpdateActivityUseCase ────────────────────────────────────────────────

  describe("UpdateActivityUseCase", () => {
    it("atualiza campos da atividade", async () => {
      const created = await create.execute({ ownerId: OWNER_ID, type: "call", subject: "Original" });
      const id = (created.value as any).activity.id.toString();

      const result = await update.execute({
        id,
        requesterId: OWNER_ID,
        requesterRole: "sdr",
        subject: "Atualizado",
        type: "meeting",
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.activity.subject).toBe("Atualizado");
        expect(result.value.activity.type).toBe("meeting");
      }
    });

    it("não permite atualização por outro usuário", async () => {
      const created = await create.execute({ ownerId: OWNER_ID, type: "call", subject: "Test" });
      const id = (created.value as any).activity.id.toString();

      const result = await update.execute({
        id,
        requesterId: OTHER_ID,
        requesterRole: "sdr",
        subject: "Hack",
      });

      expect(result.isLeft()).toBe(true);
    });
  });

  // ─── DeleteActivityUseCase ────────────────────────────────────────────────

  describe("DeleteActivityUseCase", () => {
    it("deleta atividade do owner", async () => {
      const created = await create.execute({ ownerId: OWNER_ID, type: "call", subject: "To Delete" });
      const id = (created.value as any).activity.id.toString();

      const result = await deleteActivity.execute({ id, requesterId: OWNER_ID, requesterRole: "sdr" });
      expect(result.isRight()).toBe(true);
      expect(repo.items).toHaveLength(0);
    });

    it("não permite deletar de outro usuário", async () => {
      const created = await create.execute({ ownerId: OWNER_ID, type: "call", subject: "Protected" });
      const id = (created.value as any).activity.id.toString();

      const result = await deleteActivity.execute({ id, requesterId: OTHER_ID, requesterRole: "sdr" });
      expect(result.isLeft()).toBe(true);
      expect(repo.items).toHaveLength(1);
    });
  });

  // ─── ToggleActivityCompletedUseCase ───────────────────────────────────────

  describe("ToggleActivityCompletedUseCase", () => {
    it("alterna completed de false para true e seta completedAt", async () => {
      const created = await create.execute({ ownerId: OWNER_ID, type: "call", subject: "Call" });
      const id = (created.value as any).activity.id.toString();

      const result = await toggleCompleted.execute({ id, requesterId: OWNER_ID, requesterRole: "sdr" });
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.activity.completed).toBe(true);
        expect(result.value.activity.completedAt).toBeInstanceOf(Date);
      }
    });

    it("alterna completed de true para false e limpa completedAt", async () => {
      const created = await create.execute({ ownerId: OWNER_ID, type: "call", subject: "Call" });
      const id = (created.value as any).activity.id.toString();

      await toggleCompleted.execute({ id, requesterId: OWNER_ID, requesterRole: "sdr" });
      const result = await toggleCompleted.execute({ id, requesterId: OWNER_ID, requesterRole: "sdr" });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.activity.completed).toBe(false);
        expect(result.value.activity.completedAt).toBeUndefined();
      }
    });
  });

  // ─── MarkActivityFailedUseCase ────────────────────────────────────────────

  describe("MarkActivityFailedUseCase", () => {
    it("marca atividade como falha com razão", async () => {
      const created = await create.execute({ ownerId: OWNER_ID, type: "call", subject: "Call" });
      const id = (created.value as any).activity.id.toString();

      const result = await markFailed.execute({
        id, reason: "Não atendeu", requesterId: OWNER_ID, requesterRole: "sdr",
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.activity.failedAt).toBeInstanceOf(Date);
        expect(result.value.activity.failReason).toBe("Não atendeu");
        expect(result.value.activity.skippedAt).toBeUndefined();
      }
    });
  });

  // ─── MarkActivitySkippedUseCase ───────────────────────────────────────────

  describe("MarkActivitySkippedUseCase", () => {
    it("marca atividade como pulada com razão", async () => {
      const created = await create.execute({ ownerId: OWNER_ID, type: "call", subject: "Call" });
      const id = (created.value as any).activity.id.toString();

      const result = await markSkipped.execute({
        id, reason: "Sem tempo", requesterId: OWNER_ID, requesterRole: "sdr",
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.activity.skippedAt).toBeInstanceOf(Date);
        expect(result.value.activity.skipReason).toBe("Sem tempo");
        expect(result.value.activity.failedAt).toBeUndefined();
      }
    });
  });

  // ─── RevertActivityOutcomeUseCase ─────────────────────────────────────────

  describe("RevertActivityOutcomeUseCase", () => {
    it("reverte fail clearing failedAt e failReason", async () => {
      const created = await create.execute({ ownerId: OWNER_ID, type: "call", subject: "Call" });
      const id = (created.value as any).activity.id.toString();
      await markFailed.execute({ id, reason: "Falhou", requesterId: OWNER_ID, requesterRole: "sdr" });

      const result = await revertOutcome.execute({ id, requesterId: OWNER_ID, requesterRole: "sdr" });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.activity.failedAt).toBeUndefined();
        expect(result.value.activity.failReason).toBeUndefined();
        expect(result.value.activity.skippedAt).toBeUndefined();
      }
    });

    it("reverte skip clearing skippedAt e skipReason", async () => {
      const created = await create.execute({ ownerId: OWNER_ID, type: "call", subject: "Call" });
      const id = (created.value as any).activity.id.toString();
      await markSkipped.execute({ id, reason: "Pulou", requesterId: OWNER_ID, requesterRole: "sdr" });

      const result = await revertOutcome.execute({ id, requesterId: OWNER_ID, requesterRole: "sdr" });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.activity.skippedAt).toBeUndefined();
        expect(result.value.activity.skipReason).toBeUndefined();
      }
    });
  });

  // ─── LinkActivityToDealUseCase ────────────────────────────────────────────

  describe("LinkActivityToDealUseCase", () => {
    it("vincula atividade a um deal secundário", async () => {
      const created = await create.execute({ ownerId: OWNER_ID, type: "call", subject: "Call" });
      const id = (created.value as any).activity.id.toString();

      const result = await linkToDeal.execute({ id, dealId: "deal-1", requesterId: OWNER_ID, requesterRole: "sdr" });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        const ids = JSON.parse(result.value.activity.additionalDealIds ?? "[]");
        expect(ids).toContain("deal-1");
      }
    });

    it("não duplica deal já vinculado", async () => {
      const created = await create.execute({ ownerId: OWNER_ID, type: "call", subject: "Call" });
      const id = (created.value as any).activity.id.toString();

      await linkToDeal.execute({ id, dealId: "deal-1", requesterId: OWNER_ID, requesterRole: "sdr" });
      await linkToDeal.execute({ id, dealId: "deal-1", requesterId: OWNER_ID, requesterRole: "sdr" });

      const result = await linkToDeal.execute({ id, dealId: "deal-1", requesterId: OWNER_ID, requesterRole: "sdr" });
      if (result.isRight()) {
        const ids = JSON.parse(result.value.activity.additionalDealIds ?? "[]");
        expect(ids.filter((d: string) => d === "deal-1")).toHaveLength(1);
      }
    });
  });

  // ─── UnlinkActivityFromDealUseCase ────────────────────────────────────────

  describe("UnlinkActivityFromDealUseCase", () => {
    it("desvincula atividade de um deal", async () => {
      const created = await create.execute({ ownerId: OWNER_ID, type: "call", subject: "Call" });
      const id = (created.value as any).activity.id.toString();
      await linkToDeal.execute({ id, dealId: "deal-1", requesterId: OWNER_ID, requesterRole: "sdr" });

      const result = await unlinkFromDeal.execute({ id, dealId: "deal-1", requesterId: OWNER_ID, requesterRole: "sdr" });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        const ids = JSON.parse(result.value.activity.additionalDealIds ?? "[]");
        expect(ids).not.toContain("deal-1");
      }
    });
  });
});
