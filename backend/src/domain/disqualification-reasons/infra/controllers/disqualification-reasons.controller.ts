import {
  Controller, Get, Post, Delete, Body, Param,
  UseGuards, NotFoundException, ForbiddenException,
  UnprocessableEntityException, ConflictException,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Left } from "@/core/either";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { DisqualificationReason } from "../../enterprise/entities/disqualification-reason";
import {
  GetDisqualificationReasonsUseCase,
  CreateDisqualificationReasonUseCase,
  DeleteDisqualificationReasonUseCase,
} from "../../application/use-cases/disqualification-reasons.use-cases";

function serialize(r: DisqualificationReason) {
  return { id: r.id.toString(), name: r.name, ownerId: r.ownerId, createdAt: r.createdAt };
}

function handleError(err: Left<Error, unknown>): never {
  const e = err.value as Error;
  if (e.name === "ReasonNotFoundError") throw new NotFoundException(e.message);
  if (e.name === "ReasonForbiddenError") throw new ForbiddenException(e.message);
  if (e.name === "ReasonConflictError") throw new ConflictException(e.message);
  throw new UnprocessableEntityException(e.message);
}

@ApiTags("disqualification-reasons")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("disqualification-reasons")
export class DisqualificationReasonsController {
  constructor(
    private readonly getReasons: GetDisqualificationReasonsUseCase,
    private readonly createReason: CreateDisqualificationReasonUseCase,
    private readonly deleteReason: DeleteDisqualificationReasonUseCase,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const r = await this.getReasons.execute({ requesterId: user.id });
    if (r.isLeft()) handleError(r);
    return r.unwrap().map(serialize);
  }

  @Post()
  async create(@Body() body: { name: string }, @CurrentUser() user: AuthenticatedUser) {
    const r = await this.createReason.execute({ name: body.name, ownerId: user.id });
    if (r.isLeft()) handleError(r);
    return serialize(r.unwrap());
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const r = await this.deleteReason.execute({ id, requesterId: user.id, requesterRole: user.role ?? "sdr" });
    if (r.isLeft()) handleError(r);
  }
}
