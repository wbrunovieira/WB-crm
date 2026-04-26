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

interface TranscriptionCallbackPayload {
  jobId: string;
  status: "done" | "failed";
  result?: TranscriptionResult;
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
      this.logger.warn("Transcription callback: invalid secret", { jobId: body.jobId });
      throw new UnauthorizedException("Invalid callback secret");
    }

    if (body.status === "failed" || !body.result) {
      this.logger.warn("Transcription callback: job failed", { jobId: body.jobId });
      // Let the fallback cron handle or just log — no action needed for now
      return { ok: true, status: "failed" };
    }

    const result = await this.handleCallback.execute({
      jobId: body.jobId,
      result: body.result,
    });

    if (result.isLeft()) {
      this.logger.warn("Transcription callback: message not found", {
        jobId: body.jobId,
        error: result.value.message,
      });
      throw new NotFoundException(result.value.message);
    }

    this.logger.log("Transcription callback processed", {
      jobId: body.jobId,
      messageId: result.value.messageId,
    });

    return { ok: true, messageId: result.value.messageId };
  }
}
