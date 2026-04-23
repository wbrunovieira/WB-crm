import { Controller, Post, Headers, Body, UnauthorizedException, Logger } from "@nestjs/common";
import { HandleTranscriptionCallbackUseCase } from "../../application/use-cases/handle-transcription-callback.use-case";

interface TranscriptionCallbackBody {
  job_id: string;
  status: "done" | "failed";
  text?: string;
  language?: string;
  duration_seconds?: number;
  segments?: Array<{ start: number; end: number; text: string }>;
  error?: string;
}

@Controller("webhooks")
export class TranscriptionWebhookController {
  private readonly logger = new Logger(TranscriptionWebhookController.name);

  constructor(private readonly useCase: HandleTranscriptionCallbackUseCase) {}

  @Post("transcription")
  async handleCallback(
    @Headers("x-callback-secret") secret: string,
    @Body() body: TranscriptionCallbackBody,
  ): Promise<{ ok: boolean }> {
    const expected = process.env.TRANSCRIPTION_CALLBACK_SECRET ?? "";
    if (!expected || secret !== expected) {
      throw new UnauthorizedException("Invalid callback secret");
    }

    // Fire-and-forget — respond 2xx immediately as required by the transcriber
    this.useCase
      .execute({ jobId: body.job_id, status: body.status, segments: body.segments })
      .catch((err: unknown) =>
        this.logger.error("Error handling transcription callback", {
          jobId: body.job_id,
          error: err instanceof Error ? err.message : String(err),
        }),
      );

    return { ok: true };
  }
}
