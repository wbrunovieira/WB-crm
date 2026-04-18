import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { LeadsRepository } from "./application/repositories/leads.repository";
import { GetLeadsUseCase } from "./application/use-cases/get-leads.use-case";
import { GetLeadByIdUseCase } from "./application/use-cases/get-lead-by-id.use-case";
import { CreateLeadUseCase } from "./application/use-cases/create-lead.use-case";
import { UpdateLeadUseCase } from "./application/use-cases/update-lead.use-case";
import { DeleteLeadUseCase } from "./application/use-cases/delete-lead.use-case";
import { ArchiveLeadUseCase } from "./application/use-cases/archive-lead.use-case";
import { UnarchiveLeadUseCase } from "./application/use-cases/unarchive-lead.use-case";
import { PrismaLeadsRepository } from "@/infra/database/prisma/repositories/leads/prisma-leads.repository";
import { LeadsController } from "@/infra/controllers/leads.controller";

@Module({
  imports: [AuthModule],
  controllers: [LeadsController],
  providers: [
    { provide: LeadsRepository, useClass: PrismaLeadsRepository },
    GetLeadsUseCase,
    GetLeadByIdUseCase,
    CreateLeadUseCase,
    UpdateLeadUseCase,
    DeleteLeadUseCase,
    ArchiveLeadUseCase,
    UnarchiveLeadUseCase,
  ],
  exports: [LeadsRepository],
})
export class LeadsModule {}
