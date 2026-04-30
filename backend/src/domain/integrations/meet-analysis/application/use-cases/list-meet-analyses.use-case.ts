import { Injectable } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { MeetAnalysis } from "../../enterprise/entities/meet-analysis.entity";
import { MeetAnalysisRepository } from "../repositories/meet-analysis.repository";

type Input = {
  ownerId: string;
  ownerRole: string;
};

type Output = Either<Error, { analyses: MeetAnalysis[] }>;

@Injectable()
export class ListMeetAnalysesUseCase {
  constructor(private readonly repo: MeetAnalysisRepository) {}

  async execute({ ownerId, ownerRole }: Input): Promise<Output> {
    const analyses =
      ownerRole === "admin"
        ? await this.repo.findAll()
        : await this.repo.findByOwner(ownerId);

    return right({ analyses });
  }
}
