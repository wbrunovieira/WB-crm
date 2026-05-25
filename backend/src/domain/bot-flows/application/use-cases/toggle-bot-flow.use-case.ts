import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { BotFlowsRepository } from "../repositories/bot-flows.repository";

@Injectable()
export class ToggleBotFlowUseCase {
  constructor(private readonly flows: BotFlowsRepository) {}

  async execute({ id, ownerId }: { id: string; ownerId: string }): Promise<Either<Error, { isActive: boolean }>> {
    const flow = await this.flows.findById(id);
    if (!flow) return left(new Error("Not found"));
    if (flow.ownerId !== ownerId) return left(new Error("Unauthorized"));
    flow.isActive ? flow.deactivate() : flow.activate();
    await this.flows.save(flow);
    return right({ isActive: flow.isActive });
  }
}
