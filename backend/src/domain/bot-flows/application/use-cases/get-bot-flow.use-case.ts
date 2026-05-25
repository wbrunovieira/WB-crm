import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { BotFlowsRepository } from "../repositories/bot-flows.repository";
import { BotFlow } from "../../enterprise/entities/bot-flow.entity";

@Injectable()
export class GetBotFlowUseCase {
  constructor(private readonly flows: BotFlowsRepository) {}

  async execute({ id, ownerId }: { id: string; ownerId: string }): Promise<Either<Error, BotFlow>> {
    const flow = await this.flows.findById(id);
    if (!flow) return left(new Error("Not found"));
    if (flow.ownerId !== ownerId) return left(new Error("Unauthorized"));
    return right(flow);
  }
}
