import { Injectable, Logger } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { MeetingsRepository } from "../repositories/meetings.repository";
import { TranscriberPort } from "@/infra/shared/transcriber/transcriber.port";

export interface PollMeetTranscriptionsOutput {
  polled: number;
  results: Array<{ meetingId: string; action: string; error?: string }>;
}

@Injectable()
export class PollMeetTranscriptionsUseCase {
  private readonly logger = new Logger(PollMeetTranscriptionsUseCase.name);

  constructor(
    private readonly meetings: MeetingsRepository,
    private readonly transcriber: TranscriberPort,
  ) {}

  async execute(): Promise<Either<never, PollMeetTranscriptionsOutput>> {
    const pending = await this.meetings.findPendingTranscriptions();
    const results: Array<{ meetingId: string; action: string; error?: string }> = [];

    for (const { id, transcriptionJobId } of pending) {
      try {
        const { status, error } = await this.transcriber.getStatus(transcriptionJobId);

        if (status === "done") {
          const { text } = await this.transcriber.getResult(transcriptionJobId);
          await this.meetings.saveTranscription(id, text);
          results.push({ meetingId: id, action: "transcription_saved" });
        } else if (status === "failed") {
          this.logger.error(`Transcription job ${transcriptionJobId} failed: ${error}`);
          await this.meetings.clearTranscriptionJob(id);
          results.push({ meetingId: id, action: "transcription_failed", error: error ?? "unknown" });
        } else {
          results.push({ meetingId: id, action: `transcription_${status}` });
        }
      } catch (err) {
        this.logger.error(`Error checking transcription for meeting ${id}`, err);
        results.push({ meetingId: id, action: "error", error: String(err) });
      }
    }

    return right({ polled: pending.length, results });
  }
}
