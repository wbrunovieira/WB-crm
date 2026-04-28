import { Injectable } from "@nestjs/common";
import { BulkResearchSessionRepository } from "../repositories/bulk-research-session.repository";

type Output = {
  sessionId: string;
  total: number;
  completed: number;
  status: string;
  leadIds: string[];
  completedIds: string[];
} | null;

@Injectable()
export class GetActiveBulkResearchUseCase {
  constructor(private readonly sessionRepo: BulkResearchSessionRepository) {}

  async execute(userId: string): Promise<Output> {
    const session = await this.sessionRepo.findActiveByUserId(userId);
    if (!session) return null;

    return {
      sessionId: session.id,
      total: session.total,
      completed: session.completedIds.length,
      status: session.status,
      leadIds: session.leadIds,
      completedIds: session.completedIds,
    };
  }
}
