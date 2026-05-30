import { describe, it, expect, beforeEach } from "vitest";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { BotFlow } from "@/domain/bot-flows/enterprise/entities/bot-flow.entity";
import { CreateBotFlowUseCase } from "@/domain/bot-flows/application/use-cases/create-bot-flow.use-case";
import { ListBotFlowsUseCase } from "@/domain/bot-flows/application/use-cases/list-bot-flows.use-case";
import { GetBotFlowUseCase } from "@/domain/bot-flows/application/use-cases/get-bot-flow.use-case";
import { ToggleBotFlowUseCase } from "@/domain/bot-flows/application/use-cases/toggle-bot-flow.use-case";
import { DeleteBotFlowUseCase } from "@/domain/bot-flows/application/use-cases/delete-bot-flow.use-case";
import { SaveBotFlowUseCase } from "@/domain/bot-flows/application/use-cases/save-bot-flow.use-case";

const OWNER = "owner-1";
const OTHER = "owner-2";

class FakeRepo {
  items: BotFlow[] = [];
  deleted: string[] = [];
  savedCount = 0;
  async findById(id: string) { return this.items.find((f) => f.id.toString() === id) ?? null; }
  async findAllByOwner(ownerId: string) { return this.items.filter((f) => f.ownerId === ownerId); }
  async findActiveByInstance() { return []; }
  async save(flow: BotFlow) { this.savedCount++; const i = this.items.findIndex((f) => f.id.equals(flow.id)); if (i >= 0) this.items[i] = flow; else this.items.push(flow); }
  async delete(id: string) { this.deleted.push(id); }
}

function flow(id: string, ownerId = OWNER) {
  return BotFlow.create({ ownerId, instanceName: "inst-1", name: "Fluxo", triggerType: "KEYWORD", triggerValue: "oi" }, new UniqueEntityID(id));
}

describe("Bot-flows CRUD use cases", () => {
  let repo: FakeRepo;
  beforeEach(() => { repo = new FakeRepo(); });

  it("Create salva e retorna o flow", async () => {
    const r = await new CreateBotFlowUseCase(repo as never).execute({ ownerId: OWNER, instanceName: "inst-1", name: "Novo" });
    expect(r.isRight()).toBe(true);
    expect(repo.savedCount).toBe(1);
    if (r.isRight()) expect(r.value.flow.ownerId).toBe(OWNER);
  });

  it("List retorna só os flows do owner", async () => {
    repo.items.push(flow("a"), flow("b", OTHER));
    const r = await new ListBotFlowsUseCase(repo as never).execute(OWNER);
    if (r.isRight()) expect(r.value.flows).toHaveLength(1);
    else throw new Error("esperava right");
  });

  describe("Get", () => {
    it("dono → right", async () => {
      repo.items.push(flow("a"));
      const r = await new GetBotFlowUseCase(repo as never).execute({ id: "a", ownerId: OWNER });
      expect(r.isRight()).toBe(true);
    });
    it("inexistente → left", async () => {
      const r = await new GetBotFlowUseCase(repo as never).execute({ id: "x", ownerId: OWNER });
      expect(r.isLeft()).toBe(true);
    });
    it("outro dono → left (Unauthorized)", async () => {
      repo.items.push(flow("a", OTHER));
      const r = await new GetBotFlowUseCase(repo as never).execute({ id: "a", ownerId: OWNER });
      expect(r.isLeft()).toBe(true);
      if (r.isLeft()) expect(r.value.message).toBe("Unauthorized");
    });
  });

  describe("Toggle", () => {
    it("inverte isActive e salva", async () => {
      const f = flow("a");
      repo.items.push(f);
      const before = f.isActive;
      const r = await new ToggleBotFlowUseCase(repo as never).execute({ id: "a", ownerId: OWNER });
      expect(r.isRight()).toBe(true);
      if (r.isRight()) expect(r.value.isActive).toBe(!before);
      expect(repo.savedCount).toBe(1);
    });
    it("outro dono → left, não salva", async () => {
      repo.items.push(flow("a", OTHER));
      const r = await new ToggleBotFlowUseCase(repo as never).execute({ id: "a", ownerId: OWNER });
      expect(r.isLeft()).toBe(true);
      expect(repo.savedCount).toBe(0);
    });
  });

  describe("Delete", () => {
    it("dono → deleta", async () => {
      repo.items.push(flow("a"));
      const r = await new DeleteBotFlowUseCase(repo as never).execute({ id: "a", ownerId: OWNER });
      expect(r.isRight()).toBe(true);
      expect(repo.deleted).toEqual(["a"]);
    });
    it("outro dono → left, não deleta", async () => {
      repo.items.push(flow("a", OTHER));
      const r = await new DeleteBotFlowUseCase(repo as never).execute({ id: "a", ownerId: OWNER });
      expect(r.isLeft()).toBe(true);
      expect(repo.deleted).toHaveLength(0);
    });
    it("inexistente → left, não deleta", async () => {
      const r = await new DeleteBotFlowUseCase(repo as never).execute({ id: "x", ownerId: OWNER });
      expect(r.isLeft()).toBe(true);
      expect(repo.deleted).toHaveLength(0);
    });
  });

  describe("Save", () => {
    it("dono → salva o flow (com nós/arestas vazios)", async () => {
      repo.items.push(flow("a"));
      const r = await new SaveBotFlowUseCase(repo as never).execute({ flowId: "a", ownerId: OWNER, nodes: [], edges: [], name: "Renomeado" });
      expect(r.isRight()).toBe(true);
      expect(repo.savedCount).toBe(1);
    });
    it("outro dono → left, não salva", async () => {
      repo.items.push(flow("a", OTHER));
      const r = await new SaveBotFlowUseCase(repo as never).execute({ flowId: "a", ownerId: OWNER, nodes: [], edges: [] });
      expect(r.isLeft()).toBe(true);
      expect(repo.savedCount).toBe(0);
    });
    it("inexistente → left", async () => {
      const r = await new SaveBotFlowUseCase(repo as never).execute({ flowId: "x", ownerId: OWNER, nodes: [], edges: [] });
      expect(r.isLeft()).toBe(true);
    });
  });
});
