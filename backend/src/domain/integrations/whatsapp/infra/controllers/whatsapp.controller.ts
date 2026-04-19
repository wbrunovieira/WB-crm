import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Logger,
  HttpCode,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { SendWhatsAppMessageUseCase } from "@/domain/integrations/whatsapp/application/use-cases/send-whatsapp-message.use-case";
import { EvolutionApiPort } from "@/domain/integrations/whatsapp/application/ports/evolution-api.port";
import { PrismaService } from "@/infra/database/prisma.service";

interface SendMessageBody {
  to: string;
  text: string;
  contactName?: string;
}

interface CheckNumberBody {
  phone: string;
}

@ApiTags("WhatsApp")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("whatsapp")
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(
    private readonly sendMessage: SendWhatsAppMessageUseCase,
    private readonly evolutionApi: EvolutionApiPort,
    private readonly prisma: PrismaService,
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

  @Get("messages/:activityId")
  @ApiOperation({ summary: "Get WhatsApp media messages for an activity" })
  async getMessages(
    @Param("activityId") activityId: string,
  ): Promise<unknown[]> {
    return this.prisma.whatsAppMessage.findMany({
      where: {
        activityId,
        mediaDriveId: { not: null },
      },
      orderBy: { timestamp: "asc" },
    });
  }
}
