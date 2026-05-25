import { BotFlowSession } from "../../enterprise/entities/bot-flow-session.entity";

export abstract class BotFlowSessionsRepository {
  abstract findActiveByPhone(phone: string, instanceName: string): Promise<BotFlowSession | null>;
  abstract save(session: BotFlowSession): Promise<void>;
  abstract findById(id: string): Promise<BotFlowSession | null>;
}
