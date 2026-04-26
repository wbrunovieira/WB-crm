import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  Logger,
  UnauthorizedException,
  NotFoundException,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { HandleWhatsAppTranscriptionCallbackUseCase } from "@/domain/integrations/whatsapp/application/use-cases/handle-whatsapp-transcription-callback.use-case";
import { TranscriptionResult } from "@/infra/shared/transcriber/transcriber.port";

/** Flat payload sent by the transcription service (snake_case, no nested result) */
interface TranscriptionCallbackPayload {
  job_id: string;
  status: "done" | "failed";
  text?: string;
  language?: string;
  duration_seconds?: number;
  segments?: { start: number; end: number; text: string }[];
  error?: string;
  secret?: string;
}

@ApiTags("Webhooks")
@Controller("webhooks/transcription")
export class WhatsAppTranscriptionCallbackController {
  private readonly logger = new Logger(WhatsAppTranscriptionCallbackController.name);

  constructor(
    private readonly handleCallback: HandleWhatsAppTranscriptionCallbackUseCase,
  ) {}

  @Post("complete")
  @HttpCode(200)
  @ApiOperation({ summary: "Transcription service callback when a job finishes" })
  async complete(
    @Body() body: TranscriptionCallbackPayload,
    @Headers("x-callback-secret") headerSecret?: string,
  ) {
    const expectedSecret = process.env.TRANSCRIBER_CALLBACK_SECRET;
    const receivedSecret = body.secret ?? headerSecret;

    if (expectedSecret && receivedSecret !== expectedSecret) {
      this.logger.warn("Transcription callback: invalid secret", { jobId: body.job_id });
      throw new UnauthorizedException("Invalid callback secret");
    }

    const jobId = body.job_id;

    if (body.status === "failed" || !body.text) {
      this.logger.warn("Transcription callback: job failed", { jobId, error: body.error });
      return { ok: true, status: "failed" };
    }

    const transcriptionResult: TranscriptionResult = {
      jobId,
      text: body.text,
      language: body.language ?? "pt",
      durationSeconds: body.duration_seconds ?? 0,
      segments: body.segments ?? [],
    };

    const result = await this.handleCallback.execute({
      jobId,
      result: transcriptionResult,
    });

    if (result.isLeft()) {
      this.logger.warn("Transcription callback: message not found", {
        jobId,
        error: result.value.message,
      });
      throw new NotFoundException(result.value.message);
    }

    this.logger.log("Transcription callback processed", {
      jobId,
      messageId: result.value.messageId,
    });

    return { ok: true, messageId: result.value.messageId };
  }
}
