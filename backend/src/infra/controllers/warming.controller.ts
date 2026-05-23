import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
  ConflictException,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { AddWarmingAccountUseCase } from "@/domain/warming/application/use-cases/add-warming-account.use-case";
import { RemoveWarmingAccountUseCase } from "@/domain/warming/application/use-cases/remove-warming-account.use-case";
import { AddPoolEmailUseCase } from "@/domain/warming/application/use-cases/add-pool-email.use-case";
import { RemovePoolEmailUseCase } from "@/domain/warming/application/use-cases/remove-pool-email.use-case";
import { GetWarmingStatusUseCase } from "@/domain/warming/application/use-cases/get-warming-status.use-case";
import { RunWarmingCycleUseCase } from "@/domain/warming/application/use-cases/run-warming-cycle.use-case";
import { WarmingPoolEmailsRepository } from "@/domain/warming/application/repositories/warming-pool-emails.repository";
import { WarmingSendsRepository } from "@/domain/warming/application/repositories/warming-sends.repository";

@ApiTags("warming")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("warming")
export class WarmingController {
  constructor(
    private readonly addAccount: AddWarmingAccountUseCase,
    private readonly removeAccount: RemoveWarmingAccountUseCase,
    private readonly addPool: AddPoolEmailUseCase,
    private readonly removePool: RemovePoolEmailUseCase,
    private readonly getStatus: GetWarmingStatusUseCase,
    private readonly runCycle: RunWarmingCycleUseCase,
    private readonly poolEmailsRepo: WarmingPoolEmailsRepository,
    private readonly sendsRepo: WarmingSendsRepository,
  ) {}

  @Get("status")
  @ApiOperation({ summary: "Retorna status do aquecimento e contas cadastradas" })
  async status(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.getStatus.execute({ ownerId: user.id });
    return result.value;
  }

  @Post("accounts")
  @ApiOperation({ summary: "Adiciona conta Gmail ao aquecimento" })
  @ApiBody({ schema: { properties: { email: { type: "string" } }, required: ["email"] } })
  async addWarmingAccount(
    @Body() body: { email: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.addAccount.execute({ email: body.email, ownerId: user.id });
    if (result.isLeft()) throw new ConflictException(result.value.message);
    return { id: result.value.account.id.toString(), email: result.value.account.email };
  }

  @Delete("accounts/:id")
  @HttpCode(204)
  @ApiOperation({ summary: "Remove conta do aquecimento" })
  async removeWarmingAccount(@Param("id") id: string) {
    const result = await this.removeAccount.execute({ id });
    if (result.isLeft()) throw new NotFoundException(result.value.message);
  }

  @Get("pool")
  @ApiOperation({ summary: "Lista emails do pool externo" })
  async listPool(@CurrentUser() user: AuthenticatedUser) {
    const emails = await this.poolEmailsRepo.findAll(user.id);
    return emails.map((e) => ({
      id: e.id.toString(),
      email: e.email,
      name: e.name,
      isActive: e.isActive,
    }));
  }

  @Post("pool")
  @ApiOperation({ summary: "Adiciona email ao pool externo" })
  @ApiBody({ schema: { properties: { email: { type: "string" }, name: { type: "string" } }, required: ["email"] } })
  async addPoolEmail(
    @Body() body: { email: string; name?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.addPool.execute({ email: body.email, name: body.name, ownerId: user.id });
    if (result.isLeft()) throw new ConflictException(result.value.message);
    return { id: result.value.poolEmail.id.toString(), email: result.value.poolEmail.email };
  }

  @Delete("pool/:id")
  @HttpCode(204)
  @ApiOperation({ summary: "Remove email do pool externo" })
  async removePoolEmail(@Param("id") id: string) {
    const result = await this.removePool.execute({ id });
    if (result.isLeft()) throw new NotFoundException(result.value.message);
  }

  @Get("history")
  @ApiOperation({ summary: "Histórico de envios de aquecimento" })
  async history(
    @CurrentUser() user: AuthenticatedUser,
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20",
  ) {
    const { sends, total } = await this.sendsRepo.findAll(user.id, Number(page), Number(pageSize));
    return {
      total,
      page: Number(page),
      sends: sends.map((s) => ({
        id: s.id.toString(),
        fromEmail: s.fromEmail,
        toEmail: s.toEmail,
        subject: s.subject,
        isAutoReply: s.isAutoReply,
        sentAt: s.sentAt,
      })),
    };
  }

  @Post("run")
  @HttpCode(200)
  @ApiOperation({ summary: "Executa ciclo de aquecimento manualmente" })
  async triggerCycle(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.runCycle.execute({ ownerId: user.id });
    return result.value;
  }
}
