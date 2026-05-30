import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { EmailModule } from "@/domain/integrations/email/email.module";
import { WarmingAccountsRepository } from "./application/repositories/warming-accounts.repository";
import { WarmingPoolEmailsRepository } from "./application/repositories/warming-pool-emails.repository";
import { WarmingSendsRepository } from "./application/repositories/warming-sends.repository";
import { PrismaWarmingAccountsRepository } from "@/infra/database/prisma/repositories/warming/prisma-warming-accounts.repository";
import { PrismaWarmingPoolEmailsRepository } from "@/infra/database/prisma/repositories/warming/prisma-warming-pool-emails.repository";
import { PrismaWarmingSendsRepository } from "@/infra/database/prisma/repositories/warming/prisma-warming-sends.repository";
import { AddWarmingAccountUseCase } from "./application/use-cases/add-warming-account.use-case";
import { RemoveWarmingAccountUseCase } from "./application/use-cases/remove-warming-account.use-case";
import { AddPoolEmailUseCase } from "./application/use-cases/add-pool-email.use-case";
import { RemovePoolEmailUseCase } from "./application/use-cases/remove-pool-email.use-case";
import { GetWarmingStatusUseCase } from "./application/use-cases/get-warming-status.use-case";
import { RunWarmingCycleUseCase } from "./application/use-cases/run-warming-cycle.use-case";
import { GetWarmingPoolEmailsUseCase } from "./application/use-cases/get-warming-pool-emails.use-case";
import { GetWarmingHistoryUseCase } from "./application/use-cases/get-warming-history.use-case";
import { WarmingController } from "@/infra/controllers/warming.controller";
import { WarmingCronService } from "@/infra/scheduled/warming-cron.service";

@Module({
  imports: [AuthModule, EmailModule],
  controllers: [WarmingController],
  providers: [
    // Repositories
    { provide: WarmingAccountsRepository, useClass: PrismaWarmingAccountsRepository },
    { provide: WarmingPoolEmailsRepository, useClass: PrismaWarmingPoolEmailsRepository },
    { provide: WarmingSendsRepository, useClass: PrismaWarmingSendsRepository },
    // Use Cases
    AddWarmingAccountUseCase,
    RemoveWarmingAccountUseCase,
    AddPoolEmailUseCase,
    RemovePoolEmailUseCase,
    GetWarmingStatusUseCase,
    RunWarmingCycleUseCase,
    GetWarmingPoolEmailsUseCase,
    GetWarmingHistoryUseCase,
    // Cron
    WarmingCronService,
  ],
})
export class WarmingModule {}
