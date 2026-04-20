import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { AdminRepository } from "./application/repositories/admin.repository";
import { PrismaAdminRepository } from "@/infra/database/prisma/repositories/admin/prisma-admin.repository";
import { AdminController } from "@/infra/controllers/admin.controller";

import {
  ListBusinessLinesUseCase,
  GetBusinessLineByIdUseCase,
  CreateBusinessLineUseCase,
  UpdateBusinessLineUseCase,
  DeleteBusinessLineUseCase,
  ToggleBusinessLineUseCase,
} from "./application/use-cases/business-line.use-cases";

import {
  ListProductsUseCase,
  GetProductByIdUseCase,
  CreateProductUseCase,
  UpdateProductUseCase,
  DeleteProductUseCase,
  ToggleProductUseCase,
} from "./application/use-cases/product.use-cases";

import {
  ListTechOptionsUseCase,
  CreateTechOptionUseCase,
  UpdateTechOptionUseCase,
  DeleteTechOptionUseCase,
  ToggleTechOptionUseCase,
} from "./application/use-cases/tech-option.use-cases";

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [
    { provide: AdminRepository, useClass: PrismaAdminRepository },
    // BusinessLine
    ListBusinessLinesUseCase,
    GetBusinessLineByIdUseCase,
    CreateBusinessLineUseCase,
    UpdateBusinessLineUseCase,
    DeleteBusinessLineUseCase,
    ToggleBusinessLineUseCase,
    // Product
    ListProductsUseCase,
    GetProductByIdUseCase,
    CreateProductUseCase,
    UpdateProductUseCase,
    DeleteProductUseCase,
    ToggleProductUseCase,
    // TechOption
    ListTechOptionsUseCase,
    CreateTechOptionUseCase,
    UpdateTechOptionUseCase,
    DeleteTechOptionUseCase,
    ToggleTechOptionUseCase,
  ],
  exports: [AdminRepository],
})
export class AdminModule {}
