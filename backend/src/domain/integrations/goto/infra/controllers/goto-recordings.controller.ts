import {
  Controller, Get, Param, Query, UseGuards,
  NotFoundException, ForbiddenException, StreamableFile, Logger,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { SseJwtAuthGuard } from "@/infra/auth/guards/sse-jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { GetCallRecordingKeyUseCase, RecordingNotFoundError } from "../../application/use-cases/get-call-recording-key.use-case";
import { S3StoragePort } from "../../application/ports/s3-storage.port";

@ApiTags("GoTo")
@ApiBearerAuth()
@UseGuards(SseJwtAuthGuard)
@Controller("goto")
export class GoToRecordingsController {
  private readonly logger = new Logger(GoToRecordingsController.name);

  constructor(
    private readonly getRecordingKey: GetCallRecordingKeyUseCase,
    private readonly s3: S3StoragePort,
  ) {}

  @Get("recordings/:activityId")
  async streamRecording(
    @Param("activityId") activityId: string,
    @Query("track") track: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StreamableFile> {
    const result = await this.getRecordingKey.execute({
      activityId,
      track,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });
    if (result.isLeft()) {
      if (result.value instanceof RecordingNotFoundError) throw new NotFoundException(result.value.message);
      throw new ForbiddenException(result.value.message);
    }

    const buffer = await this.s3.download(result.value.s3Key);

    return new StreamableFile(buffer, {
      type: "audio/mpeg",
      disposition: "inline",
      length: buffer.length,
    });
  }
}
