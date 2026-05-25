import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { BotFlowSessionsRepository } from "@/domain/bot-flows/application/repositories/bot-flow-sessions.repository";
import { BotFlowSession } from "@/domain/bot-flows/enterprise/entities/bot-flow-session.entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

function toDomain(raw: any): BotFlowSession {
  return BotFlowSession.create(
    {
      flowId: raw.flowId,
      instanceName: raw.instanceName,
      phone: raw.phone,
      leadId: raw.leadId ?? undefined,
      currentNodeId: raw.currentNodeId ?? undefined,
      status: raw.status,
      variables: (raw.variables ?? {}) as Record<string, string>,
      waitingSince: raw.waitingSince ?? undefined,
    },
    new UniqueEntityID(raw.id),
  );
}

@Injectable()
export class PrismaBotFlowSessionsRepository implements BotFlowSessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByPhone(phone: string, instanceName: string): Promise<BotFlowSession | null> {
    const raw = await this.prisma.botFlowSession.findFirst({
      where: { phone, instanceName, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
    return raw ? toDomain(raw) : null;
  }

  async save(session: BotFlowSession): Promise<void> {
    const id = session.id.toString();
    await this.prisma.botFlowSession.upsert({
      where: { id },
      create: {
        id,
        flowId: session.flowId,
        instanceName: session.instanceName,
        phone: session.phone,
        leadId: session.leadId,
        currentNodeId: session.currentNodeId,
        status: session.status,
        variables: session.variables as any,
        waitingSince: session.waitingSince,
      },
      update: {
        currentNodeId: session.currentNodeId,
        status: session.status,
        variables: session.variables as any,
        waitingSince: session.waitingSince ?? null,
        updatedAt: new Date(),
      },
    });
  }

  async findById(id: string): Promise<BotFlowSession | null> {
    const raw = await this.prisma.botFlowSession.findUnique({ where: { id } });
    return raw ? toDomain(raw) : null;
  }
}
