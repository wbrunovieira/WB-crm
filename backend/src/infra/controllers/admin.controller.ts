import {
  Body, Controller, Delete, Get, HttpCode,
  NotFoundException, Param, Patch, Post, Query,
  UnprocessableEntityException, UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth, ApiBody, ApiOperation, ApiParam,
  ApiQuery, ApiResponse, ApiTags, ApiProperty, ApiPropertyOptional,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { Left } from "@/core/either";
import { TECH_OPTION_TYPES, type TechOptionType } from "@/domain/admin/enterprise/entities/admin-tech-option";

import { ListBusinessLinesUseCase, CreateBusinessLineUseCase, UpdateBusinessLineUseCase, DeleteBusinessLineUseCase, ToggleBusinessLineUseCase } from "@/domain/admin/application/use-cases/business-line.use-cases";
import { ListProductsUseCase, CreateProductUseCase, UpdateProductUseCase, DeleteProductUseCase, ToggleProductUseCase } from "@/domain/admin/application/use-cases/product.use-cases";
import { ListTechOptionsUseCase, CreateTechOptionUseCase, UpdateTechOptionUseCase, DeleteTechOptionUseCase, ToggleTechOptionUseCase } from "@/domain/admin/application/use-cases/tech-option.use-cases";

/* ─── DTOs ───────────────────────────────────────────────────────────────── */

class BusinessLineDto {
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() color?: string;
  @ApiPropertyOptional() icon?: string;
  @ApiPropertyOptional() isActive?: boolean;
  @ApiPropertyOptional() order?: number;
}

class UpdateBusinessLineDto {
  @ApiPropertyOptional() name?: string;
  @ApiPropertyOptional() slug?: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() color?: string;
  @ApiPropertyOptional() icon?: string;
  @ApiPropertyOptional() order?: number;
}

class ProductDto {
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() businessLineId!: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() basePrice?: number;
  @ApiPropertyOptional() currency?: string;
  @ApiPropertyOptional() pricingType?: string;
  @ApiPropertyOptional() isActive?: boolean;
  @ApiPropertyOptional() order?: number;
}

class UpdateProductDto {
  @ApiPropertyOptional() name?: string;
  @ApiPropertyOptional() slug?: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() businessLineId?: string;
  @ApiPropertyOptional() basePrice?: number;
  @ApiPropertyOptional() currency?: string;
  @ApiPropertyOptional() pricingType?: string;
  @ApiPropertyOptional() order?: number;
}

class TechOptionDto {
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() color?: string;
  @ApiPropertyOptional() icon?: string;
  @ApiPropertyOptional() order?: number;
  @ApiPropertyOptional() isActive?: boolean;
  @ApiPropertyOptional() languageSlug?: string;
  @ApiPropertyOptional() subType?: string;
}

class UpdateTechOptionDto {
  @ApiPropertyOptional() name?: string;
  @ApiPropertyOptional() slug?: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() color?: string;
  @ApiPropertyOptional() icon?: string;
  @ApiPropertyOptional() order?: number;
  @ApiPropertyOptional() languageSlug?: string;
  @ApiPropertyOptional() subType?: string;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function handleError(err: Left<Error, unknown>): never {
  const msg = err.value.message;
  if (msg.includes("não encontrado") || msg.includes("não encontrada")) throw new NotFoundException(msg);
  throw new UnprocessableEntityException(msg);
}

function serializeBL(bl: import("@/domain/admin/enterprise/entities/business-line").BusinessLine) {
  return { id: bl.id.toString(), name: bl.name, slug: bl.slug, description: bl.description, color: bl.color, icon: bl.icon, isActive: bl.isActive, order: bl.order, createdAt: bl.createdAt, updatedAt: bl.updatedAt };
}

function serializeProduct(p: import("@/domain/admin/enterprise/entities/product").Product) {
  return { id: p.id.toString(), name: p.name, slug: p.slug, description: p.description, businessLineId: p.businessLineId, basePrice: p.basePrice, currency: p.currency, pricingType: p.pricingType, isActive: p.isActive, order: p.order, createdAt: p.createdAt, updatedAt: p.updatedAt };
}

function serializeTechOption(opt: import("@/domain/admin/enterprise/entities/admin-tech-option").AdminTechOption) {
  return { id: opt.id.toString(), name: opt.name, slug: opt.slug, description: opt.description, color: opt.color, icon: opt.icon, order: opt.order, isActive: opt.isActive, languageSlug: opt.languageSlug, subType: opt.subType, createdAt: opt.createdAt, updatedAt: opt.updatedAt };
}

function validateTechType(type: string): TechOptionType {
  if (!TECH_OPTION_TYPES.includes(type as TechOptionType)) {
    throw new UnprocessableEntityException(`Tipo inválido: ${type}. Use: ${TECH_OPTION_TYPES.join(", ")}`);
  }
  return type as TechOptionType;
}

/* ─── Controller ─────────────────────────────────────────────────────────── */

@ApiTags("Admin")
@ApiBearerAuth("JWT")
@Controller("admin")
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(
    private readonly listBusinessLines: ListBusinessLinesUseCase,
    private readonly createBusinessLine: CreateBusinessLineUseCase,
    private readonly updateBusinessLine: UpdateBusinessLineUseCase,
    private readonly deleteBusinessLine: DeleteBusinessLineUseCase,
    private readonly toggleBusinessLine: ToggleBusinessLineUseCase,

    private readonly listProducts: ListProductsUseCase,
    private readonly createProduct: CreateProductUseCase,
    private readonly updateProduct: UpdateProductUseCase,
    private readonly deleteProduct: DeleteProductUseCase,
    private readonly toggleProduct: ToggleProductUseCase,

    private readonly listTechOptions: ListTechOptionsUseCase,
    private readonly createTechOption: CreateTechOptionUseCase,
    private readonly updateTechOption: UpdateTechOptionUseCase,
    private readonly deleteTechOption: DeleteTechOptionUseCase,
    private readonly toggleTechOption: ToggleTechOptionUseCase,
  ) {}

  // ─── BusinessLines ───────────────────────────────────────────────────────

  @Get("business-lines")
  @ApiOperation({ summary: "Listar linhas de negócio" })
  async getBLs() {
    const result = await this.listBusinessLines.execute();
    return (result.value as { items: unknown[] }).items.map(serializeBL as never);
  }

  @Post("business-lines")
  @HttpCode(201)
  @ApiOperation({ summary: "Criar linha de negócio" })
  @ApiBody({ type: BusinessLineDto })
  async createBL(@Body() body: BusinessLineDto) {
    const result = await this.createBusinessLine.execute(body);
    if (result.isLeft()) handleError(result);
    return serializeBL((result.value as { item: import("@/domain/admin/enterprise/entities/business-line").BusinessLine }).item);
  }

  @Patch("business-lines/:id")
  @ApiOperation({ summary: "Atualizar linha de negócio" })
  @ApiParam({ name: "id" })
  async updateBL(@Param("id") id: string, @Body() body: UpdateBusinessLineDto) {
    const result = await this.updateBusinessLine.execute({ id, ...body });
    if (result.isLeft()) handleError(result);
    return serializeBL((result.value as { item: import("@/domain/admin/enterprise/entities/business-line").BusinessLine }).item);
  }

  @Delete("business-lines/:id")
  @HttpCode(204)
  @ApiOperation({ summary: "Excluir linha de negócio" })
  async deleteBL(@Param("id") id: string) {
    const result = await this.deleteBusinessLine.execute(id);
    if (result.isLeft()) handleError(result);
  }

  @Patch("business-lines/:id/toggle")
  @ApiOperation({ summary: "Ativar/desativar linha de negócio" })
  async toggleBL(@Param("id") id: string) {
    const result = await this.toggleBusinessLine.execute(id);
    if (result.isLeft()) handleError(result);
    return serializeBL((result.value as { item: import("@/domain/admin/enterprise/entities/business-line").BusinessLine }).item);
  }

  // ─── Products ────────────────────────────────────────────────────────────

  @Get("products")
  @ApiOperation({ summary: "Listar produtos" })
  @ApiQuery({ name: "businessLineId", required: false })
  async getProducts(@Query("businessLineId") businessLineId?: string) {
    const result = await this.listProducts.execute(businessLineId);
    return (result.value as { items: unknown[] }).items.map(serializeProduct as never);
  }

  @Post("products")
  @HttpCode(201)
  @ApiOperation({ summary: "Criar produto" })
  @ApiBody({ type: ProductDto })
  async createProd(@Body() body: ProductDto) {
    const result = await this.createProduct.execute(body);
    if (result.isLeft()) handleError(result);
    return serializeProduct((result.value as { item: import("@/domain/admin/enterprise/entities/product").Product }).item);
  }

  @Patch("products/:id")
  @ApiOperation({ summary: "Atualizar produto" })
  async updateProd(@Param("id") id: string, @Body() body: UpdateProductDto) {
    const result = await this.updateProduct.execute({ id, ...body });
    if (result.isLeft()) handleError(result);
    return serializeProduct((result.value as { item: import("@/domain/admin/enterprise/entities/product").Product }).item);
  }

  @Delete("products/:id")
  @HttpCode(204)
  @ApiOperation({ summary: "Excluir produto" })
  async deleteProd(@Param("id") id: string) {
    const result = await this.deleteProduct.execute(id);
    if (result.isLeft()) handleError(result);
  }

  @Patch("products/:id/toggle")
  @ApiOperation({ summary: "Ativar/desativar produto" })
  async toggleProd(@Param("id") id: string) {
    const result = await this.toggleProduct.execute(id);
    if (result.isLeft()) handleError(result);
    return serializeProduct((result.value as { item: import("@/domain/admin/enterprise/entities/product").Product }).item);
  }

  // ─── TechOptions ─────────────────────────────────────────────────────────
  // :type = tech-category | tech-language | tech-framework |
  //         profile-language | profile-framework | profile-hosting |
  //         profile-database | profile-erp | profile-crm | profile-ecommerce

  @Get("tech-options/:type")
  @ApiOperation({ summary: "Listar opções de tecnologia por tipo" })
  @ApiParam({ name: "type" })
  async getTechOptions(@Param("type") type: string) {
    const t = validateTechType(type);
    const result = await this.listTechOptions.execute(t);
    return (result.value as { items: unknown[] }).items.map(serializeTechOption as never);
  }

  @Post("tech-options/:type")
  @HttpCode(201)
  @ApiOperation({ summary: "Criar opção de tecnologia" })
  @ApiParam({ name: "type" })
  @ApiBody({ type: TechOptionDto })
  async createTechOpt(@Param("type") type: string, @Body() body: TechOptionDto) {
    const t = validateTechType(type);
    const result = await this.createTechOption.execute({ ...body, type: t });
    if (result.isLeft()) handleError(result);
    return serializeTechOption((result.value as { item: import("@/domain/admin/enterprise/entities/admin-tech-option").AdminTechOption }).item);
  }

  @Patch("tech-options/:type/:id")
  @ApiOperation({ summary: "Atualizar opção de tecnologia" })
  @ApiParam({ name: "type" })
  @ApiParam({ name: "id" })
  async updateTechOpt(@Param("type") type: string, @Param("id") id: string, @Body() body: UpdateTechOptionDto) {
    const t = validateTechType(type);
    const result = await this.updateTechOption.execute({ ...body, type: t, id });
    if (result.isLeft()) handleError(result);
    return serializeTechOption((result.value as { item: import("@/domain/admin/enterprise/entities/admin-tech-option").AdminTechOption }).item);
  }

  @Delete("tech-options/:type/:id")
  @HttpCode(204)
  @ApiOperation({ summary: "Excluir opção de tecnologia" })
  @ApiParam({ name: "type" })
  @ApiParam({ name: "id" })
  async deleteTechOpt(@Param("type") type: string, @Param("id") id: string) {
    const t = validateTechType(type);
    const result = await this.deleteTechOption.execute(t, id);
    if (result.isLeft()) handleError(result);
  }

  @Patch("tech-options/:type/:id/toggle")
  @ApiOperation({ summary: "Ativar/desativar opção de tecnologia" })
  @ApiParam({ name: "type" })
  @ApiParam({ name: "id" })
  async toggleTechOpt(@Param("type") type: string, @Param("id") id: string) {
    const t = validateTechType(type);
    const result = await this.toggleTechOption.execute(t, id);
    if (result.isLeft()) handleError(result);
    return serializeTechOption((result.value as { item: import("@/domain/admin/enterprise/entities/admin-tech-option").AdminTechOption }).item);
  }
}
