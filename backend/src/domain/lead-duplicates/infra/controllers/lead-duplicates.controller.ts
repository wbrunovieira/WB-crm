import { Controller, Post, Body, UseGuards, UnprocessableEntityException } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Left } from "@/core/either";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { CheckLeadDuplicatesUseCase } from "../../application/use-cases/check-lead-duplicates.use-case";

function handleError(err: Left<Error, unknown>): never {
  throw new UnprocessableEntityException(err.value.message);
}

@ApiTags("leads")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("leads")
export class LeadDuplicatesController {
  constructor(private readonly checkDuplicates: CheckLeadDuplicatesUseCase) {}

  @Post("check-duplicates")
  async check(@Body() body: { cnpj?: string; name?: string; phone?: string; email?: string; address?: string }, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.checkDuplicates.execute({ ...body, ownerId: user.id });
    if (result.isLeft()) handleError(result);
    return result.unwrap();
  }
}
