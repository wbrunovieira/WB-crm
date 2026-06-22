import {
  Controller, Get, Post, Param, Query, UseGuards,
  NotFoundException, ForbiddenException, StreamableFile, Logger,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { SseJwtAuthGuard } from "@/infra/auth/guards/sse-jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { GetCallRecordingKeyUseCase, RecordingNotFoundError } from "../../application/use-cases/get-call-recording-key.use-case";
import { TriggerCallTranscriptionUseCase } from "../../application/use-cases/trigger-call-transcription.use-case";
import { S3StoragePort } from "../../application/ports/s3-storage.port";
import { GotoTranscriptionSubmittedEvent } from "../../enterprise/events/goto-transcription-submitted.event";

@ApiTags("GoTo")
@ApiBearerAuth()
@UseGuards(SseJwtAuthGuard)
@Controller("goto")
export class GoToRecordingsController {
  private readonly logger = new Logger(GoToRecordingsController.name);

  constructor(
    private readonly getRecordingKey: GetCallRecordingKeyUseCase,
    private readonly triggerTranscription: TriggerCallTranscriptionUseCase,
    private readonly eventEmitter: EventEmitter2,
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

  @Post("recordings/:activityId/transcribe")
  @ApiOperation({ summary: "Transcrever a ligação agora (não espera o cron)" })
  async transcribeNow(
    @Param("activityId") activityId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ ok: boolean; alreadyDone: boolean; submitted: boolean; saved: boolean; pending: boolean }> {
    const result = await this.triggerTranscription.execute({
      activityId,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });

    if (result.isLeft()) {
      if (result.value instanceof RecordingNotFoundError) throw new NotFoundException(result.value.message);
      throw new ForbiddenException(result.value.message);
    }

    const { alreadyDone, submitted, saved, pending } = result.value;

    // Jobs are running — kick the background poller so the transcript is saved
    // within ~60s instead of waiting for the 15-min cron.
    if (pending) {
      this.eventEmitter.emit(
        "goto.transcription.submitted",
        new GotoTranscriptionSubmittedEvent(activityId),
      );
    }

    return { ok: true, alreadyDone, submitted, saved, pending };
  }
}
