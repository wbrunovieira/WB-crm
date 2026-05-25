import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { BotFlowsRepository } from "@/domain/bot-flows/application/repositories/bot-flows.repository";
import { BotFlow } from "@/domain/bot-flows/enterprise/entities/bot-flow.entity";
import { BotFlowNode } from "@/domain/bot-flows/enterprise/entities/bot-flow-node.entity";
import { BotFlowEdge } from "@/domain/bot-flows/enterprise/entities/bot-flow-edge.entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

function toDomain(raw: any): BotFlow {
  const nodes = (raw.nodes ?? []).map((n: any) =>
    BotFlowNode.create(
      { flowId: n.flowId, nodeType: n.nodeType, posX: n.posX, posY: n.posY, config: (n.config ?? {}) as any },
      new UniqueEntityID(n.id),
    ),
  );
  const edges = (raw.edges ?? []).map((e: any) =>
    BotFlowEdge.create(
      {
        flowId: e.flowId,
        sourceNodeId: e.sourceNodeId,
        targetNodeId: e.targetNodeId,
        conditionType: e.conditionType ?? undefined,
        conditionValue: e.conditionValue ?? undefined,
        label: e.label ?? undefined,
      },
      new UniqueEntityID(e.id),
    ),
  );
  return BotFlow.create(
    {
      ownerId: raw.ownerId,
      instanceName: raw.instanceName,
      name: raw.name,
      description: raw.description ?? undefined,
      isActive: raw.isActive,
      triggerType: raw.triggerType,
      triggerValue: raw.triggerValue ?? undefined,
      nodes,
      edges,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    },
    new UniqueEntityID(raw.id),
  );
}

@Injectable()
export class PrismaBotFlowsRepository implements BotFlowsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = { nodes: true, edges: true } as const;

  async findById(id: string): Promise<BotFlow | null> {
    const raw = await this.prisma.botFlow.findUnique({ where: { id }, include: this.include });
    return raw ? toDomain(raw) : null;
  }

  async findAllByOwner(ownerId: string): Promise<BotFlow[]> {
    const raws = await this.prisma.botFlow.findMany({
      where: { ownerId },
      include: this.include,
      orderBy: { createdAt: "desc" },
    });
    return raws.map(toDomain);
  }

  async findActiveByInstance(instanceName: string): Promise<BotFlow[]> {
    const raws = await this.prisma.botFlow.findMany({
      where: { instanceName, isActive: true },
      include: this.include,
    });
    return raws.map(toDomain);
  }

  async save(flow: BotFlow): Promise<void> {
    const id = flow.id.toString();

    await this.prisma.botFlow.upsert({
      where: { id },
      create: {
        id,
        ownerId: flow.ownerId,
        instanceName: flow.instanceName,
        name: flow.name,
        description: flow.description,
        isActive: flow.isActive,
        triggerType: flow.triggerType,
        triggerValue: flow.triggerValue,
      },
      update: {
        name: flow.name,
        description: flow.description,
        isActive: flow.isActive,
        triggerType: flow.triggerType,
        triggerValue: flow.triggerValue,
        instanceName: flow.instanceName,
      },
    });

    // Replace nodes
    await this.prisma.botFlowNode.deleteMany({ where: { flowId: id } });
    for (const n of flow.nodes) {
      await this.prisma.botFlowNode.create({
        data: {
          id: n.id.toString(),
          flowId: id,
          nodeType: n.nodeType,
          posX: n.posX,
          posY: n.posY,
          config: n.config as any,
        },
      });
    }

    // Replace edges
    await this.prisma.botFlowEdge.deleteMany({ where: { flowId: id } });
    for (const e of flow.edges) {
      await this.prisma.botFlowEdge.create({
        data: {
          id: e.id.toString(),
          flowId: id,
          sourceNodeId: e.sourceNodeId,
          targetNodeId: e.targetNodeId,
          conditionType: e.conditionType,
          conditionValue: e.conditionValue,
          label: e.label,
        },
      });
    }
  }

  async delete(id: string): Promise<void> {
    await this.prisma.botFlow.delete({ where: { id } });
  }
}
