import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { RunWarmingCycleUseCase } from "@/domain/warming/application/use-cases/run-warming-cycle.use-case";
import { WarmingAccountsRepository } from "@/domain/warming/application/repositories/warming-accounts.repository";
import { PrismaService } from "@/infra/database/prisma.service";

// Runs daily at 9:00 AM
@Injectable()
export class WarmingCronService {
  private readonly logger = new Logger(WarmingCronService.name);

  constructor(
    private readonly runCycle: RunWarmingCycleUseCase,
    private readonly accounts: WarmingAccountsRepository,
    private readonly prisma: PrismaService,
  ) {}

  @Cron("0 9 * * *")
  async runDailyCycle(): Promise<void> {
    this.logger.log("Iniciando ciclo diário de aquecimento de email");

    // Get all distinct ownerIds with active warming accounts
    const activeAccounts = await this.prisma.warmingAccount.findMany({
      where: { isActive: true },
      select: { ownerId: true },
      distinct: ["ownerId"],
    });

    if (activeAccounts.length === 0) {
      this.logger.log("Nenhuma conta de aquecimento ativa");
      return;
    }

    let totalSent = 0;
    for (const { ownerId } of activeAccounts) {
      const result = await this.runCycle.execute({ ownerId });
      if (result.isRight()) {
        totalSent += result.value.totalSent;
      }
    }

    this.logger.log(`Ciclo de aquecimento concluído: ${totalSent} emails enviados`);
  }
}
