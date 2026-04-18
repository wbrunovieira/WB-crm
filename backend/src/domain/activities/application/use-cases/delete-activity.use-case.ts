import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { ActivitiesRepository } from "../repositories/activities.repository";

type Output = Either<Error, void>;

@Injectable()
export class DeleteActivityUseCase {
  constructor(private readonly activities: ActivitiesRepository) {}

  async execute(input: { id: string; requesterId: string; requesterRole: string }): Promise<Output> {
    const activity = await this.activities.findByIdRaw(input.id);
    if (!activity) return left(new Error("Atividade não encontrada"));

    const isOwner = activity.ownerId === input.requesterId;
    const isAdmin = input.requesterRole === "admin";
    if (!isOwner && !isAdmin) return left(new Error("Não autorizado"));

    await this.activities.delete(input.id);
    return right(undefined);
  }
}
