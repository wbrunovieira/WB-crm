import { Injectable } from "@nestjs/common";
import { WarmingPoolEmailsRepository } from "../repositories/warming-pool-emails.repository";
import type { WarmingPoolEmail } from "../../enterprise/entities/warming-pool-email.entity";

@Injectable()
export class GetWarmingPoolEmailsUseCase {
  constructor(private readonly repo: WarmingPoolEmailsRepository) {}

  async execute(ownerId: string): Promise<WarmingPoolEmail[]> {
    return this.repo.findAll(ownerId);
  }
}
