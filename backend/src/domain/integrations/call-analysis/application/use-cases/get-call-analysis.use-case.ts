import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { CallAnalysis } from "../../enterprise/entities/call-analysis.entity";
import { CallAnalysisRepository } from "../repositories/call-analysis.repository";

type Input = {
  id?: string;
  activityId?: string;
  ownerId: string;
  ownerRole: string;
};

type Output = Either<Error, { analysis: CallAnalysis }>;

@Injectable()
export class GetCallAnalysisUseCase {
  constructor(private readonly repo: CallAnalysisRepository) {}

  async execute({ id, activityId, ownerId, ownerRole }: Input): Promise<Output> {
    let analysis: CallAnalysis | null = null;

    if (id) {
      analysis = await this.repo.findById(id);
    } else if (activityId) {
      analysis = await this.repo.findByActivityId(activityId);
    }

    if (!analysis) {
      return left(new Error("CallAnalysis não encontrada"));
    }

    // Admins can access any record; other roles are restricted to their own
    if (ownerRole !== "admin" && analysis.ownerId !== ownerId) {
      return left(new Error("Acesso não autorizado"));
    }

    return right({ analysis });
  }
}
