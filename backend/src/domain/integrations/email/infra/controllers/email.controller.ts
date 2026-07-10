import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
  HttpCode,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
  BadGatewayException,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { SendEmailUseCase } from "../../application/use-cases/send-email.use-case";
import { ScheduleEmailUseCase } from "../../application/use-cases/schedule-email.use-case";
import { CancelScheduledEmailUseCase } from "../../application/use-cases/cancel-scheduled-email.use-case";
import { SendScheduledEmailNowUseCase } from "../../application/use-cases/send-scheduled-email-now.use-case";
import { ListScheduledEmailsUseCase } from "../../application/use-cases/list-scheduled-emails.use-case";
import { PollGmailUseCase } from "../../application/use-cases/poll-gmail.use-case";
import { GetEmailMessagesUseCase } from "../../application/use-cases/get-email-messages.use-case";
import { GetGmailTemplatesUseCase, CreateGmailTemplateUseCase, UpdateGmailTemplateUseCase, DeleteGmailTemplateUseCase } from "../../application/use-cases/gmail-templates.use-cases";
import { GetGoogleTokenUseCase, SaveGoogleTokenUseCase, DeleteGoogleTokenUseCase, UpdateTokenHistoryIdUseCase } from "../../application/use-cases/google-token.use-cases";
import { GetSendAsAliasesUseCase } from "../../application/use-cases/get-send-as-aliases.use-case";
import { VerifyLeadEmailUseCase } from "../../application/use-cases/verify-lead-email.use-case";
import { VerifyLeadContactEmailUseCase } from "../../application/use-cases/verify-lead-contact-email.use-case";
import { BatchVerifyEmailsUseCase } from "../../application/use-cases/batch-verify-emails.use-case";
import { GetLeadSourceGroupsUseCase } from "@/domain/leads/application/use-cases/get-lead-source-groups.use-case";
import { parseInstant } from "@/core/date/parse-instant";

interface SendEmailAttachment {
  filename: string;
  mimeType: string;
  data: string;
}

interface SendEmailBody {
  to: string;
  subject: string;
  bodyHtml: string;
  fromEmail?: string;
  threadId?: string;
  attachments?: SendEmailAttachment[];
  // Entity refs for the activity logged with this send
  leadId?: string;
  contactIds?: string[];
  organizationId?: string;
  partnerId?: string;
  dealId?: string;
}

interface ScheduleEmailBody extends SendEmailBody {
  // ISO-8601 instant (the frontend converts the user's local pick to UTC)
  scheduledSendAt: string;
}

@ApiTags("Email")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("email")
export class EmailController {
  private readonly logger = new Logger(EmailController.name);

  constructor(
    private readonly sendEmail: SendEmailUseCase,
    private readonly scheduleEmail: ScheduleEmailUseCase,
    private readonly cancelScheduledEmail: CancelScheduledEmailUseCase,
    private readonly sendScheduledEmailNow: SendScheduledEmailNowUseCase,
    private readonly listScheduledEmails: ListScheduledEmailsUseCase,
    private readonly pollGmail: PollGmailUseCase,
    private readonly getEmailMessages: GetEmailMessagesUseCase,
    private readonly getTemplates: GetGmailTemplatesUseCase,
    private readonly createTemplate: CreateGmailTemplateUseCase,
    private readonly updateTemplate: UpdateGmailTemplateUseCase,
    private readonly deleteTemplate: DeleteGmailTemplateUseCase,
    private readonly getToken: GetGoogleTokenUseCase,
    private readonly saveToken: SaveGoogleTokenUseCase,
    private readonly deleteToken: DeleteGoogleTokenUseCase,
    private readonly updateHistoryId: UpdateTokenHistoryIdUseCase,
    private readonly getSendAsAliases: GetSendAsAliasesUseCase,
    private readonly verifyLeadEmail: VerifyLeadEmailUseCase,
    private readonly verifyLeadContactEmail: VerifyLeadContactEmailUseCase,
    private readonly batchVerifyEmails: BatchVerifyEmailsUseCase,
    private readonly getSourceGroups: GetLeadSourceGroupsUseCase,
  ) {}

  @Post("send")
  @HttpCode(201)
  @ApiOperation({ summary: "Send an email via Gmail" })
  async send(
    @Body() body: SendEmailBody,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ ok: boolean; messageId?: string; threadId?: string; trackingToken?: string; activityId?: string; error?: string }> {
    if (!body.to || !body.subject || !body.bodyHtml) {
      throw new BadRequestException("Missing required fields: to, subject, bodyHtml");
    }

    const result = await this.sendEmail.execute({
      userId: "google-token-singleton",
      to: body.to,
      subject: body.subject,
      bodyHtml: body.bodyHtml,
      fromEmail: body.fromEmail,
      threadId: body.threadId,
      attachments: body.attachments,
      ownerId: user.id,
      leadId: body.leadId,
      contactIds: body.contactIds,
      organizationId: body.organizationId,
      dealId: body.dealId,
      partnerId: body.partnerId,
    });

    if (result.isLeft()) {
      this.logger.error("Failed to send email", { error: result.value.message });
      return { ok: false, error: result.value.message };
    }

    return { ok: true, ...result.value };
  }

  @Post("schedule")
  @HttpCode(201)
  @ApiOperation({ summary: "Schedule an email to be sent at a future time" })
  async schedule(
    @Body() body: ScheduleEmailBody,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ ok: boolean; scheduledEmailId?: string; activityId?: string | null; scheduledSendAt?: Date; error?: string }> {
    if (!body.to || !body.subject || !body.bodyHtml || !body.scheduledSendAt) {
      throw new BadRequestException("Missing required fields: to, subject, bodyHtml, scheduledSendAt");
    }

    // Naive strings (no timezone) are interpreted as the business timezone
    // (America/Sao_Paulo); strings with Z/offset stay absolute. The server runs
    // in UTC, so a plain new Date() on a naive string would schedule ~3h early.
    const when = parseInstant(body.scheduledSendAt);
    if (!when || isNaN(when.getTime())) {
      throw new BadRequestException("Invalid scheduledSendAt (expected ISO-8601)");
    }

    const result = await this.scheduleEmail.execute({
      ownerId: user.id,
      to: body.to,
      subject: body.subject,
      bodyHtml: body.bodyHtml,
      scheduledSendAt: when,
      fromEmail: body.fromEmail,
      threadId: body.threadId,
      attachments: body.attachments,
      leadId: body.leadId,
      contactIds: body.contactIds,
      organizationId: body.organizationId,
      partnerId: body.partnerId,
      dealId: body.dealId,
    });

    if (result.isLeft()) {
      throw new BadRequestException(result.value.message);
    }

    return { ok: true, ...result.value };
  }

  @Get("scheduled")
  @ApiOperation({ summary: "List the current user's pending scheduled emails" })
  async listScheduled(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.listScheduledEmails.execute(user.id);
    return { items: result.value.items };
  }

  @Delete("scheduled/:id")
  @HttpCode(200)
  @ApiOperation({ summary: "Cancel a pending scheduled email" })
  async cancelScheduled(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ ok: boolean }> {
    const result = await this.cancelScheduledEmail.execute({
      scheduledEmailId: id,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });

    if (result.isLeft()) {
      const msg = result.value.message;
      if (msg.includes("Não autorizado")) throw new ForbiddenException(msg);
      if (msg.includes("não encontrado")) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }

    return { ok: true };
  }

  // ── Timeline actions (keyed by activityId — that's all the timeline knows) ──

  @Post("scheduled/by-activity/:activityId/send-now")
  @HttpCode(200)
  @ApiOperation({ summary: "Send a pending scheduled email immediately" })
  async sendScheduledNow(
    @Param("activityId") activityId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ ok: boolean }> {
    const result = await this.sendScheduledEmailNow.execute({
      activityId,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });
    if (result.isLeft()) {
      const msg = result.value.message;
      if (msg.includes("Não autorizado")) throw new ForbiddenException(msg);
      if (msg.includes("não encontrado")) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
    return { ok: true };
  }

  @Delete("scheduled/by-activity/:activityId")
  @HttpCode(200)
  @ApiOperation({ summary: "Cancel a pending scheduled email by its activity" })
  async cancelScheduledByActivity(
    @Param("activityId") activityId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ ok: boolean }> {
    const result = await this.cancelScheduledEmail.execute({
      activityId,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });
    if (result.isLeft()) {
      const msg = result.value.message;
      if (msg.includes("Não autorizado")) throw new ForbiddenException(msg);
      if (msg.includes("não encontrado")) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
    return { ok: true };
  }

  @Get("aliases")
  @ApiOperation({ summary: "List Gmail sendAs aliases for the connected account" })
  async aliases(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.getSendAsAliases.execute("google-token-singleton");
    if (result.isLeft()) {
      this.logger.error("Failed to get sendAs aliases", { error: result.value.message });
      return { aliases: [] };
    }
    return { aliases: result.value.aliases };
  }

  @Get("messages")
  @ApiOperation({ summary: "List email messages for current user" })
  async listMessages(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<unknown[]> {
    return this.getEmailMessages.execute(user.id);
  }

  @Post("sync")
  @HttpCode(200)
  @ApiOperation({ summary: "Trigger manual Gmail sync for current user" })
  async syncNow(@CurrentUser() user: AuthenticatedUser): Promise<{ processed: number }> {
    const result = await this.pollGmail.execute({ userId: "google-token-singleton", ownerId: user.id });
    if (result.isLeft()) throw new BadRequestException(result.value.message);
    return result.value;
  }

  @Get("templates")
  @ApiOperation({ summary: "Listar templates de Gmail" })
  async listTemplates(@Query("onlyActive") onlyActive?: string) {
    const result = await this.getTemplates.execute(onlyActive === "true");
    return result.value.templates;
  }

  @Post("templates")
  @HttpCode(201)
  @ApiOperation({ summary: "Criar template de Gmail" })
  async addTemplate(
    @Body() body: { name: string; subject: string; body: string; category?: string },
  ) {
    const result = await this.createTemplate.execute(body);
    return result.value.template;
  }

  @Patch("templates/:id")
  @HttpCode(200)
  @ApiOperation({ summary: "Atualizar template de Gmail" })
  async editTemplate(
    @Param("id") id: string,
    @Body() body: { name?: string; subject?: string; body?: string; category?: string; active?: boolean },
  ) {
    const result = await this.updateTemplate.execute({ id, ...body });
    return result.value.template;
  }

  @Delete("templates/:id")
  @HttpCode(204)
  @ApiOperation({ summary: "Deletar template de Gmail" })
  async removeTemplate(@Param("id") id: string) {
    await this.deleteTemplate.execute(id);
  }

  @Get("token")
  @ApiOperation({ summary: "Get stored Google OAuth token" })
  async getStoredToken() {
    const result = await this.getToken.execute();
    return result.value.token;
  }

  @Post("token")
  @HttpCode(200)
  @ApiOperation({ summary: "Save Google OAuth token" })
  async saveStoredToken(@Body() body: {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
    scope: string;
    email: string;
  }) {
    const result = await this.saveToken.execute({
      accessToken: body.accessToken,
      refreshToken: body.refreshToken,
      expiresAt: new Date(body.expiresAt),
      scope: body.scope,
      email: body.email,
    });
    return result.value.token;
  }

  @Delete("token")
  @HttpCode(204)
  @ApiOperation({ summary: "Delete stored Google OAuth token" })
  async deleteStoredToken() {
    await this.deleteToken.execute();
  }

  @Patch("token/history")
  @HttpCode(204)
  @ApiOperation({ summary: "Update Gmail history ID" })
  async updateGmailHistoryId(@Body() body: { historyId: string }) {
    await this.updateHistoryId.execute(body.historyId);
  }

  // ─── Email Verification ───────────────────────────────────────────────────

  @Get("verify/source-groups")
  @ApiOperation({ summary: "Lista sourceGroups distintos dos leads para verificação de email" })
  async listEmailSourceGroups(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ sourceGroups: string[] }> {
    const groups = await this.getSourceGroups.execute(user.id, user.role ?? "sdr");
    return { sourceGroups: groups };
  }

  @Post("verify/lead/:id")
  @HttpCode(200)
  @ApiOperation({ summary: "Verificar email de um lead específico" })
  async verifyLeadEmailHandler(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ ok: boolean; leadId?: string; email?: string; valid?: boolean; status?: string; reason?: string; error?: string }> {
    const result = await this.verifyLeadEmail.execute({
      leadId: id,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });

    if (result.isLeft()) {
      const msg = result.value.message;
      if (msg.includes("Não autorizado")) throw new ForbiddenException(msg);
      if (msg.includes("não encontrado")) throw new NotFoundException(msg);
      if (msg.includes("não possui email")) throw new UnprocessableEntityException(msg);
      throw new BadGatewayException(msg);
    }

    return { ok: true, ...result.value };
  }

  @Post("verify/lead-contact/:id")
  @HttpCode(200)
  @ApiOperation({ summary: "Verificar email de um LeadContact específico" })
  async verifyLeadContactEmailHandler(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ ok: boolean; leadContactId?: string; email?: string; valid?: boolean; status?: string; reason?: string; error?: string }> {
    const result = await this.verifyLeadContactEmail.execute({
      leadContactId: id,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });

    if (result.isLeft()) {
      const msg = result.value.message;
      if (msg.includes("Não autorizado")) throw new ForbiddenException(msg);
      if (msg.includes("não encontrado")) throw new NotFoundException(msg);
      if (msg.includes("não possui email")) throw new UnprocessableEntityException(msg);
      // Verifier offline / malformed verifier output → upstream failure
      throw new BadGatewayException(msg);
    }

    return { ok: true, ...result.value };
  }

  @Post("verify/batch")
  @HttpCode(200)
  @ApiOperation({ summary: "Verifica emails em lote para um sourceGroup de leads (SSE)" })
  async batchVerifyEmailsHandler(
    @Body() body: { sourceGroup: string },
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    if (!body.sourceGroup) {
      throw new BadRequestException("Missing required field: sourceGroup");
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const result = await this.batchVerifyEmails.execute({
      sourceGroup: body.sourceGroup,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
      onProgress: (progress) => {
        res.write(`data: ${JSON.stringify({ type: "progress", ...progress })}\n\n`);
      },
    });

    if (result.isLeft()) {
      res.write(`data: ${JSON.stringify({ type: "error", message: result.value.message })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ type: "done", ...result.value })}\n\n`);
    }
    res.end();
  }
}
