import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, HttpCode, UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import {
  GetLeadProductsUseCase, AddLeadProductUseCase, UpdateLeadProductUseCase, RemoveLeadProductUseCase,
  GetOrganizationProductsUseCase, AddOrganizationProductUseCase, UpdateOrganizationProductUseCase, RemoveOrganizationProductUseCase,
  GetDealProductsUseCase, AddDealProductUseCase, UpdateDealProductUseCase, RemoveDealProductUseCase,
  GetPartnerProductsUseCase, AddPartnerProductUseCase, UpdatePartnerProductUseCase, RemovePartnerProductUseCase,
} from "../../application/use-cases/product-links.use-cases";
import type { LeadProductData, OrganizationProductData, DealProductData, PartnerProductData } from "../../application/repositories/product-links.repository";

@ApiTags("product-links")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ProductLinksController {
  constructor(
    private readonly getLeadProducts: GetLeadProductsUseCase,
    private readonly addLeadProduct: AddLeadProductUseCase,
    private readonly updateLeadProduct: UpdateLeadProductUseCase,
    private readonly removeLeadProduct: RemoveLeadProductUseCase,
    private readonly getOrgProducts: GetOrganizationProductsUseCase,
    private readonly addOrgProduct: AddOrganizationProductUseCase,
    private readonly updateOrgProduct: UpdateOrganizationProductUseCase,
    private readonly removeOrgProduct: RemoveOrganizationProductUseCase,
    private readonly getDealProducts: GetDealProductsUseCase,
    private readonly addDealProduct: AddDealProductUseCase,
    private readonly updateDealProduct: UpdateDealProductUseCase,
    private readonly removeDealProduct: RemoveDealProductUseCase,
    private readonly getPartnerProducts: GetPartnerProductsUseCase,
    private readonly addPartnerProduct: AddPartnerProductUseCase,
    private readonly updatePartnerProduct: UpdatePartnerProductUseCase,
    private readonly removePartnerProduct: RemovePartnerProductUseCase,
  ) {}

  // ── Lead ────────────────────────────────────────────────────────────────
  @Get("leads/:leadId/products")
  async listLeadProducts(@Param("leadId") leadId: string) {
    return (await this.getLeadProducts.execute(leadId)).unwrap().products;
  }

  @Post("leads/:leadId/products/:productId")
  @HttpCode(204)
  async addToLead(@Param("leadId") leadId: string, @Param("productId") productId: string, @Body() body: LeadProductData) {
    await this.addLeadProduct.execute(leadId, productId, body);
  }

  @Patch("leads/:leadId/products/:productId")
  @HttpCode(204)
  async updateLead(@Param("leadId") leadId: string, @Param("productId") productId: string, @Body() body: LeadProductData) {
    await this.updateLeadProduct.execute(leadId, productId, body);
  }

  @Delete("leads/:leadId/products/:productId")
  @HttpCode(204)
  async removeFromLead(@Param("leadId") leadId: string, @Param("productId") productId: string) {
    await this.removeLeadProduct.execute(leadId, productId);
  }

  // ── Organization ─────────────────────────────────────────────────────────
  @Get("organizations/:orgId/products")
  async listOrgProducts(@Param("orgId") orgId: string) {
    return (await this.getOrgProducts.execute(orgId)).unwrap().products;
  }

  @Post("organizations/:orgId/products/:productId")
  @HttpCode(204)
  async addToOrg(@Param("orgId") orgId: string, @Param("productId") productId: string, @Body() body: OrganizationProductData) {
    await this.addOrgProduct.execute(orgId, productId, body);
  }

  @Patch("organizations/:orgId/products/:productId")
  @HttpCode(204)
  async updateOrg(@Param("orgId") orgId: string, @Param("productId") productId: string, @Body() body: OrganizationProductData) {
    await this.updateOrgProduct.execute(orgId, productId, body);
  }

  @Delete("organizations/:orgId/products/:productId")
  @HttpCode(204)
  async removeFromOrg(@Param("orgId") orgId: string, @Param("productId") productId: string) {
    await this.removeOrgProduct.execute(orgId, productId);
  }

  // ── Deal ─────────────────────────────────────────────────────────────────
  @Get("deals/:dealId/products")
  async listDealProducts(@Param("dealId") dealId: string) {
    return (await this.getDealProducts.execute(dealId)).unwrap().products;
  }

  @Post("deals/:dealId/products/:productId")
  @HttpCode(204)
  async addToDeal(@Param("dealId") dealId: string, @Param("productId") productId: string, @Body() body: DealProductData) {
    await this.addDealProduct.execute(dealId, productId, body);
  }

  @Patch("deals/:dealId/products/:productId")
  @HttpCode(204)
  async updateDeal(@Param("dealId") dealId: string, @Param("productId") productId: string, @Body() body: Partial<DealProductData>) {
    await this.updateDealProduct.execute(dealId, productId, body);
  }

  @Delete("deals/:dealId/products/:productId")
  @HttpCode(204)
  async removeFromDeal(@Param("dealId") dealId: string, @Param("productId") productId: string) {
    await this.removeDealProduct.execute(dealId, productId);
  }

  // ── Partner ───────────────────────────────────────────────────────────────
  @Get("partners/:partnerId/products")
  async listPartnerProducts(@Param("partnerId") partnerId: string) {
    return (await this.getPartnerProducts.execute(partnerId)).unwrap().products;
  }

  @Post("partners/:partnerId/products/:productId")
  @HttpCode(204)
  async addToPartner(@Param("partnerId") partnerId: string, @Param("productId") productId: string, @Body() body: PartnerProductData) {
    await this.addPartnerProduct.execute(partnerId, productId, body);
  }

  @Patch("partners/:partnerId/products/:productId")
  @HttpCode(204)
  async updatePartner(@Param("partnerId") partnerId: string, @Param("productId") productId: string, @Body() body: PartnerProductData) {
    await this.updatePartnerProduct.execute(partnerId, productId, body);
  }

  @Delete("partners/:partnerId/products/:productId")
  @HttpCode(204)
  async removeFromPartner(@Param("partnerId") partnerId: string, @Param("productId") productId: string) {
    await this.removePartnerProduct.execute(partnerId, productId);
  }
}
