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
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { SendEmailUseCase } from "../../application/use-cases/send-email.use-case";
import { PollGmailUseCase } from "../../application/use-cases/poll-gmail.use-case";
import { EmailMessagesRepository } from "../../application/repositories/email-messages.repository";
import { GetGmailTemplatesUseCase, CreateGmailTemplateUseCase, UpdateGmailTemplateUseCase, DeleteGmailTemplateUseCase } from "../../application/use-cases/gmail-templates.use-cases";
import { GetGoogleTokenUseCase, SaveGoogleTokenUseCase, DeleteGoogleTokenUseCase, UpdateTokenHistoryIdUseCase } from "../../application/use-cases/google-token.use-cases";

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
    private readonly pollGmail: PollGmailUseCase,
    private readonly emailMessagesRepo: EmailMessagesRepository,
    private readonly getTemplates: GetGmailTemplatesUseCase,
    private readonly createTemplate: CreateGmailTemplateUseCase,
    private readonly updateTemplate: UpdateGmailTemplateUseCase,
    private readonly deleteTemplate: DeleteGmailTemplateUseCase,
    private readonly getToken: GetGoogleTokenUseCase,
    private readonly saveToken: SaveGoogleTokenUseCase,
    private readonly deleteToken: DeleteGoogleTokenUseCase,
    private readonly updateHistoryId: UpdateTokenHistoryIdUseCase,
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

  @Post("sync")
  @HttpCode(200)
  @ApiOperation({ summary: "Trigger manual Gmail sync for current user" })
  async syncNow(@CurrentUser() user: AuthenticatedUser): Promise<{ processed: number }> {
    const result = await this.pollGmail.execute({ userId: user.id, ownerId: user.id });
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
}
