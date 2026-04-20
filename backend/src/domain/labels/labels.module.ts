import { Module } from "@nestjs/common";
import { LabelsRepository } from "./application/repositories/labels.repository";
import {
  GetLabelsUseCase,
  CreateLabelUseCase,
  UpdateLabelUseCase,
  DeleteLabelUseCase,
} from "./application/use-cases/labels.use-cases";
import { PrismaLabelsRepository } from "@/infra/database/prisma/repositories/labels/prisma-labels.repository";
import { LabelsController } from "@/infra/controllers/labels.controller";

@Module({
  controllers: [LabelsController],
  providers: [
    GetLabelsUseCase,
    CreateLabelUseCase,
    UpdateLabelUseCase,
    DeleteLabelUseCase,
    { provide: LabelsRepository, useClass: PrismaLabelsRepository },
  ],
  exports: [LabelsRepository],
})
export class LabelsModule {}
