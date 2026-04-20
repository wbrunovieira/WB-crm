import {
  Controller, Post, Param, HttpCode, UseGuards,
  NotFoundException, UnprocessableEntityException, ForbiddenException,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Left } from "@/core/either";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { ConvertLeadToOrganizationUseCase } from "../../application/use-cases/convert-lead-to-organization.use-case";

function handleError(err: Left<Error, unknown>): never {
  const msg = err.value.message;
  if (msg.includes("não encontrado")) throw new NotFoundException(msg);
  if (msg.includes("Acesso negado")) throw new ForbiddenException(msg);
  throw new UnprocessableEntityException(msg);
}

@ApiTags("leads")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("leads")
export class LeadConversionController {
  constructor(private readonly convertLead: ConvertLeadToOrganizationUseCase) {}

  @Post(":id/convert")
  @HttpCode(200)
  async convert(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.convertLead.execute({
      leadId: id,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });
    if (result.isLeft()) handleError(result);
    return result.unwrap();
  }
}
