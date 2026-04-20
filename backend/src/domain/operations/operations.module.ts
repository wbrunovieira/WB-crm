import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { OperationsRepository } from "./application/repositories/operations.repository";
import { TransferToOperationsUseCase, RevertFromOperationsUseCase } from "./application/use-cases/operations.use-cases";
import { PrismaOperationsRepository } from "./infra/repositories/prisma-operations.repository";
import { OperationsController } from "./infra/controllers/operations.controller";

@Module({
  imports: [AuthModule],
  controllers: [OperationsController],
  providers: [
    TransferToOperationsUseCase,
    RevertFromOperationsUseCase,
    { provide: OperationsRepository, useClass: PrismaOperationsRepository },
  ],
})
export class OperationsModule {}
