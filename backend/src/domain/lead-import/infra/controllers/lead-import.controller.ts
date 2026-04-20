import { Controller, Post, Body, UseGuards, UnprocessableEntityException } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import type { ImportLeadRowData } from "../../application/repositories/lead-import.repository";
import { ImportLeadsUseCase } from "../../application/use-cases/import-leads.use-case";

@ApiTags("lead-import")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("lead-import")
export class LeadImportController {
  constructor(private readonly importLeads: ImportLeadsUseCase) {}

  @Post()
  async import(@Body() body: { rows: ImportLeadRowData[] }, @CurrentUser() user: AuthenticatedUser) {
    if (!Array.isArray(body.rows)) throw new UnprocessableEntityException("rows deve ser um array");
    const r = await this.importLeads.execute({ rows: body.rows, ownerId: user.id });
    return r.unwrap();
  }
}
