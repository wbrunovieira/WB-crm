import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, HttpCode, UseGuards,
  NotFoundException, UnprocessableEntityException,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Left } from "@/core/either";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import {
  GetLabelsUseCase,
  CreateLabelUseCase,
  UpdateLabelUseCase,
  DeleteLabelUseCase,
} from "@/domain/labels/application/use-cases/labels.use-cases";

function handleError(err: Left<Error, unknown>): never {
  const msg = err.value.message;
  if (msg.includes("não encontrada")) throw new NotFoundException(msg);
  throw new UnprocessableEntityException(msg);
}

class CreateLabelDto {
  name!: string;
  color!: string;
}

class UpdateLabelDto {
  name?: string;
  color?: string;
}

@ApiTags("labels")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("labels")
export class LabelsController {
  constructor(
    private readonly getLabels: GetLabelsUseCase,
    private readonly createLabel: CreateLabelUseCase,
    private readonly updateLabel: UpdateLabelUseCase,
    private readonly deleteLabel: DeleteLabelUseCase,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.getLabels.execute(user.id);
    return result.value.labels.map((l) => ({
      id: l.id.toString(),
      name: l.name,
      color: l.color,
      createdAt: l.createdAt,
    }));
  }

  @Post()
  @HttpCode(201)
  async create(@Body() body: CreateLabelDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.createLabel.execute({
      name: body.name,
      color: body.color,
      ownerId: user.id,
    });
    if (result.isLeft()) handleError(result);
    if (result.isRight()) return { id: result.value.label.id.toString() };
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() body: UpdateLabelDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.updateLabel.execute({
      id,
      name: body.name,
      color: body.color,
      requesterId: user.id,
    });
    if (result.isLeft()) handleError(result);
    if (result.isRight()) return { id: result.value.label.id.toString() };
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.deleteLabel.execute({ id, requesterId: user.id });
    if (result.isLeft()) handleError(result);
  }
}
