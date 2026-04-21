import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { CnaeRepository } from "./application/repositories/cnae.repository";
import {
  SearchCnaesUseCase,
  GetCnaeByIdUseCase,
  ListSecondaryCnaesForLeadUseCase,
  ListSecondaryCnaesForOrganizationUseCase,
  AddSecondaryCnaeToLeadUseCase,
  RemoveSecondaryCnaeFromLeadUseCase,
  AddSecondaryCnaeToOrganizationUseCase,
  RemoveSecondaryCnaeFromOrganizationUseCase,
} from "./application/use-cases/cnae.use-cases";
import { PrismaCnaeRepository } from "./infra/repositories/prisma-cnae.repository";
import { CnaeController } from "./infra/controllers/cnae.controller";

@Module({
  imports: [AuthModule],
  controllers: [CnaeController],
  providers: [
    SearchCnaesUseCase,
    GetCnaeByIdUseCase,
    ListSecondaryCnaesForLeadUseCase,
    ListSecondaryCnaesForOrganizationUseCase,
    AddSecondaryCnaeToLeadUseCase,
    RemoveSecondaryCnaeFromLeadUseCase,
    AddSecondaryCnaeToOrganizationUseCase,
    RemoveSecondaryCnaeFromOrganizationUseCase,
    { provide: CnaeRepository, useClass: PrismaCnaeRepository },
  ],
})
export class CnaeModule {}
