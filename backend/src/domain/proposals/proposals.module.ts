import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { LeadsModule } from "@/domain/leads/leads.module";
import { ProposalsRepository } from "./application/repositories/proposals.repository";
import {
  GetProposalsUseCase, GetProposalByIdUseCase,
  CreateProposalUseCase, UpdateProposalUseCase, DeleteProposalUseCase,
} from "./application/use-cases/proposals.use-cases";
import { UploadProposalUseCase } from "./application/use-cases/upload-proposal.use-case";
import { UpdateProposalWithFileUseCase } from "./application/use-cases/update-proposal-with-file.use-case";
import { PrismaProposalsRepository } from "./infra/repositories/prisma-proposals.repository";
import { ProposalsController } from "./infra/controllers/proposals.controller";
import { ProposalsFileController } from "./infra/controllers/proposals-file.controller";

@Module({
  imports: [AuthModule, LeadsModule],
  controllers: [ProposalsController, ProposalsFileController],
  providers: [
    GetProposalsUseCase, GetProposalByIdUseCase,
    CreateProposalUseCase, UpdateProposalUseCase, DeleteProposalUseCase,
    UploadProposalUseCase,
    UpdateProposalWithFileUseCase,
    { provide: ProposalsRepository, useClass: PrismaProposalsRepository },
  ],
  exports: [ProposalsRepository],
})
export class ProposalsModule {}
