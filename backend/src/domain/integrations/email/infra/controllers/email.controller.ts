import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Logger,
  HttpCode,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { SendEmailUseCase } from "../../application/use-cases/send-email.use-case";
import { EmailMessagesRepository } from "../../application/repositories/email-messages.repository";

interface SendEmailBody {
  to: string;
  subject: string;
  bodyHtml: string;
  threadId?: string;
}

@ApiTags("Email")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("email")
export class EmailController {
  private readonly logger = new Logger(EmailController.name);

  constructor(
    private readonly sendEmail: SendEmailUseCase,
    private readonly emailMessagesRepo: EmailMessagesRepository,
  ) {}

  @Post("send")
  @HttpCode(201)
  @ApiOperation({ summary: "Send an email via Gmail" })
  async send(
    @Body() body: SendEmailBody,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ ok: boolean; messageId?: string; threadId?: string; error?: string }> {
    if (!body.to || !body.subject || !body.bodyHtml) {
      throw new BadRequestException("Missing required fields: to, subject, bodyHtml");
    }

    const result = await this.sendEmail.execute({
      userId: user.id,
      to: body.to,
      subject: body.subject,
      bodyHtml: body.bodyHtml,
      threadId: body.threadId,
      ownerId: user.id,
    });

    if (result.isLeft()) {
      this.logger.error("Failed to send email", { error: result.value.message });
      return { ok: false, error: result.value.message };
    }

    return { ok: true, ...result.value };
  }

  @Get("messages")
  @ApiOperation({ summary: "List email messages for current user" })
  async listMessages(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<unknown[]> {
    return this.emailMessagesRepo.findByOwnerId(user.id);
  }
}
