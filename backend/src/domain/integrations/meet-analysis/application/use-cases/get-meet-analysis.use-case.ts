import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { MeetAnalysis } from "../../enterprise/entities/meet-analysis.entity";
import { MeetAnalysisRepository } from "../repositories/meet-analysis.repository";

type Input = {
  id?: string;
  activityId?: string;
  ownerId: string;
  ownerRole: string;
};

type Output = Either<Error, { analysis: MeetAnalysis }>;

@Injectable()
export class GetMeetAnalysisUseCase {
  constructor(private readonly repo: MeetAnalysisRepository) {}

  async execute({ id, activityId, ownerId, ownerRole }: Input): Promise<Output> {
    let analysis: MeetAnalysis | null = null;

    if (id) {
      analysis = await this.repo.findById(id);
    } else if (activityId) {
      analysis = await this.repo.findByActivityId(activityId);
    }

    if (!analysis) {
      return left(new Error("MeetAnalysis não encontrada"));
    }

    if (ownerRole !== "admin" && analysis.ownerId !== ownerId) {
      return left(new Error("Acesso não autorizado"));
    }

    return right({ analysis });
  }
}
