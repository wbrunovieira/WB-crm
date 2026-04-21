import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { SharedEntitiesRepository } from "./application/repositories/shared-entities.repository";
import { PrismaSharedEntitiesRepository } from "@/infra/database/prisma/repositories/shared-entities/prisma-shared-entities.repository";
import { SharedEntitiesController } from "@/infra/controllers/shared-entities.controller";
import {
  ShareEntityUseCase,
  UnshareEntityUseCase,
  GetEntitySharesUseCase,
  GetBatchEntitySharesUseCase,
  GetAvailableUsersForSharingUseCase,
  TransferEntityUseCase,
} from "./application/use-cases/shared-entities.use-cases";

@Module({
  imports: [AuthModule],
  controllers: [SharedEntitiesController],
  providers: [
    { provide: SharedEntitiesRepository, useClass: PrismaSharedEntitiesRepository },
    ShareEntityUseCase,
    UnshareEntityUseCase,
    GetEntitySharesUseCase,
    GetBatchEntitySharesUseCase,
    GetAvailableUsersForSharingUseCase,
    TransferEntityUseCase,
  ],
  exports: [SharedEntitiesRepository],
})
export class SharedEntitiesModule {}
