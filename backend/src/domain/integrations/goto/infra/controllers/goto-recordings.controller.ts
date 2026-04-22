import {
  Controller, Get, Param, Query, UseGuards,
  NotFoundException, ForbiddenException, StreamableFile, Logger,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { SseJwtAuthGuard } from "@/infra/auth/guards/sse-jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { ActivitiesRepository } from "@/domain/activities/application/repositories/activities.repository";
import { S3StoragePort } from "../../application/ports/s3-storage.port";

@ApiTags("GoTo")
@ApiBearerAuth()
@UseGuards(SseJwtAuthGuard)
@Controller("goto")
export class GoToRecordingsController {
  private readonly logger = new Logger(GoToRecordingsController.name);

  constructor(
    private readonly activities: ActivitiesRepository,
    private readonly s3: S3StoragePort,
  ) {}

  @Get("recordings/:activityId")
  async streamRecording(
    @Param("activityId") activityId: string,
    @Query("track") track: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StreamableFile> {
    const activity = await this.activities.findByIdRaw(activityId);

    if (!activity) throw new NotFoundException("Recording not found");
    if (user.role !== "admin" && activity.ownerId !== user.id) {
      throw new ForbiddenException("Acesso negado");
    }

    const s3Key = track === "client"
      ? activity.gotoRecordingUrl2
      : activity.gotoRecordingUrl;

    if (!s3Key) throw new NotFoundException("Recording not found");

    const buffer = await this.s3.download(s3Key);

    return new StreamableFile(buffer, {
      type: "audio/mpeg",
      disposition: "inline",
      length: buffer.length,
    });
  }
}
