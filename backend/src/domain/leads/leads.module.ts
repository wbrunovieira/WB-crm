import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { LeadsRepository } from "./application/repositories/leads.repository";
import { LeadContactsRepository } from "./application/repositories/lead-contacts.repository";
import { GetLeadsUseCase } from "./application/use-cases/get-leads.use-case";
import { GetLeadByIdUseCase } from "./application/use-cases/get-lead-by-id.use-case";
import { CreateLeadUseCase } from "./application/use-cases/create-lead.use-case";
import { UpdateLeadUseCase } from "./application/use-cases/update-lead.use-case";
import { DeleteLeadUseCase } from "./application/use-cases/delete-lead.use-case";
import { ArchiveLeadUseCase } from "./application/use-cases/archive-lead.use-case";
import { UnarchiveLeadUseCase } from "./application/use-cases/unarchive-lead.use-case";
import { QualifyLeadUseCase } from "./application/use-cases/qualify-lead.use-case";
import { BulkArchiveLeadsUseCase } from "./application/use-cases/bulk-archive-leads.use-case";
import {
  GetLeadContactsUseCase,
  CreateLeadContactUseCase,
  UpdateLeadContactUseCase,
  DeleteLeadContactUseCase,
  ToggleLeadContactActiveUseCase,
} from "./application/use-cases/lead-contacts.use-cases";
import {
  UpdateLeadActivityOrderUseCase,
  ResetLeadActivityOrderUseCase,
} from "./application/use-cases/update-lead-activity-order.use-case";
import { GetLeadsForSelectUseCase } from "./application/use-cases/get-leads-for-select.use-case";
import { PrismaLeadsRepository } from "@/infra/database/prisma/repositories/leads/prisma-leads.repository";
import { PrismaLeadContactsRepository } from "@/infra/database/prisma/repositories/leads/prisma-lead-contacts.repository";
import { LeadsController } from "@/infra/controllers/leads.controller";

@Module({
  imports: [AuthModule],
  controllers: [LeadsController],
  providers: [
    { provide: LeadsRepository, useClass: PrismaLeadsRepository },
    { provide: LeadContactsRepository, useClass: PrismaLeadContactsRepository },
    GetLeadsUseCase,
    GetLeadByIdUseCase,
    CreateLeadUseCase,
    UpdateLeadUseCase,
    DeleteLeadUseCase,
    ArchiveLeadUseCase,
    UnarchiveLeadUseCase,
    QualifyLeadUseCase,
    BulkArchiveLeadsUseCase,
    GetLeadContactsUseCase,
    CreateLeadContactUseCase,
    UpdateLeadContactUseCase,
    DeleteLeadContactUseCase,
    ToggleLeadContactActiveUseCase,
    UpdateLeadActivityOrderUseCase,
    ResetLeadActivityOrderUseCase,
    GetLeadsForSelectUseCase,
  ],
  exports: [LeadsRepository, LeadContactsRepository],
})
export class LeadsModule {}
