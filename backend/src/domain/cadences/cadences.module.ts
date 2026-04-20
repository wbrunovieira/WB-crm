import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { CadencesRepository } from "./application/repositories/cadences.repository";
import {
  CreateCadenceUseCase, UpdateCadenceUseCase, DeleteCadenceUseCase,
  GetCadencesUseCase, GetCadenceByIdUseCase,
  PublishCadenceUseCase, UnpublishCadenceUseCase,
  CreateCadenceStepUseCase, UpdateCadenceStepUseCase, DeleteCadenceStepUseCase,
  ReorderCadenceStepsUseCase, GetCadenceStepsUseCase,
  ApplyCadenceToLeadUseCase, GetLeadCadencesUseCase,
  PauseLeadCadenceUseCase, ResumeLeadCadenceUseCase, CancelLeadCadenceUseCase,
  GetCadenceLeadCountUseCase, BulkApplyCadenceUseCase,
} from "./application/use-cases/cadences.use-cases";
import { PrismaCadencesRepository } from "./infra/repositories/prisma-cadences.repository";
import { CadencesController } from "./infra/controllers/cadences.controller";

@Module({
  imports: [AuthModule],
  controllers: [CadencesController],
  providers: [
    CreateCadenceUseCase, UpdateCadenceUseCase, DeleteCadenceUseCase,
    GetCadencesUseCase, GetCadenceByIdUseCase,
    PublishCadenceUseCase, UnpublishCadenceUseCase,
    CreateCadenceStepUseCase, UpdateCadenceStepUseCase, DeleteCadenceStepUseCase,
    ReorderCadenceStepsUseCase, GetCadenceStepsUseCase,
    ApplyCadenceToLeadUseCase, GetLeadCadencesUseCase,
    PauseLeadCadenceUseCase, ResumeLeadCadenceUseCase, CancelLeadCadenceUseCase,
    GetCadenceLeadCountUseCase,
    BulkApplyCadenceUseCase,
    { provide: CadencesRepository, useClass: PrismaCadencesRepository },
  ],
})
export class CadencesModule {}
