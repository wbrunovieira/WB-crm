import { Injectable, Inject } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { ActivitiesRepository } from "../repositories/activities.repository";
import { ActivityPhotoStoragePort } from "../ports/activity-photo-storage.port";

export interface UploadActivityPhotoInput {
  activityId: string;
  buffer: Buffer;
  filename: string;
  contentType: string;
  requesterId: string;
  requesterRole: string;
}

export interface UploadActivityPhotoOutput {
  photoUrl: string;
}

@Injectable()
export class UploadActivityPhotoUseCase {
  constructor(
    private readonly activities: ActivitiesRepository,
    @Inject(ActivityPhotoStoragePort)
    private readonly storage: ActivityPhotoStoragePort,
  ) {}

  async execute(
    input: UploadActivityPhotoInput,
  ): Promise<Either<Error, UploadActivityPhotoOutput>> {
    const activity = await this.activities.findByIdRaw(input.activityId);
    if (!activity) return left(new Error("Atividade não encontrada"));

    const isOwner = activity.ownerId === input.requesterId;
    const isAdmin = input.requesterRole === "admin";
    if (!isOwner && !isAdmin) return left(new Error("Não autorizado"));

    const key = this.storage.buildKey(input.activityId, input.filename);

    try {
      await this.storage.upload(key, input.buffer, input.contentType);
    } catch (err) {
      return left(err instanceof Error ? err : new Error(String(err)));
    }

    activity.update({ photoKey: key });
    await this.activities.save(activity);

    const photoUrl = await this.storage.getSignedUrl(key);

    return right({ photoUrl });
  }
}
