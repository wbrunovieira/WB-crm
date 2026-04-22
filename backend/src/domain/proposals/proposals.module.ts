import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { ProposalsRepository } from "./application/repositories/proposals.repository";
import {
  GetProposalsUseCase, GetProposalByIdUseCase,
  CreateProposalUseCase, UpdateProposalUseCase, DeleteProposalUseCase,
} from "./application/use-cases/proposals.use-cases";
import { PrismaProposalsRepository } from "./infra/repositories/prisma-proposals.repository";
import { ProposalsController } from "./infra/controllers/proposals.controller";
import { ProposalsFileController } from "./infra/controllers/proposals-file.controller";

@Module({
  imports: [AuthModule],
  controllers: [ProposalsController, ProposalsFileController],
  providers: [
    GetProposalsUseCase, GetProposalByIdUseCase,
    CreateProposalUseCase, UpdateProposalUseCase, DeleteProposalUseCase,
    { provide: ProposalsRepository, useClass: PrismaProposalsRepository },
  ],
})
export class ProposalsModule {}
