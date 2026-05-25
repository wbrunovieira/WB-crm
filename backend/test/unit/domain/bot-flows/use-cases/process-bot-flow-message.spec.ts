import { describe, it, expect, beforeEach } from "vitest";
import { ProcessBotFlowMessageUseCase } from "@/domain/bot-flows/application/use-cases/process-bot-flow-message.use-case";
import { BotFlow } from "@/domain/bot-flows/enterprise/entities/bot-flow.entity";
import { BotFlowNode } from "@/domain/bot-flows/enterprise/entities/bot-flow-node.entity";
import { BotFlowEdge } from "@/domain/bot-flows/enterprise/entities/bot-flow-edge.entity";
import { BotFlowSession } from "@/domain/bot-flows/enterprise/entities/bot-flow-session.entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

// ── In-memory fakes ─────────────────────────────────────────────────────────

class InMemoryBotFlowsRepo {
  items: BotFlow[] = [];
  async findById(id: string) { return this.items.find(f => f.id.toString() === id) ?? null; }
  async findAllByOwner(ownerId: string) { return this.items.filter(f => f.ownerId === ownerId); }
  async findActiveByInstance(instanceName: string) { return this.items.filter(f => f.instanceName === instanceName && f.isActive); }
  async save(flow: BotFlow) {
    const idx = this.items.findIndex(f => f.id.toString() === flow.id.toString());
    if (idx >= 0) this.items[idx] = flow; else this.items.push(flow);
  }
  async delete(id: string) { this.items = this.items.filter(f => f.id.toString() !== id); }
}

class InMemoryBotFlowSessionsRepo {
  items: BotFlowSession[] = [];
  async findActiveByPhone(phone: string, instanceName: string) {
    return this.items.find(s => s.phone === phone && s.instanceName === instanceName && s.status === "ACTIVE") ?? null;
  }
  async save(session: BotFlowSession) {
    const idx = this.items.findIndex(s => s.id.toString() === session.id.toString());
    if (idx >= 0) this.items[idx] = session; else this.items.push(session);
  }
  async findById(id: string) { return this.items.find(s => s.id.toString() === id) ?? null; }
}

class FakeEvolutionApi {
  sent: Array<{ phone: string; text?: string; type: string }> = [];
  async sendText(p: { instanceName: string; phone: string; text: string }) { this.sent.push({ phone: p.phone, text: p.text, type: "text" }); }
  async sendMedia(p: { instanceName: string; phone: string; mediaUrl: string; mediaType: string; caption?: string }) { this.sent.push({ phone: p.phone, type: p.mediaType }); }
  async sendTyping(p: { instanceName: string; phone: string; durationSeconds: number }) { this.sent.push({ phone: p.phone, type: "typing" }); }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeNode(flowId: string, type: string, config: Record<string, unknown> = {}, id?: string): BotFlowNode {
  return BotFlowNode.create({ flowId, nodeType: type as any, posX: 0, posY: 0, config }, id ? new UniqueEntityID(id) : undefined);
}

function makeEdge(flowId: string, srcId: string, tgtId: string, cond?: { type: string; value?: string }, id?: string): BotFlowEdge {
  return BotFlowEdge.create({
    flowId,
    sourceNodeId: srcId,
    targetNodeId: tgtId,
    conditionType: cond?.type as any,
    conditionValue: cond?.value,
  }, id ? new UniqueEntityID(id) : undefined);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("ProcessBotFlowMessageUseCase", () => {
  let flowsRepo: InMemoryBotFlowsRepo;
  let sessionsRepo: InMemoryBotFlowSessionsRepo;
  let evolutionApi: FakeEvolutionApi;
  let sut: ProcessBotFlowMessageUseCase;

  beforeEach(() => {
    flowsRepo = new InMemoryBotFlowsRepo();
    sessionsRepo = new InMemoryBotFlowSessionsRepo();
    evolutionApi = new FakeEvolutionApi();
    sut = new ProcessBotFlowMessageUseCase(flowsRepo as any, sessionsRepo as any, evolutionApi as any);
  });

  it("should start a flow when keyword trigger matches", async () => {
    const flowId = "flow-1";
    const startNodeId = "start-1";
    const msgNodeId = "msg-1";
    const waitNodeId = "wait-1";

    const startNode = makeNode(flowId, "START", {}, startNodeId);
    const msgNode = makeNode(flowId, "SEND_MESSAGE", { type: "text", text: "Olá {{nome}}! Como posso ajudar?" }, msgNodeId);
    const waitNode = makeNode(flowId, "WAIT_RESPONSE", { timeoutMinutes: 30 }, waitNodeId);

    const flow = BotFlow.create({ ownerId: "owner-1", instanceName: "inst-1", name: "Test", triggerType: "KEYWORD", triggerValue: "oi" });
    flow.setFlow(
      [startNode, msgNode, waitNode],
      [
        makeEdge(flowId, startNodeId, msgNodeId),
        makeEdge(flowId, msgNodeId, waitNodeId),
      ],
    );
    flow.activate();
    await flowsRepo.save(flow);

    const result = await sut.execute({ instanceName: "inst-1", phone: "+5511999999999", text: "oi", ownerId: "owner-1" });

    expect(result.isRight()).toBe(true);
    expect(evolutionApi.sent).toHaveLength(1);
    expect(evolutionApi.sent[0].text).toContain("Como posso ajudar?");
    expect(sessionsRepo.items).toHaveLength(1);
    expect(sessionsRepo.items[0].status).toBe("ACTIVE");
    expect(sessionsRepo.items[0].currentNodeId).toBe(waitNodeId);
  });

  it("should not start a flow when keyword does not match", async () => {
    const flow = BotFlow.create({ ownerId: "owner-1", instanceName: "inst-1", name: "Test", triggerType: "KEYWORD", triggerValue: "oi" });
    const startNode = makeNode(flow.id.toString(), "START", {});
    flow.setFlow([startNode], []);
    flow.activate();
    await flowsRepo.save(flow);

    const result = await sut.execute({ instanceName: "inst-1", phone: "+5511999999999", text: "hello", ownerId: "owner-1" });

    expect(result.isRight()).toBe(true);
    expect((result.value as any).handled).toBe(false);
    expect(sessionsRepo.items).toHaveLength(0);
  });

  it("should follow condition edge when response matches 'contains'", async () => {
    const flowId = "flow-2";
    const waitNodeId = "wait-1";
    const yesNodeId = "yes-1";
    const noNodeId = "no-1";
    const endNodeId = "end-1";

    const waitNode = makeNode(flowId, "WAIT_RESPONSE", { timeoutMinutes: 30 }, waitNodeId);
    const yesNode = makeNode(flowId, "SEND_MESSAGE", { type: "text", text: "Ótimo! Vamos agendar." }, yesNodeId);
    const noNode  = makeNode(flowId, "SEND_MESSAGE", { type: "text", text: "Tudo bem! Qualquer dúvida estou aqui." }, noNodeId);
    const endNode = makeNode(flowId, "END", {}, endNodeId);

    const flow = BotFlow.create({ ownerId: "owner-1", instanceName: "inst-1", name: "Test", triggerType: "ALL" }, new UniqueEntityID(flowId));
    flow.setFlow(
      [waitNode, yesNode, noNode, endNode],
      [
        makeEdge(flowId, waitNodeId, yesNodeId, { type: "contains", value: "sim" }),
        makeEdge(flowId, waitNodeId, noNodeId,  { type: "contains", value: "não" }),
        makeEdge(flowId, yesNodeId, endNodeId),
        makeEdge(flowId, noNodeId,  endNodeId),
      ],
    );
    flow.activate();
    await flowsRepo.save(flow);

    // Seed an active session waiting at waitNode
    const session = BotFlowSession.create({ flowId, instanceName: "inst-1", phone: "+5511999999999", currentNodeId: waitNodeId, variables: {} });
    session.setWaiting();
    await sessionsRepo.save(session);

    const result = await sut.execute({ instanceName: "inst-1", phone: "+5511999999999", text: "Sim, quero saber mais", ownerId: "owner-1" });

    expect(result.isRight()).toBe(true);
    expect(evolutionApi.sent).toHaveLength(1);
    expect(evolutionApi.sent[0].text).toBe("Ótimo! Vamos agendar.");
    expect(sessionsRepo.items[0].status).toBe("COMPLETED");
  });

  it("should follow default edge when no condition matches", async () => {
    const flowId = "flow-3";
    const waitNodeId = "wait-1";
    const defaultNodeId = "def-1";
    const endNodeId = "end-1";

    const waitNode    = makeNode(flowId, "WAIT_RESPONSE", { timeoutMinutes: 10 }, waitNodeId);
    const defaultNode = makeNode(flowId, "SEND_MESSAGE", { type: "text", text: "Não entendi. Responda sim ou não." }, defaultNodeId);
    const endNode     = makeNode(flowId, "END", {}, endNodeId);

    const flow = BotFlow.create({ ownerId: "owner-1", instanceName: "inst-1", name: "Test", triggerType: "ALL" }, new UniqueEntityID(flowId));
    flow.setFlow(
      [waitNode, defaultNode, endNode],
      [
        makeEdge(flowId, waitNodeId, defaultNodeId, { type: "default" }),
        makeEdge(flowId, defaultNode.id.toString(), endNodeId),
      ],
    );
    flow.activate();
    await flowsRepo.save(flow);

    const session = BotFlowSession.create({ flowId, instanceName: "inst-1", phone: "+5511999999999", currentNodeId: waitNodeId, variables: {} });
    session.setWaiting();
    await sessionsRepo.save(session);

    await sut.execute({ instanceName: "inst-1", phone: "+5511999999999", text: "talvez", ownerId: "owner-1" });

    expect(evolutionApi.sent[0].text).toBe("Não entendi. Responda sim ou não.");
    expect(sessionsRepo.items[0].status).toBe("COMPLETED");
  });

  it("should resolve {{nome}} variable in message text", async () => {
    const flowId = "flow-4";
    const startNodeId = "start-1";
    const msgNodeId = "msg-1";
    const endNodeId = "end-1";

    const startNode = makeNode(flowId, "START", {}, startNodeId);
    const msgNode   = makeNode(flowId, "SEND_MESSAGE", { type: "text", text: "Olá {{nome}}!" }, msgNodeId);
    const endNode   = makeNode(flowId, "END", {}, endNodeId);

    const flow = BotFlow.create({ ownerId: "owner-1", instanceName: "inst-1", name: "Test", triggerType: "ALL" }, new UniqueEntityID(flowId));
    flow.setFlow(
      [startNode, msgNode, endNode],
      [makeEdge(flowId, startNodeId, msgNodeId), makeEdge(flowId, msgNodeId, endNodeId)],
    );
    flow.activate();
    await flowsRepo.save(flow);

    await sut.execute({ instanceName: "inst-1", phone: "+5511999999999", text: "start", ownerId: "owner-1", pushName: "João" });

    expect(evolutionApi.sent[0].text).toBe("Olá João!");
  });
});
