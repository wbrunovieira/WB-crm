import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { LabelsRepository } from "./application/repositories/labels.repository";
import {
  GetLabelsUseCase,
  CreateLabelUseCase,
  UpdateLabelUseCase,
  DeleteLabelUseCase,
} from "./application/use-cases/labels.use-cases";
import {
  AddLabelToLeadUseCase,
  RemoveLabelFromLeadUseCase,
  SetLeadLabelsUseCase,
  AddLabelToOrganizationUseCase,
  RemoveLabelFromOrganizationUseCase,
  SetOrganizationLabelsUseCase,
} from "./application/use-cases/label-links.use-cases";
import { PrismaLabelsRepository } from "@/infra/database/prisma/repositories/labels/prisma-labels.repository";
import { LabelsController } from "@/infra/controllers/labels.controller";
import { LeadLabelsController } from "@/infra/controllers/lead-labels.controller";
import { OrganizationLabelsController } from "@/infra/controllers/organization-labels.controller";

@Module({
  imports: [AuthModule],
  controllers: [LabelsController, LeadLabelsController, OrganizationLabelsController],
  providers: [
    GetLabelsUseCase,
    CreateLabelUseCase,
    UpdateLabelUseCase,
    DeleteLabelUseCase,
    AddLabelToLeadUseCase,
    RemoveLabelFromLeadUseCase,
    SetLeadLabelsUseCase,
    AddLabelToOrganizationUseCase,
    RemoveLabelFromOrganizationUseCase,
    SetOrganizationLabelsUseCase,
    { provide: LabelsRepository, useClass: PrismaLabelsRepository },
  ],
  exports: [LabelsRepository],
})
export class LabelsModule {}
