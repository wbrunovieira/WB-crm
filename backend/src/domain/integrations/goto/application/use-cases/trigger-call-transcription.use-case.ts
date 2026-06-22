import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { ActivitiesRepository } from "@/domain/activities/application/repositories/activities.repository";
import { ProcessCallRecordingUseCase } from "./process-call-recording.use-case";
import { PollCallTranscriptionsUseCase } from "./poll-call-transcriptions.use-case";
import {
  RecordingNotFoundError,
  RecordingForbiddenError,
} from "./get-call-recording-key.use-case";

export interface TriggerCallTranscriptionInput {
  activityId: string;
  requesterId: string;
  requesterRole: string;
}

export interface TriggerCallTranscriptionOutput {
  /** Transcript already existed — nothing to do. */
  alreadyDone: boolean;
  /** Pass 1 downloaded the recording and submitted new transcription jobs. */
  submitted: boolean;
  /** Pass 2 found completed jobs and saved the transcript right away. */
  saved: boolean;
  /** Jobs are in flight — the caller should kick the background poller. */
  pending: boolean;
}

/**
 * Manually force the transcription of a single GoTo call now, instead of
 * waiting for the 15-min cron. Applies owner-or-admin authorization, then runs
 * Pass 1 (download + submit) and an immediate Pass 2 (poll). When jobs are
 * still running it returns `pending: true` so the controller can emit the
 * `goto.transcription.submitted` event that drives the background poller.
 */
@Injectable()
export class TriggerCallTranscriptionUseCase {
  constructor(
    private readonly activities: ActivitiesRepository,
    private readonly processRecording: ProcessCallRecordingUseCase,
    private readonly pollTranscriptions: PollCallTranscriptionsUseCase,
  ) {}

  async execute(
    input: TriggerCallTranscriptionInput,
  ): Promise<Either<Error, TriggerCallTranscriptionOutput>> {
    const activity = await this.activities.findByIdRaw(input.activityId);
    if (!activity) return left(new RecordingNotFoundError("Atividade não encontrada"));

    if (input.requesterRole !== "admin" && activity.ownerId !== input.requesterId) {
      return left(new RecordingForbiddenError("Acesso negado"));
    }

    if (activity.gotoTranscriptText) {
      return right({ alreadyDone: true, submitted: false, saved: false, pending: false });
    }

    if (!activity.gotoRecordingId && !activity.gotoCallId) {
      return left(new RecordingNotFoundError("Esta atividade não possui gravação para transcrever"));
    }

    // Pass 1 — download + submit (no-op if already submitted; it skips when the
    // recording URL is already set).
    const processResult = await this.processRecording.execute({ activityId: input.activityId });
    const submitted = processResult.isRight() && processResult.value.submitted === true;

    // Pass 2 — poll immediately in case the jobs already finished.
    const pollResult = await this.pollTranscriptions.execute({ activityId: input.activityId });
    const saved = pollResult.isRight() && pollResult.value.saved === true;

    return right({
      alreadyDone: false,
      submitted,
      saved,
      pending: !saved,
    });
  }
}
