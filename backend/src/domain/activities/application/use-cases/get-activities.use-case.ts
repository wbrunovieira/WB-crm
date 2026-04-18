import { Injectable } from "@nestjs/common";
import { right, type Either } from "@/core/either";
import { ActivitiesRepository, type ActivityFilters } from "../repositories/activities.repository";
import type { ActivitySummary } from "../../enterprise/read-models/activity-read-models";

type Output = Either<Error, { activities: ActivitySummary[] }>;

@Injectable()
export class GetActivitiesUseCase {
  constructor(private readonly activities: ActivitiesRepository) {}

  async execute(input: {
    requesterId: string;
    requesterRole: string;
    filters?: ActivityFilters;
  }): Promise<Output> {
    const activities = await this.activities.findMany(
      input.requesterId,
      input.requesterRole,
      input.filters,
    );
    return right({ activities });
  }
}
