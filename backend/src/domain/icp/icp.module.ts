import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { ICPRepository } from "./application/repositories/icp.repository";
import {
  GetICPsUseCase, GetICPByIdUseCase, CreateICPUseCase, UpdateICPUseCase, DeleteICPUseCase,
  GetLeadICPsUseCase, LinkLeadToICPUseCase, UpdateLeadICPUseCase, UnlinkLeadFromICPUseCase,
  GetOrganizationICPsUseCase, LinkOrganizationToICPUseCase, UpdateOrganizationICPUseCase, UnlinkOrganizationFromICPUseCase,
  GetICPVersionsUseCase, RestoreICPVersionUseCase,
} from "./application/use-cases/icp.use-cases";
import { PrismaICPRepository } from "./infra/repositories/prisma-icp.repository";
import { ICPController } from "./infra/controllers/icp.controller";

@Module({
  imports: [AuthModule],
  controllers: [ICPController],
  providers: [
    GetICPsUseCase, GetICPByIdUseCase, CreateICPUseCase, UpdateICPUseCase, DeleteICPUseCase,
    GetLeadICPsUseCase, LinkLeadToICPUseCase, UpdateLeadICPUseCase, UnlinkLeadFromICPUseCase,
    GetOrganizationICPsUseCase, LinkOrganizationToICPUseCase, UpdateOrganizationICPUseCase, UnlinkOrganizationFromICPUseCase,
    GetICPVersionsUseCase, RestoreICPVersionUseCase,
    { provide: ICPRepository, useClass: PrismaICPRepository },
  ],
})
export class ICPModule {}
