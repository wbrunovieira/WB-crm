import { Injectable } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { BotFlow, TriggerType } from "../../enterprise/entities/bot-flow.entity";
import { BotFlowsRepository } from "../repositories/bot-flows.repository";

interface Input {
  ownerId: string;
  instanceName: string;
  name: string;
  description?: string;
  triggerType?: TriggerType;
  triggerValue?: string;
}

type Output = Either<never, { flow: BotFlow }>;

@Injectable()
export class CreateBotFlowUseCase {
  constructor(private readonly flows: BotFlowsRepository) {}

  async execute(input: Input): Promise<Output> {
    const flow = BotFlow.create({ ...input, triggerType: input.triggerType ?? "KEYWORD" });
    await this.flows.save(flow);
    return right({ flow });
  }
}
