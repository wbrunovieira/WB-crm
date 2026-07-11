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
  NotFoundException,
  ForbiddenException,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { VerifyLeadPhonesUseCase } from "../../application/use-cases/verify-lead-phones.use-case";
import { BatchVerifyLeadPhonesUseCase } from "../../application/use-cases/batch-verify-lead-phones.use-case";
import { VerifyContactPhonesUseCase } from "../../application/use-cases/verify-contact-phones.use-case";
import { BatchVerifyContactPhonesUseCase } from "../../application/use-cases/batch-verify-contact-phones.use-case";
import { VerifyContactEmailUseCase } from "../../application/use-cases/verify-contact-email.use-case";
import { BatchVerifyContactEmailsUseCase } from "../../application/use-cases/batch-verify-contact-emails.use-case";
import { VerifyLeadContactPhonesUseCase } from "../../application/use-cases/verify-lead-contact-phones.use-case";
import { VerifyPartnerPhonesUseCase } from "../../application/use-cases/verify-partner-phones.use-case";
import { VerifyPartnerEmailUseCase } from "../../application/use-cases/verify-partner-email.use-case";
import { GetLeadSourceGroupsUseCase } from "@/domain/leads/application/use-cases/get-lead-source-groups.use-case";

@ApiTags("Phone Verification")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("phone")
export class PhoneController {
  private readonly logger = new Logger(PhoneController.name);

  constructor(
    private readonly verifyLeadPhones: VerifyLeadPhonesUseCase,
    private readonly batchVerifyLeadPhones: BatchVerifyLeadPhonesUseCase,
    private readonly verifyContactPhones: VerifyContactPhonesUseCase,
    private readonly batchVerifyContactPhones: BatchVerifyContactPhonesUseCase,
    private readonly verifyContactEmail: VerifyContactEmailUseCase,
    private readonly batchVerifyContactEmails: BatchVerifyContactEmailsUseCase,
    private readonly verifyLeadContactPhones: VerifyLeadContactPhonesUseCase,
    private readonly verifyPartnerPhones: VerifyPartnerPhonesUseCase,
    private readonly verifyPartnerEmail: VerifyPartnerEmailUseCase,
    private readonly getSourceGroups: GetLeadSourceGroupsUseCase,
  ) {}

  @Get("verify/lead/source-groups")
  @ApiOperation({ summary: "Lista sourceGroups distintos dos leads para verificação de telefone" })
  async listPhoneSourceGroups(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ sourceGroups: string[] }> {
    const groups = await this.getSourceGroups.execute(user.id, user.role ?? "sdr");
    return { sourceGroups: groups };
  }

  @Post("verify/lead/batch")
  @HttpCode(200)
  @ApiOperation({ summary: "Verifica telefones em lote para um sourceGroup de leads (SSE)" })
  async batchVerifyLeadPhonesHandler(
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

    const result = await this.batchVerifyLeadPhones.execute({
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

  @Post("verify/lead/:id")
  @HttpCode(200)
  @ApiOperation({ summary: "Verificar telefones de um lead específico" })
  async verifyLeadPhonesHandler(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.verifyLeadPhones.execute({
      leadId: id,
      requesterId: user.id,
    });

    if (result.isLeft()) {
      throw new NotFoundException(result.value.message);
    }

    return { ok: true, ...result.value };
  }

  @Post("verify/contact/:id")
  @HttpCode(200)
  @ApiOperation({ summary: "Verificar telefones de um contato específico" })
  async verifyContactPhonesHandler(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.verifyContactPhones.execute({
      contactId: id,
      requesterId: user.id,
    });

    if (result.isLeft()) {
      throw new NotFoundException(result.value.message);
    }

    return { ok: true, ...result.value };
  }

  @Post("verify/contact/batch")
  @HttpCode(200)
  @ApiOperation({ summary: "Verifica telefones de contatos em lote (SSE)" })
  async batchVerifyContactPhonesHandler(
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const result = await this.batchVerifyContactPhones.execute({
      ownerId: user.id,
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

  @Post("verify/contact/:id/email")
  @HttpCode(200)
  @ApiOperation({ summary: "Verificar email de um contato específico" })
  async verifyContactEmailHandler(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.verifyContactEmail.execute({
      contactId: id,
      requesterId: user.id,
    });

    if (result.isLeft()) {
      throw new NotFoundException(result.value.message);
    }

    return { ok: true, ...result.value };
  }

  @Post("verify/partner/:id")
  @HttpCode(200)
  @ApiOperation({ summary: "Verificar formato dos telefones de um parceiro" })
  async verifyPartnerPhonesHandler(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.verifyPartnerPhones.execute({
      partnerId: id,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });

    if (result.isLeft()) {
      const msg = result.value.message;
      if (msg.includes("Não autorizado")) throw new ForbiddenException(msg);
      throw new NotFoundException(msg);
    }

    return { ok: true, ...result.value };
  }

  @Post("verify/partner/:id/email")
  @HttpCode(200)
  @ApiOperation({ summary: "Verificar email de um parceiro específico" })
  async verifyPartnerEmailHandler(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.verifyPartnerEmail.execute({
      partnerId: id,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });

    if (result.isLeft()) {
      const msg = result.value.message;
      if (msg.includes("Não autorizado")) throw new ForbiddenException(msg);
      throw new NotFoundException(msg);
    }

    return { ok: true, ...result.value };
  }

  @Post("verify/lead-contact/:id")
  @HttpCode(200)
  @ApiOperation({ summary: "Verificar telefone de um LeadContact específico" })
  async verifyLeadContactPhonesHandler(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.verifyLeadContactPhones.execute({
      leadContactId: id,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });

    if (result.isLeft()) {
      const msg = result.value.message;
      if (msg.includes("Não autorizado")) throw new ForbiddenException(msg);
      throw new NotFoundException(msg);
    }

    return { ok: true, ...result.value };
  }

  @Post("verify/contact/email/batch")
  @HttpCode(200)
  @ApiOperation({ summary: "Verifica emails de contatos em lote (SSE)" })
  async batchVerifyContactEmailsHandler(
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const result = await this.batchVerifyContactEmails.execute({
      ownerId: user.id,
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
