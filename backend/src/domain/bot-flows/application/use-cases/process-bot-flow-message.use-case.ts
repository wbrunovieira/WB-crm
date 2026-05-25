import { Injectable } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { BotFlowsRepository } from "../repositories/bot-flows.repository";
import { BotFlowSessionsRepository } from "../repositories/bot-flow-sessions.repository";
import { BotFlowSession } from "../../enterprise/entities/bot-flow-session.entity";
import { BotFlow } from "../../enterprise/entities/bot-flow.entity";
import { EvolutionApiPort } from "@/domain/campaigns/application/ports/evolution-api.port";

interface Input {
  instanceName: string;
  phone: string;
  text: string;
  ownerId: string;
  pushName?: string;
}

type Output = Either<never, { handled: boolean }>;

const MAX_STEPS = 20;

@Injectable()
export class ProcessBotFlowMessageUseCase {
  constructor(
    private readonly flows: BotFlowsRepository,
    private readonly sessions: BotFlowSessionsRepository,
    private readonly evolutionApi: EvolutionApiPort,
  ) {}

  async execute({ instanceName, phone, text, ownerId: _ownerId, pushName }: Input): Promise<Output> {
    // 1. Check for active session
    let session = await this.sessions.findActiveByPhone(phone, instanceName);
    let flow: BotFlow | null = null;

    if (session) {
      flow = await this.flows.findById(session.flowId);
      if (!flow) { session.complete(); await this.sessions.save(session); return right({ handled: false }); }
    } else {
      // 2. Find matching active flow by trigger
      const activeFlows = await this.flows.findActiveByInstance(instanceName);
      for (const f of activeFlows) {
        if (f.matchesTrigger(text)) { flow = f; break; }
      }
      if (!flow) return right({ handled: false });

      // 3. Create session
      const startNode = flow.getStartNode();
      if (!startNode) return right({ handled: false });

      session = BotFlowSession.create({
        flowId: flow.id.toString(),
        instanceName,
        phone,
        currentNodeId: startNode.id.toString(),
        variables: { nome: pushName ?? phone, phone },
      });
      if (pushName) session.setVariable("nome", pushName);
      await this.sessions.save(session);

      // Start from start node's first out-edge
      const outEdges = flow.getOutEdges(startNode.id.toString());
      if (outEdges.length === 0) { session.complete(); await this.sessions.save(session); return right({ handled: true }); }

      const nextNodeId = outEdges[0].targetNodeId;
      session.advanceTo(nextNodeId);
      await this.sessions.save(session);
      await this.executeFromNode(flow, session, nextNodeId, text, 0);
      return right({ handled: true });
    }

    // 4. Session is waiting for response — evaluate conditions
    const currentNodeId = session.currentNodeId;
    if (!currentNodeId) return right({ handled: false });

    const currentNode = flow.getNode(currentNodeId);
    if (!currentNode || currentNode.nodeType !== "WAIT_RESPONSE") return right({ handled: false });

    const edges = flow.getOutEdges(currentNodeId);
    // Evaluate non-default first, then default
    const nonDefault = edges.filter(e => e.conditionType !== "default" && !!e.conditionType);
    const defaultEdge = edges.find(e => !e.conditionType || e.conditionType === "default");

    let nextNodeId: string | null = null;
    for (const edge of nonDefault) {
      if (edge.matches(text)) { nextNodeId = edge.targetNodeId; break; }
    }
    if (!nextNodeId && defaultEdge) nextNodeId = defaultEdge.targetNodeId;
    if (!nextNodeId) return right({ handled: false });

    session.advanceTo(nextNodeId);
    await this.sessions.save(session);
    await this.executeFromNode(flow, session, nextNodeId, text, 0);
    return right({ handled: true });
  }

  private async executeFromNode(flow: BotFlow, session: BotFlowSession, nodeId: string, lastText: string, depth: number): Promise<void> {
    if (depth > MAX_STEPS) return;

    const node = flow.getNode(nodeId);
    if (!node) { session.complete(); await this.sessions.save(session); return; }

    switch (node.nodeType) {
      case "SEND_MESSAGE": {
        const cfg = node.config as { type: string; text?: string; mediaUrl?: string; mediaType?: string; caption?: string };
        if (cfg.type === "text" && cfg.text) {
          const resolved = this.resolveVars(cfg.text, session);
          await this.evolutionApi.sendText({ instanceName: session.instanceName, phone: session.phone, text: resolved });
        } else if ((cfg.type === "media" || cfg.type === "audio") && cfg.mediaUrl) {
          await this.evolutionApi.sendMedia({
            instanceName: session.instanceName,
            phone: session.phone,
            mediaUrl: cfg.mediaUrl,
            mediaType: cfg.type === "audio" ? "audio" : (cfg.mediaType ?? "image") as any,
            caption: cfg.caption,
          });
        }
        const next = flow.getOutEdges(nodeId)[0];
        if (!next) { session.complete(); await this.sessions.save(session); return; }
        session.advanceTo(next.targetNodeId);
        await this.sessions.save(session);
        await this.executeFromNode(flow, session, next.targetNodeId, lastText, depth + 1);
        break;
      }
      case "TYPING": {
        const cfg = node.config as { seconds?: number };
        await this.evolutionApi.sendTyping({ instanceName: session.instanceName, phone: session.phone, durationSeconds: cfg.seconds ?? 2 });
        const next = flow.getOutEdges(nodeId)[0];
        if (!next) { session.complete(); await this.sessions.save(session); return; }
        session.advanceTo(next.targetNodeId);
        await this.sessions.save(session);
        await this.executeFromNode(flow, session, next.targetNodeId, lastText, depth + 1);
        break;
      }
      case "WAIT_RESPONSE": {
        session.setWaiting();
        await this.sessions.save(session);
        return; // stop, wait for next message
      }
      case "CONDITION": {
        const edges = flow.getOutEdges(nodeId);
        const nonDefault = edges.filter(e => e.conditionType !== "default" && !!e.conditionType);
        const defaultEdge = edges.find(e => !e.conditionType || e.conditionType === "default");
        let nextId: string | null = null;
        for (const edge of nonDefault) { if (edge.matches(lastText)) { nextId = edge.targetNodeId; break; } }
        if (!nextId && defaultEdge) nextId = defaultEdge.targetNodeId;
        if (!nextId) { session.complete(); await this.sessions.save(session); return; }
        session.advanceTo(nextId);
        await this.sessions.save(session);
        await this.executeFromNode(flow, session, nextId, lastText, depth + 1);
        break;
      }
      case "END":
      default: {
        session.complete();
        await this.sessions.save(session);
        return;
      }
    }
  }

  private resolveVars(text: string, session: BotFlowSession): string {
    return text.replace(/\{\{(\w[\w-]*)\}\}/g, (_, key) => session.variables[key] ?? session.variables[key.toLowerCase()] ?? `{{${key}}}`);
  }
}
