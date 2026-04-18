import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { ActivitiesRepository } from "../repositories/activities.repository";
import type { Activity } from "../../enterprise/entities/activity";

type Output = Either<Error, { activity: Activity }>;

@Injectable()
export class LinkActivityToDealUseCase {
  constructor(private readonly activities: ActivitiesRepository) {}

  async execute(input: { id: string; dealId: string; requesterId: string; requesterRole: string }): Promise<Output> {
    const activity = await this.activities.findByIdRaw(input.id);
    if (!activity) return left(new Error("Atividade não encontrada"));

    const isOwner = activity.ownerId === input.requesterId;
    const isAdmin = input.requesterRole === "admin";
    if (!isOwner && !isAdmin) return left(new Error("Não autorizado"));

    activity.linkDeal(input.dealId);
    await this.activities.save(activity);
    return right({ activity });
  }
}
