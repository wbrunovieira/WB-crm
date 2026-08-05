import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { ActivitiesRepository } from "../repositories/activities.repository";

export interface GetActivityPhotoKeyInput {
  activityId: string;
  requesterId: string;
  requesterRole: string;
}

export interface GetActivityPhotoKeyOutput {
  photoKey: string;
}

@Injectable()
export class GetActivityPhotoKeyUseCase {
  constructor(private readonly activities: ActivitiesRepository) {}

  async execute(input: GetActivityPhotoKeyInput): Promise<Either<Error, GetActivityPhotoKeyOutput>> {
    const activity = await this.activities.findByIdRaw(input.activityId);
    // Same "not found" message whether the activity doesn't exist, isn't the
    // requester's, or has no photo — don't leak which case it is.
    if (!activity) return left(new Error("Foto não encontrada"));

    const isOwner = activity.ownerId === input.requesterId;
    const isAdmin = input.requesterRole === "admin";
    if (!isOwner && !isAdmin) return left(new Error("Foto não encontrada"));

    if (!activity.photoKey) return left(new Error("Foto não encontrada"));
    return right({ photoKey: activity.photoKey });
  }
}
