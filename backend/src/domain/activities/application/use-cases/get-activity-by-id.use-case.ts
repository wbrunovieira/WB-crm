import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { ActivitiesRepository } from "../repositories/activities.repository";
import type { ActivityDetail } from "../../enterprise/read-models/activity-read-models";

type Output = Either<Error, { activity: ActivityDetail }>;

@Injectable()
export class GetActivityByIdUseCase {
  constructor(private readonly activities: ActivitiesRepository) {}

  async execute(input: {
    id: string;
    requesterId: string;
    requesterRole: string;
  }): Promise<Output> {
    const activity = await this.activities.findById(input.id, input.requesterId, input.requesterRole);
    if (!activity) return left(new Error("Atividade não encontrada"));
    return right({ activity });
  }
}
