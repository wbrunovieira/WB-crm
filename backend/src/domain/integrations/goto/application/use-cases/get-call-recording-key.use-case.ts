import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { ActivitiesRepository } from "@/domain/activities/application/repositories/activities.repository";

export class RecordingNotFoundError extends Error {
  name = "RecordingNotFoundError";
}
export class RecordingForbiddenError extends Error {
  name = "RecordingForbiddenError";
}

/**
 * Resolve a chave S3 da gravação de uma ligação GoTo, aplicando not-found +
 * autorização (owner-or-admin). O download/stream do S3 fica no controller (infra).
 */
@Injectable()
export class GetCallRecordingKeyUseCase {
  constructor(private readonly activities: ActivitiesRepository) {}

  async execute(input: {
    activityId: string;
    track: string;
    requesterId: string;
    requesterRole: string;
  }): Promise<Either<Error, { s3Key: string }>> {
    const activity = await this.activities.findByIdRaw(input.activityId);
    if (!activity) return left(new RecordingNotFoundError("Recording not found"));

    if (input.requesterRole !== "admin" && activity.ownerId !== input.requesterId) {
      return left(new RecordingForbiddenError("Acesso negado"));
    }

    const s3Key = input.track === "client" ? activity.gotoRecordingUrl2 : activity.gotoRecordingUrl;
    if (!s3Key) return left(new RecordingNotFoundError("Recording not found"));

    return right({ s3Key });
  }
}
