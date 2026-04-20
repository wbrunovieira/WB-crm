import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { HostingRenewalsRepository } from "./application/repositories/hosting-renewals.repository";
import { PrismaHostingRenewalsRepository } from "./infra/repositories/prisma-hosting-renewals.repository";
import { GetUpcomingRenewalsUseCase, CreateRenewalActivityUseCase } from "./application/use-cases/hosting-renewals.use-cases";
import { HostingRenewalsController } from "./infra/controllers/hosting-renewals.controller";

@Module({
  imports: [AuthModule],
  controllers: [HostingRenewalsController],
  providers: [
    { provide: HostingRenewalsRepository, useClass: PrismaHostingRenewalsRepository },
    GetUpcomingRenewalsUseCase,
    CreateRenewalActivityUseCase,
  ],
})
export class HostingRenewalsModule {}
