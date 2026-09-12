import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { RecurringContractsRepository } from "./application/repositories/recurring-contracts.repository";
import { PrismaRecurringContractsRepository } from "./infra/repositories/prisma-recurring-contracts.repository";
import { RecurringContractsController } from "./infra/controllers/recurring-contracts.controller";
import {
  CreateRecurringContractUseCase,
  ListRecurringContractsUseCase,
  UpdateRecurringContractUseCase,
  DeleteRecurringContractUseCase,
} from "./application/use-cases/recurring-contracts.use-cases";

@Module({
  imports: [AuthModule],
  controllers: [RecurringContractsController],
  providers: [
    { provide: RecurringContractsRepository, useClass: PrismaRecurringContractsRepository },
    CreateRecurringContractUseCase,
    ListRecurringContractsUseCase,
    UpdateRecurringContractUseCase,
    DeleteRecurringContractUseCase,
  ],
})
export class RecurringContractsModule {}
