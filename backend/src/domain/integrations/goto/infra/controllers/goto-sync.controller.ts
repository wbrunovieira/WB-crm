import { Controller, Post, Query, UseGuards, Logger, HttpCode } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { SyncGotoCallReportsUseCase } from "@/domain/integrations/goto/application/use-cases/sync-goto-call-reports.use-case";

const DEFAULT_HOURS = 2;
const MAX_HOURS = 24;

@ApiTags("GoTo")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("goto")
export class GoToSyncController {
  private readonly logger = new Logger(GoToSyncController.name);

  constructor(private readonly syncCallReports: SyncGotoCallReportsUseCase) {}

  @Post("quick-sync")
  @HttpCode(200)
  @ApiOperation({ summary: "Sincroniza ligações recentes do GoTo imediatamente (JWT-protegido)" })
  @ApiQuery({ name: "sinceHoursAgo", required: false, description: "Janela de tempo em horas (padrão: 2, máximo: 24)" })
  async quickSync(
    @Query("sinceHoursAgo") sinceHoursAgoParam: string | undefined,
  ): Promise<{ fetched: number; created: number; skipped: number }> {
    const parsed = parseFloat(sinceHoursAgoParam ?? "");
    const sinceHoursAgo =
      Number.isNaN(parsed) || parsed <= 0
        ? DEFAULT_HOURS
        : Math.min(parsed, MAX_HOURS);

    const ownerId = process.env.GOTO_DEFAULT_OWNER_ID ?? "";
    const sinceDaysAgo = sinceHoursAgo / 24;

    this.logger.log(`Quick sync: últimas ${sinceHoursAgo}h (sinceDaysAgo=${sinceDaysAgo.toFixed(4)})`);

    const result = await this.syncCallReports.execute({ ownerId, sinceDaysAgo });
    return { ...result.value };
  }
}
