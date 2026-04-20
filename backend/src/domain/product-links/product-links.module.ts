import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { ProductLinksRepository } from "./application/repositories/product-links.repository";
import {
  GetLeadProductsUseCase, AddLeadProductUseCase, UpdateLeadProductUseCase, RemoveLeadProductUseCase,
  GetOrganizationProductsUseCase, AddOrganizationProductUseCase, UpdateOrganizationProductUseCase, RemoveOrganizationProductUseCase,
  GetDealProductsUseCase, AddDealProductUseCase, UpdateDealProductUseCase, RemoveDealProductUseCase,
  GetPartnerProductsUseCase, AddPartnerProductUseCase, UpdatePartnerProductUseCase, RemovePartnerProductUseCase,
} from "./application/use-cases/product-links.use-cases";
import { PrismaProductLinksRepository } from "./infra/repositories/prisma-product-links.repository";
import { ProductLinksController } from "./infra/controllers/product-links.controller";

@Module({
  imports: [AuthModule],
  controllers: [ProductLinksController],
  providers: [
    GetLeadProductsUseCase, AddLeadProductUseCase, UpdateLeadProductUseCase, RemoveLeadProductUseCase,
    GetOrganizationProductsUseCase, AddOrganizationProductUseCase, UpdateOrganizationProductUseCase, RemoveOrganizationProductUseCase,
    GetDealProductsUseCase, AddDealProductUseCase, UpdateDealProductUseCase, RemoveDealProductUseCase,
    GetPartnerProductsUseCase, AddPartnerProductUseCase, UpdatePartnerProductUseCase, RemovePartnerProductUseCase,
    { provide: ProductLinksRepository, useClass: PrismaProductLinksRepository },
  ],
})
export class ProductLinksModule {}
