import { Injectable } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { CallAnalysis } from "../../enterprise/entities/call-analysis.entity";
import { CallAnalysisRepository } from "../repositories/call-analysis.repository";

type Input = { ownerId: string; ownerRole: string };
type Output = Either<never, { analyses: CallAnalysis[] }>;

@Injectable()
export class ListCallAnalysesUseCase {
  constructor(private readonly repo: CallAnalysisRepository) {}

  async execute({ ownerId, ownerRole }: Input): Promise<Output> {
    if (ownerRole === "admin") {
      const all = await this.repo.findAll();
      return right({ analyses: all });
    }
    const analyses = await this.repo.findByOwner(ownerId);
    return right({ analyses });
  }
}
