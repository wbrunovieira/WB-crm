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
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { SendWhatsAppMessageUseCase } from "@/domain/integrations/whatsapp/application/use-cases/send-whatsapp-message.use-case";
import { SendWhatsAppMediaUseCase } from "@/domain/integrations/whatsapp/application/use-cases/send-whatsapp-media.use-case";
import { GetWhatsAppMediaMessagesUseCase } from "@/domain/integrations/whatsapp/application/use-cases/get-whatsapp-media-messages.use-case";
import { SaveWhatsAppVerificationUseCase } from "@/domain/integrations/whatsapp/application/use-cases/save-whatsapp-verification.use-case";
import { SaveWhatsAppNumberUseCase } from "@/domain/integrations/whatsapp/application/use-cases/save-whatsapp-number.use-case";
import { EvolutionApiPort } from "@/domain/integrations/whatsapp/application/ports/evolution-api.port";
import { GetWhatsAppTemplatesUseCase, CreateWhatsAppTemplateUseCase, UpdateWhatsAppTemplateUseCase, DeleteWhatsAppTemplateUseCase } from "@/domain/integrations/whatsapp/application/use-cases/whatsapp-templates.use-cases";
import { GetWhatsAppMessageByIdUseCase } from "@/domain/integrations/whatsapp/application/use-cases/get-whatsapp-message-by-id.use-case";

interface SendMessageBody {
  to: string;
  text: string;
  contactName?: string;
}

interface SendMediaBody {
  to: string;
  mediatype: string;
  mediaBase64: string;
  fileName: string;
  mimetype: string;
  caption?: string;
  contactName?: string;
}

interface CheckNumberBody {
  phone: string;
}

interface SaveVerificationBody {
  entityType: "lead" | "contact";
  entityId: string;
  verifiedNumber: string;
  exists?: boolean;
}

interface SaveNumberBody {
  entityType: "lead" | "contact";
  entityId: string;
  whatsapp: string;
}

@ApiTags("WhatsApp")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("whatsapp")
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(
    private readonly sendMessage: SendWhatsAppMessageUseCase,
    private readonly sendMedia: SendWhatsAppMediaUseCase,
    private readonly getMediaMessages: GetWhatsAppMediaMessagesUseCase,
    private readonly saveVerification: SaveWhatsAppVerificationUseCase,
    private readonly saveNumber: SaveWhatsAppNumberUseCase,
    private readonly evolutionApi: EvolutionApiPort,
    private readonly getTemplates: GetWhatsAppTemplatesUseCase,
    private readonly createTemplate: CreateWhatsAppTemplateUseCase,
    private readonly updateTemplate: UpdateWhatsAppTemplateUseCase,
    private readonly deleteTemplate: DeleteWhatsAppTemplateUseCase,
    private readonly getMessageById: GetWhatsAppMessageByIdUseCase,
  ) {}

  @Post("send")
  @HttpCode(200)
  @ApiOperation({ summary: "Send a WhatsApp text message" })
  async send(
    @Body() body: SendMessageBody,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ ok: boolean; messageId?: string; activityId?: string; error?: string }> {
    if (!body.to || !body.text) {
      throw new BadRequestException("Missing required fields: to, text");
    }

    const result = await this.sendMessage.execute({
      to: body.to,
      text: body.text,
      ownerId: user.id,
      contactName: body.contactName,
    });

    if (result.isLeft()) {
      this.logger.error("Failed to send WhatsApp message", { error: result.value.message });
      return { ok: false, error: result.value.message };
    }

    return { ok: true, ...result.value };
  }

  @Post("send-media")
  @HttpCode(200)
  @ApiOperation({ summary: "Send a WhatsApp media message" })
  async sendMediaMessage(
    @Body() body: SendMediaBody,
    @CurrentUser() _user: AuthenticatedUser,
  ): Promise<{ ok: boolean; messageId?: string; error?: string }> {
    if (!body.to || !body.mediaBase64) {
      throw new BadRequestException("Missing required fields: to, mediaBase64");
    }

    const result = await this.sendMedia.execute({
      to: body.to,
      mediatype: body.mediatype,
      mediaBase64: body.mediaBase64,
      fileName: body.fileName,
      mimetype: body.mimetype,
      caption: body.caption,
    });

    if (result.isLeft()) {
      return { ok: false, error: result.value.message };
    }

    return { ok: true, messageId: result.value.messageId };
  }

  @Post("check")
  @HttpCode(200)
  @ApiOperation({ summary: "Check if a phone number has WhatsApp" })
  async checkNumber(
    @Body() body: CheckNumberBody,
  ): Promise<{ exists: boolean; jid?: string; number?: string; name?: string }> {
    if (!body.phone) {
      throw new BadRequestException("Missing required field: phone");
    }
    return this.evolutionApi.checkNumber(body.phone);
  }

  @Patch("save-verification")
  @HttpCode(200)
  @ApiOperation({ summary: "Save WhatsApp verification result on lead or contact" })
  async saveVerificationHandler(
    @Body() body: SaveVerificationBody,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ ok: boolean }> {
    const result = await this.saveVerification.execute({
      entityType: body.entityType,
      entityId: body.entityId,
      ownerId: user.id,
      verifiedNumber: body.verifiedNumber,
      exists: body.exists,
    });

    if (result.isLeft()) throw new NotFoundException(result.value.message);
    return { ok: true };
  }

  @Patch("save-number")
  @HttpCode(200)
  @ApiOperation({ summary: "Save WhatsApp number on lead or contact" })
  async saveNumberHandler(
    @Body() body: SaveNumberBody,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ ok: boolean }> {
    const result = await this.saveNumber.execute({
      entityType: body.entityType,
      entityId: body.entityId,
      ownerId: user.id,
      whatsapp: body.whatsapp,
    });

    if (result.isLeft()) throw new NotFoundException(result.value.message);
    return { ok: true };
  }

  @Get("message/:id")
  @ApiOperation({ summary: "Get a WhatsApp message by database ID" })
  async getMessageByIdHandler(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<unknown> {
    const result = await this.getMessageById.execute(id);
    if (result.isLeft()) throw new NotFoundException(result.value.message);
    const msg = result.value;
    if (user.role !== "admin" && msg.ownerId !== user.id) {
      throw new ForbiddenException("Acesso negado");
    }
    return msg;
  }

  @Get("messages/:activityId")
  @ApiOperation({ summary: "Get WhatsApp media messages for an activity" })
  async getMessages(
    @Param("activityId") activityId: string,
  ): Promise<unknown[]> {
    const result = await this.getMediaMessages.execute(activityId);
    return result.value.messages;
  }

  @Get("templates")
  @ApiOperation({ summary: "Listar templates de WhatsApp" })
  async listTemplates(@Query("onlyActive") onlyActive?: string) {
    const result = await this.getTemplates.execute(onlyActive === "true");
    return result.value.templates;
  }

  @Post("templates")
  @HttpCode(201)
  @ApiOperation({ summary: "Criar template de WhatsApp (admin)" })
  async addTemplate(
    @Body() body: { name: string; text: string; category?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.createTemplate.execute({ ...body, requesterRole: user.role ?? "sdr" });
    if (result.isLeft()) throw new UnauthorizedException(result.value.message);
    return result.value.template;
  }

  @Patch("templates/:id")
  @HttpCode(200)
  @ApiOperation({ summary: "Atualizar template de WhatsApp (admin)" })
  async editTemplate(
    @Param("id") id: string,
    @Body() body: { name?: string; text?: string; category?: string; active?: boolean },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.updateTemplate.execute({ id, ...body, requesterRole: user.role ?? "sdr" });
    if (result.isLeft()) throw new UnauthorizedException(result.value.message);
    return result.value.template;
  }

  @Delete("templates/:id")
  @HttpCode(204)
  @ApiOperation({ summary: "Deletar template de WhatsApp (admin)" })
  async removeTemplate(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.deleteTemplate.execute({ id, requesterRole: user.role ?? "sdr" });
    if (result.isLeft()) throw new UnauthorizedException(result.value.message);
  }
}
