import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { OrganizationsRepository } from "./application/repositories/organizations.repository";
import { GetOrganizationsUseCase } from "./application/use-cases/get-organizations.use-case";
import { GetOrganizationByIdUseCase } from "./application/use-cases/get-organization-by-id.use-case";
import { CreateOrganizationUseCase } from "./application/use-cases/create-organization.use-case";
import { UpdateOrganizationUseCase } from "./application/use-cases/update-organization.use-case";
import { DeleteOrganizationUseCase } from "./application/use-cases/delete-organization.use-case";
import { LinkExternalProjectUseCase, UnlinkExternalProjectUseCase } from "./application/use-cases/link-external-project.use-case";
import { PrismaOrganizationsRepository } from "@/infra/database/prisma/repositories/organizations/prisma-organizations.repository";
import { OrganizationsController } from "@/infra/controllers/organizations.controller";

@Module({
  imports: [AuthModule],
  controllers: [OrganizationsController],
  providers: [
    { provide: OrganizationsRepository, useClass: PrismaOrganizationsRepository },
    GetOrganizationsUseCase,
    GetOrganizationByIdUseCase,
    CreateOrganizationUseCase,
    UpdateOrganizationUseCase,
    DeleteOrganizationUseCase,
    LinkExternalProjectUseCase,
    UnlinkExternalProjectUseCase,
  ],
  exports: [OrganizationsRepository],
})
export class OrganizationsModule {}
