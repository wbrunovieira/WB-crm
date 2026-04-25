import { Injectable, Logger, Optional } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { ActivitiesRepository } from "../repositories/activities.repository";
import { S3StoragePort } from "@/domain/integrations/goto/application/ports/s3-storage.port";
import { GoogleDrivePort } from "@/domain/integrations/whatsapp/application/ports/google-drive.port";
import { GmailPort } from "@/domain/integrations/email/application/ports/gmail.port";

export class ActivityNotFoundError extends Error {
  name = "ActivityNotFoundError";
  constructor() { super("Atividade não encontrada"); }
}

export class ActivityForbiddenError extends Error {
  name = "ActivityForbiddenError";
  constructor() { super("Apenas administradores podem excluir atividades permanentemente"); }
}

@Injectable()
export class PurgeActivityUseCase {
  private readonly logger = new Logger(PurgeActivityUseCase.name);

  constructor(
    private readonly repo: ActivitiesRepository,
    @Optional() private readonly s3?: S3StoragePort,
    @Optional() private readonly drive?: GoogleDrivePort,
    @Optional() private readonly gmail?: GmailPort,
  ) {}

  async execute(input: {
    id: string;
    requesterId: string;
    isAdmin: boolean;
  }): Promise<Either<ActivityNotFoundError | ActivityForbiddenError, void>> {
    if (!input.isAdmin) return left(new ActivityForbiddenError());

    const activity = await this.repo.findByIdRaw(input.id);
    if (!activity) return left(new ActivityNotFoundError());

    if (activity.type === "call") {
      await this.deleteS3Recordings(activity.gotoRecordingUrl, activity.gotoRecordingUrl2);
    }

    if (activity.type === "whatsapp") {
      await this.deleteDriveMedia(input.id);
    }

    if (activity.type === "email") {
      await this.trashEmail(activity.emailMessageId);
    }

    await this.repo.delete(input.id);
    return right(undefined);
  }

  private async deleteS3Recordings(agentKey?: string, clientKey?: string): Promise<void> {
    if (!this.s3) return;
    for (const key of [agentKey, clientKey]) {
      if (!key) continue;
      try {
        await this.s3.deleteObject(key);
      } catch (err) {
        this.logger.warn(`Failed to delete S3 object ${key}: ${(err as Error).message}`);
      }
    }
  }

  private async deleteDriveMedia(activityId: string): Promise<void> {
    if (!this.drive) return;
    const fileIds = await this.repo.findWhatsAppDriveIds(activityId);
    for (const fileId of fileIds) {
      try {
        await this.drive.deleteFile(fileId);
      } catch (err) {
        this.logger.warn(`Failed to delete Drive file ${fileId}: ${(err as Error).message}`);
      }
    }
  }

  private async trashEmail(messageId?: string): Promise<void> {
    if (!this.gmail || !messageId) return;
    try {
      await this.gmail.trashMessage("me", messageId);
    } catch (err) {
      this.logger.warn(`Failed to trash Gmail message ${messageId}: ${(err as Error).message}`);
    }
  }
}
