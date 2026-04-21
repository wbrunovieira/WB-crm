import { Injectable } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { ActivitiesRepository } from "../repositories/activities.repository";

@Injectable()
export class MarkThreadRepliedUseCase {
  constructor(private readonly activities: ActivitiesRepository) {}

  async execute(threadId: string): Promise<Either<never, void>> {
    await this.activities.markThreadReplied(threadId);
    return right(undefined);
  }
}
