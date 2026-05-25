import { BotFlow } from "../../enterprise/entities/bot-flow.entity";

export abstract class BotFlowsRepository {
  abstract findById(id: string): Promise<BotFlow | null>;
  abstract findAllByOwner(ownerId: string): Promise<BotFlow[]>;
  abstract findActiveByInstance(instanceName: string): Promise<BotFlow[]>;
  abstract save(flow: BotFlow): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
