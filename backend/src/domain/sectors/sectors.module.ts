import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { SectorsRepository } from "./application/repositories/sectors.repository";
import {
  GetSectorsUseCase, GetSectorByIdUseCase,
  CreateSectorUseCase, UpdateSectorUseCase, DeleteSectorUseCase,
  LinkSectorToLeadUseCase, UnlinkSectorFromLeadUseCase,
  LinkSectorToOrganizationUseCase, UnlinkSectorFromOrganizationUseCase,
  GetLeadSectorsUseCase, GetOrgSectorsUseCase,
} from "./application/use-cases/sectors.use-cases";
import { PrismaSectorsRepository } from "./infra/repositories/prisma-sectors.repository";
import { SectorsController } from "./infra/controllers/sectors.controller";

@Module({
  imports: [AuthModule],
  controllers: [SectorsController],
  providers: [
    GetSectorsUseCase, GetSectorByIdUseCase,
    CreateSectorUseCase, UpdateSectorUseCase, DeleteSectorUseCase,
    LinkSectorToLeadUseCase, UnlinkSectorFromLeadUseCase,
    LinkSectorToOrganizationUseCase, UnlinkSectorFromOrganizationUseCase,
    GetLeadSectorsUseCase, GetOrgSectorsUseCase,
    { provide: SectorsRepository, useClass: PrismaSectorsRepository },
  ],
})
export class SectorsModule {}
