import { Injectable } from "@nestjs/common";
import { right } from "@/core/either";
import { BotFlowsRepository } from "../repositories/bot-flows.repository";

@Injectable()
export class ListBotFlowsUseCase {
  constructor(private readonly flows: BotFlowsRepository) {}

  async execute(ownerId: string) {
    return right({ flows: await this.flows.findAllByOwner(ownerId) });
  }
}
