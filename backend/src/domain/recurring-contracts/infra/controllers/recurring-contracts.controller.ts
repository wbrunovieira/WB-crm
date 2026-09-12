import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { NotFoundException, ForbiddenException, UnprocessableEntityException } from "@nestjs/common";
import { Left } from "@/core/either";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import {
  CreateRecurringContractUseCase,
  ListRecurringContractsUseCase,
  UpdateRecurringContractUseCase,
  DeleteRecurringContractUseCase,
} from "../../application/use-cases/recurring-contracts.use-cases";
import { totalizar } from "../../application/use-cases/totalizar";
import type { RecurringContract } from "../../enterprise/entities/recurring-contract";

function handleError(err: Left<Error, unknown>): never {
  const e = err.value as Error;
  if (e.message.includes("não encontrado")) throw new NotFoundException(e.message);
  if (e.message.includes("Não autorizado")) throw new ForbiddenException(e.message);
  throw new UnprocessableEntityException(e.message);
}

function serialize(c: RecurringContract) {
  return {
    id: c.id.toString(),
    organizationId: c.organizationId,
    type: c.type,
    label: c.label ?? null,
    value: c.value,
    currency: c.currency,
    cycle: c.cycle,
    nextChargeAt: c.nextChargeAt ?? null,
    endsAt: c.endsAt ?? null,
    autoRenew: c.autoRenew,
    remindDays: c.remindDays,
    isPassThrough: c.isPassThrough,
    isCourtesy: c.isCourtesy,
    status: c.status,
    notes: c.notes ?? null,
    // Derivados: a tela nao deveria reimplementar a regra de negocio para exibir.
    monthlyValue: c.monthlyValue,
    precisaAvisar: c.precisaAvisar(),
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

/** Corpo aceito nas rotas. Tipado de verdade em vez de Record<string, unknown> com cast: o
 *  cast apagava os campos no spread e o erro so aparecia no compilador, nao em teste. */
interface CorpoContrato {
  type?: string;
  label?: string;
  value?: number;
  currency?: string;
  cycle?: string;
  nextChargeAt?: string | null;
  endsAt?: string | null;
  autoRenew?: boolean;
  remindDays?: number;
  isPassThrough?: boolean;
  isCourtesy?: boolean;
  status?: string;
  notes?: string;
}

function corpoParaDatas(body: CorpoContrato) {
  const data = (v?: string | null) => (v ? new Date(v) : undefined);
  return { nextChargeAt: data(body.nextChargeAt), endsAt: data(body.endsAt) };
}

@ApiTags("recurring-contracts")
@Controller()
@UseGuards(JwtAuthGuard)
export class RecurringContractsController {
  constructor(
    private readonly criar: CreateRecurringContractUseCase,
    private readonly listar: ListRecurringContractsUseCase,
    private readonly atualizar: UpdateRecurringContractUseCase,
    private readonly remover: DeleteRecurringContractUseCase,
  ) {}

  @Get("organizations/:organizationId/recurring-contracts")
  @ApiOperation({ summary: "Contratos recorrentes do cliente, com os dois totais" })
  @ApiParam({ name: "organizationId" })
  async list(@Param("organizationId") organizationId: string) {
    const r = await this.listar.execute(organizationId);
    if (r.isLeft()) handleError(r);
    const { contracts } = r.value as { contracts: RecurringContract[] };
    return {
      contracts: contracts.map(serialize),
      // Dois totais de proposito: "cobrado" e o que o Bruno fala ao cliente (hospedagem +
      // dominio); "receita" exclui repasse. Confundi-los engana nos dois sentidos.
      totais: totalizar(contracts),
    };
  }

  @Post("organizations/:organizationId/recurring-contracts")
  @ApiOperation({ summary: "Criar contrato recorrente" })
  @ApiParam({ name: "organizationId" })
  async create(
    @Param("organizationId") organizationId: string,
    @Body() body: CorpoContrato,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const r = await this.criar.execute({
      ...body,
      ...corpoParaDatas(body),
      type: body.type ?? "",
      value: body.value ?? 0,
      cycle: body.cycle ?? "",
      organizationId,
      requesterId: user.id,
    });
    if (r.isLeft()) handleError(r);
    return serialize((r.value as { contract: RecurringContract }).contract);
  }

  @Patch("recurring-contracts/:id")
  @ApiOperation({ summary: "Atualizar contrato recorrente" })
  @ApiParam({ name: "id" })
  async update(
    @Param("id") id: string,
    @Body() body: CorpoContrato,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const r = await this.atualizar.execute({
      ...body,
      ...corpoParaDatas(body),
      id,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });
    if (r.isLeft()) handleError(r);
    return serialize((r.value as { contract: RecurringContract }).contract);
  }

  @Delete("recurring-contracts/:id")
  @HttpCode(204)
  @ApiOperation({ summary: "Remover contrato recorrente" })
  @ApiParam({ name: "id" })
  async remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const r = await this.remover.execute({ id, requesterId: user.id, requesterRole: user.role ?? "sdr" });
    if (r.isLeft()) handleError(r);
  }
}
