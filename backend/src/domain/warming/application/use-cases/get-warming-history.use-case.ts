import { Injectable } from "@nestjs/common";
import { WarmingSendsRepository } from "../repositories/warming-sends.repository";
import type { WarmingSend } from "../../enterprise/entities/warming-send.entity";

@Injectable()
export class GetWarmingHistoryUseCase {
  constructor(private readonly repo: WarmingSendsRepository) {}

  async execute(ownerId: string, page: number, pageSize: number): Promise<{ sends: WarmingSend[]; total: number }> {
    return this.repo.findAll(ownerId, page, pageSize);
  }
}
