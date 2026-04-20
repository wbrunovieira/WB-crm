import {
  Controller, Post, Delete, Put,
  Body, Param, HttpCode, UseGuards,
  NotFoundException, ForbiddenException, UnprocessableEntityException,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Left } from "@/core/either";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import {
  AddLabelToOrganizationUseCase,
  RemoveLabelFromOrganizationUseCase,
  SetOrganizationLabelsUseCase,
} from "@/domain/labels/application/use-cases/label-links.use-cases";

function handleError(err: Left<Error, unknown>): never {
  const msg = err.value.message;
  if (msg.includes("não encontrada")) throw new NotFoundException(msg);
  if (msg.includes("não pertence")) throw new ForbiddenException(msg);
  throw new UnprocessableEntityException(msg);
}

@ApiTags("organizations")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("organizations/:orgId/labels")
export class OrganizationLabelsController {
  constructor(
    private readonly addLabel: AddLabelToOrganizationUseCase,
    private readonly removeLabel: RemoveLabelFromOrganizationUseCase,
    private readonly setLabels: SetOrganizationLabelsUseCase,
  ) {}

  @Post(":labelId")
  @HttpCode(204)
  async add(
    @Param("orgId") orgId: string,
    @Param("labelId") labelId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.addLabel.execute({ labelId, entityId: orgId, requesterId: user.id });
    if (result.isLeft()) handleError(result);
  }

  @Delete(":labelId")
  @HttpCode(204)
  async remove(
    @Param("orgId") orgId: string,
    @Param("labelId") labelId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.removeLabel.execute({ labelId, entityId: orgId, requesterId: user.id });
    if (result.isLeft()) handleError(result);
  }

  @Put()
  @HttpCode(204)
  async set(
    @Param("orgId") orgId: string,
    @Body() body: { labelIds: string[] },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.setLabels.execute({
      entityId: orgId, labelIds: body.labelIds ?? [], requesterId: user.id,
    });
    if (result.isLeft()) handleError(result);
  }
}
