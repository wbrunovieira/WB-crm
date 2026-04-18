import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { PipelinesRepository } from "./application/repositories/pipelines.repository";
import { GetPipelinesUseCase } from "./application/use-cases/get-pipelines.use-case";
import { GetPipelineByIdUseCase } from "./application/use-cases/get-pipeline-by-id.use-case";
import { CreatePipelineUseCase } from "./application/use-cases/create-pipeline.use-case";
import { UpdatePipelineUseCase } from "./application/use-cases/update-pipeline.use-case";
import { DeletePipelineUseCase } from "./application/use-cases/delete-pipeline.use-case";
import { SetDefaultPipelineUseCase } from "./application/use-cases/set-default-pipeline.use-case";
import { CreateStageUseCase } from "./application/use-cases/create-stage.use-case";
import { UpdateStageUseCase } from "./application/use-cases/update-stage.use-case";
import { DeleteStageUseCase } from "./application/use-cases/delete-stage.use-case";
import { ReorderStagesUseCase } from "./application/use-cases/reorder-stages.use-case";
import { PrismaPipelinesRepository } from "@/infra/database/prisma/repositories/pipelines/prisma-pipelines.repository";
import { PipelinesController } from "@/infra/controllers/pipelines.controller";

@Module({
  imports: [AuthModule],
  controllers: [PipelinesController],
  providers: [
    { provide: PipelinesRepository, useClass: PrismaPipelinesRepository },
    GetPipelinesUseCase,
    GetPipelineByIdUseCase,
    CreatePipelineUseCase,
    UpdatePipelineUseCase,
    DeletePipelineUseCase,
    SetDefaultPipelineUseCase,
    CreateStageUseCase,
    UpdateStageUseCase,
    DeleteStageUseCase,
    ReorderStagesUseCase,
  ],
  exports: [PipelinesRepository],
})
export class PipelinesModule {}
