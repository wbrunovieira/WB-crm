import { Injectable, Inject } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { MeetingsRepository } from "../repositories/meetings.repository";
import { PresentialRecordingStoragePort } from "../ports/presential-recording-storage.port";
import { TranscriberPort } from "@/infra/shared/transcriber/transcriber.port";

export interface UploadPresentialRecordingInput {
  meetingId: string;
  buffer: Buffer;
  filename: string;
  contentType: string;
  requesterId: string;
}

export interface UploadPresentialRecordingOutput {
  playbackUrl: string;
  transcriptionJobId: string;
}

@Injectable()
export class UploadPresentialRecordingUseCase {
  constructor(
    private readonly repo: MeetingsRepository,
    @Inject(PresentialRecordingStoragePort)
    private readonly storage: PresentialRecordingStoragePort,
    private readonly transcriber: TranscriberPort,
  ) {}

  async execute(
    input: UploadPresentialRecordingInput,
  ): Promise<Either<Error, UploadPresentialRecordingOutput>> {
    const meeting = await this.repo.findById(input.meetingId);
    if (!meeting) return left(new Error("Meeting não encontrada"));
    if (!meeting.isPresential) return left(new Error("Meeting não é presencial"));
    if (meeting.status !== "ended") return left(new Error("Meeting ainda não foi concluída"));
    if (meeting.ownerId !== input.requesterId) return left(new Error("Sem permissão"));

    const key = this.storage.buildKey(input.meetingId, input.filename);

    try {
      await this.storage.upload(key, input.buffer, input.contentType);
    } catch (err) {
      return left(err instanceof Error ? err : new Error(String(err)));
    }

    const isVideo = input.contentType.startsWith("video/");
    const job = isVideo
      ? await this.transcriber.submitVideo(input.buffer, input.filename)
      : await this.transcriber.submitAudio(input.buffer, input.filename);

    await this.repo.saveUploadedRecording(input.meetingId, {
      uploadedAudioKey: key,
      transcriptionJobId: job.jobId,
    });

    const playbackUrl = await this.storage.getSignedUrl(key);

    return right({ playbackUrl, transcriptionJobId: job.jobId });
  }
}
