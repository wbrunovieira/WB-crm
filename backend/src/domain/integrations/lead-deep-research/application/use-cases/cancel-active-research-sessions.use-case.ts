import { Injectable } from "@nestjs/common";
import { BulkResearchSessionRepository } from "../repositories/bulk-research-session.repository";

@Injectable()
export class CancelActiveResearchSessionsUseCase {
  constructor(private readonly sessions: BulkResearchSessionRepository) {}

  async execute(ownerId: string): Promise<void> {
    await this.sessions.cancelAllActiveForUser(ownerId);
  }
}
