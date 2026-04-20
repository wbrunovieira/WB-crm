import {
  Controller, Patch, Body, UseGuards,
  NotFoundException, ForbiddenException, UnprocessableEntityException,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Left } from "@/core/either";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { TransferToOperationsUseCase, RevertFromOperationsUseCase } from "../../application/use-cases/operations.use-cases";

function handleError(err: Left<Error, unknown>): never {
  const msg = err.value.message;
  if (msg.includes("não encontrado")) throw new NotFoundException(msg);
  if (msg.includes("Acesso negado")) throw new ForbiddenException(msg);
  throw new UnprocessableEntityException(msg);
}

@ApiTags("operations")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("operations")
export class OperationsController {
  constructor(
    private readonly transfer: TransferToOperationsUseCase,
    private readonly revert: RevertFromOperationsUseCase,
  ) {}

  @Patch("transfer")
  async transferToOperations(@Body() body: { entityType: string; entityId: string }, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.transfer.execute({ entityType: body.entityType, entityId: body.entityId, requesterId: user.id, requesterRole: user.role ?? "sdr" });
    if (result.isLeft()) handleError(result);
    return result.unwrap();
  }

  @Patch("revert")
  async revertFromOperations(@Body() body: { entityType: string; entityId: string }, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.revert.execute({ entityType: body.entityType, entityId: body.entityId, requesterId: user.id, requesterRole: user.role ?? "sdr" });
    if (result.isLeft()) handleError(result);
  }
}
