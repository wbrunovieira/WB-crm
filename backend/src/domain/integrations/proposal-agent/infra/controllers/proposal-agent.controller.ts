import {
  Controller,
  Post,
  Body,
  Param,
  Headers,
  HttpCode,
  Logger,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  BadGatewayException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { TriggerProposalAgentUseCase } from "../../application/use-cases/trigger-proposal-agent.use-case";
import { HandleProposalAgentWebhookUseCase, type ProposalAgentWebhookPayload } from "../../application/use-cases/handle-proposal-agent-webhook.use-case";
import { AnswerProposalAgentQuestionUseCase } from "../../application/use-cases/answer-proposal-agent-question.use-case";
import { CorrectProposalUseCase } from "../../application/use-cases/correct-proposal.use-case";
import { ReviseProposalUseCase } from "../../application/use-cases/revise-proposal.use-case";

function isLocalIp(ip: string): boolean {
  return (
    ip === "127.0.0.1" || ip === "::1" || ip === "localhost" ||
    ip.startsWith("192.168.") || ip.startsWith("10.") ||
    ip.startsWith("172.16.") || ip.startsWith("172.17.") ||
    ip.startsWith("172.18.") || ip.startsWith("172.19.") ||
    ip.startsWith("172.2") || ip.startsWith("172.30.") || ip.startsWith("172.31.")
  );
}

@ApiTags("Proposal Agent")
@Controller()
export class ProposalAgentController {
  private readonly logger = new Logger(ProposalAgentController.name);

  constructor(
    private readonly triggerUseCase: TriggerProposalAgentUseCase,
    private readonly webhookUseCase: HandleProposalAgentWebhookUseCase,
    private readonly answerUseCase: AnswerProposalAgentQuestionUseCase,
    private readonly correctUseCase: CorrectProposalUseCase,
    private readonly reviseUseCase: ReviseProposalUseCase,
  ) {}

  @Post("leads/:id/proposal-agent")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(202)
  @ApiOperation({ summary: "Aciona o agente para gerar proposta de um lead" })
  async trigger(
    @Param("id") leadId: string,
    @Body() body: {
      brand: "wb" | "salto";
      contacts: Array<{ name: string; gender: "male" | "female" | "unknown" }>;
      instructions?: string;
    },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!body.brand) throw new BadRequestException("brand é obrigatório (wb | salto)");
    if (!Array.isArray(body.contacts)) throw new BadRequestException("contacts deve ser um array");

    const result = await this.triggerUseCase.execute({
      leadId,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
      brand: body.brand,
      contacts: body.contacts,
      instructions: body.instructions,
    });

    if (result.isLeft()) {
      const msg = result.value.message;
      if (msg.includes("não encontrado")) throw new NotFoundException(msg);
      throw new BadGatewayException(msg);
    }

    return { status: "accepted", proposalId: result.value.proposalId, jobId: result.value.jobId };
  }

  @Post("proposals/:id/agent-answer")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiOperation({ summary: "Envia resposta a uma pergunta do agente de proposta" })
  async answer(
    @Param("id") proposalId: string,
    @Body() body: { answer: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!body.answer?.trim()) throw new BadRequestException("answer é obrigatório");

    const result = await this.answerUseCase.execute({
      proposalId,
      requesterId: user.id,
      answer: body.answer,
    });

    if (result.isLeft()) {
      const msg = result.value.message;
      if (msg.includes("não encontrada")) throw new NotFoundException(msg);
      if (msg.includes("negado")) throw new ForbiddenException(msg);
      if (msg.includes("aguardando")) throw new UnprocessableEntityException(msg);
      throw new BadGatewayException(msg);
    }

    return { ok: true };
  }

  @Post("proposals/:id/agent-correct")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(202)
  @ApiOperation({ summary: "Aciona o agente para corrigir uma proposta existente" })
  async correct(
    @Param("id") proposalId: string,
    @Body() body: { instructions: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!body.instructions?.trim()) throw new BadRequestException("instructions é obrigatório");

    const result = await this.correctUseCase.execute({
      proposalId,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
      instructions: body.instructions,
    });

    if (result.isLeft()) {
      const msg = result.value.message;
      if (msg.includes("não encontrada")) throw new NotFoundException(msg);
      if (msg.includes("Drive")) throw new UnprocessableEntityException(msg);
      throw new BadGatewayException(msg);
    }

    return { status: "accepted", proposalId: result.value.proposalId, jobId: result.value.jobId };
  }

  @Post("proposals/:id/agent-revise")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(202)
  @ApiOperation({ summary: "Aciona o agente para criar uma revisão de proposta" })
  async revise(
    @Param("id") proposalId: string,
    @Body() body: { revisionNotes: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!body.revisionNotes?.trim()) throw new BadRequestException("revisionNotes é obrigatório");

    const result = await this.reviseUseCase.execute({
      proposalId,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
      revisionNotes: body.revisionNotes,
    });

    if (result.isLeft()) {
      const msg = result.value.message;
      if (msg.includes("não encontrada")) throw new NotFoundException(msg);
      if (msg.includes("Drive")) throw new UnprocessableEntityException(msg);
      throw new BadGatewayException(msg);
    }

    return {
      status: "accepted",
      proposalId: result.value.proposalId,
      jobId: result.value.jobId,
      revisionNumber: result.value.revisionNumber,
    };
  }

  @Post("webhooks/proposal-agent")
  @HttpCode(200)
  @ApiOperation({ summary: "Callback do agente IA com resultado da geração de proposta" })
  async webhook(
    @Body() body: ProposalAgentWebhookPayload,
    @Headers() headers: Record<string, string | undefined>,
  ) {
    if (!this.isAuthorized(headers)) {
      this.logger.warn("Unauthorized webhook attempt for proposal-agent");
      throw new ForbiddenException("Unauthorized");
    }

    this.logger.log(`Proposal agent webhook: jobId=${body.jobId} status=${body.status}`);

    setImmediate(() => {
      this.webhookUseCase.execute(body).then((result) => {
        if (result.isLeft()) {
          this.logger.error(`Proposal webhook error: ${result.value.message}`);
        } else {
          this.logger.log(`Proposal ${result.value.proposalId} updated to ${result.value.status}`);
        }
      }).catch((err: unknown) => {
        this.logger.error(`Proposal webhook exception: ${String(err)}`);
      });
    });

    return { ok: true, queued: true };
  }

  private isAuthorized(headers: Record<string, string | undefined>): boolean {
    const apiKey = headers["x-internal-api-key"];
    if (apiKey && apiKey === process.env.INTERNAL_API_KEY) return true;

    const webhookSecret = headers["x-webhook-secret"];
    if (webhookSecret) {
      if (webhookSecret === process.env.WEBHOOK_SECRET) return true;
      if (process.env.PROPOSAL_AGENT_SECRET && webhookSecret === process.env.PROPOSAL_AGENT_SECRET) return true;
    }

    const forwardedFor = headers["x-forwarded-for"];
    if (forwardedFor) {
      const firstIp = forwardedFor.split(",")[0].trim();
      if (isLocalIp(firstIp)) return true;
    }

    return false;
  }
}
