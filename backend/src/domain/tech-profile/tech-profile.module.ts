import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { TechProfileRepository } from "./application/repositories/tech-profile.repository";
import {
  GetTechProfileItemsUseCase, GetLeadTechProfileUseCase,
  AddLeadTechProfileItemUseCase, RemoveLeadTechProfileItemUseCase,
  GetOrganizationTechProfileUseCase, AddOrganizationTechProfileItemUseCase, RemoveOrganizationTechProfileItemUseCase,
} from "./application/use-cases/tech-profile.use-cases";
import { PrismaTechProfileRepository } from "./infra/repositories/prisma-tech-profile.repository";
import { TechProfileController } from "./infra/controllers/tech-profile.controller";

@Module({
  imports: [AuthModule],
  controllers: [TechProfileController],
  providers: [
    GetTechProfileItemsUseCase, GetLeadTechProfileUseCase,
    AddLeadTechProfileItemUseCase, RemoveLeadTechProfileItemUseCase,
    GetOrganizationTechProfileUseCase, AddOrganizationTechProfileItemUseCase, RemoveOrganizationTechProfileItemUseCase,
    { provide: TechProfileRepository, useClass: PrismaTechProfileRepository },
  ],
})
export class TechProfileModule {}
