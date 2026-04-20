import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import {
  ProductLinksRepository,
  LeadProductData, LeadProductRecord,
  OrganizationProductData, OrganizationProductRecord,
  DealProductData, DealProductRecord,
  PartnerProductData, PartnerProductRecord,
} from "../../application/repositories/product-links.repository";

@Injectable()
export class PrismaProductLinksRepository extends ProductLinksRepository {
  constructor(private readonly prisma: PrismaService) { super(); }

  async getLeadProducts(leadId: string): Promise<LeadProductRecord[]> {
    const rows = await this.prisma.leadProduct.findMany({ where: { leadId }, include: { product: { select: { name: true } } } });
    return rows.map((r) => ({ id: r.id, leadId: r.leadId, productId: r.productId, productName: r.product.name, interestLevel: r.interestLevel ?? undefined, estimatedValue: r.estimatedValue ?? undefined, notes: r.notes ?? undefined, createdAt: r.createdAt, updatedAt: r.updatedAt }));
  }

  async addToLead(leadId: string, productId: string, data?: LeadProductData): Promise<void> {
    await this.prisma.leadProduct.upsert({
      where: { leadId_productId: { leadId, productId } },
      create: { leadId, productId, interestLevel: data?.interestLevel, estimatedValue: data?.estimatedValue, notes: data?.notes },
      update: { interestLevel: data?.interestLevel, estimatedValue: data?.estimatedValue, notes: data?.notes },
    });
  }

  async updateLeadProduct(leadId: string, productId: string, data: LeadProductData): Promise<void> {
    await this.prisma.leadProduct.update({
      where: { leadId_productId: { leadId, productId } },
      data: { interestLevel: data.interestLevel, estimatedValue: data.estimatedValue, notes: data.notes },
    });
  }

  async removeFromLead(leadId: string, productId: string): Promise<void> {
    await this.prisma.leadProduct.deleteMany({ where: { leadId, productId } });
  }

  async getOrganizationProducts(organizationId: string): Promise<OrganizationProductRecord[]> {
    const rows = await this.prisma.organizationProduct.findMany({ where: { organizationId }, include: { product: { select: { name: true } } } });
    return rows.map((r) => ({ id: r.id, organizationId: r.organizationId, productId: r.productId, productName: r.product.name, status: r.status, firstPurchaseAt: r.firstPurchaseAt ?? undefined, lastPurchaseAt: r.lastPurchaseAt ?? undefined, totalPurchases: r.totalPurchases, totalRevenue: r.totalRevenue, notes: r.notes ?? undefined, createdAt: r.createdAt, updatedAt: r.updatedAt }));
  }

  async addToOrganization(organizationId: string, productId: string, data?: OrganizationProductData): Promise<void> {
    await this.prisma.organizationProduct.upsert({
      where: { organizationId_productId: { organizationId, productId } },
      create: { organizationId, productId, status: data?.status ?? "interested", firstPurchaseAt: data?.firstPurchaseAt, lastPurchaseAt: data?.lastPurchaseAt, totalPurchases: data?.totalPurchases, totalRevenue: data?.totalRevenue, notes: data?.notes },
      update: { status: data?.status, firstPurchaseAt: data?.firstPurchaseAt, lastPurchaseAt: data?.lastPurchaseAt, totalPurchases: data?.totalPurchases, totalRevenue: data?.totalRevenue, notes: data?.notes },
    });
  }

  async updateOrganizationProduct(organizationId: string, productId: string, data: OrganizationProductData): Promise<void> {
    await this.prisma.organizationProduct.update({
      where: { organizationId_productId: { organizationId, productId } },
      data: { status: data.status, firstPurchaseAt: data.firstPurchaseAt, lastPurchaseAt: data.lastPurchaseAt, totalPurchases: data.totalPurchases, totalRevenue: data.totalRevenue, notes: data.notes },
    });
  }

  async removeFromOrganization(organizationId: string, productId: string): Promise<void> {
    await this.prisma.organizationProduct.deleteMany({ where: { organizationId, productId } });
  }

  async getDealProducts(dealId: string): Promise<DealProductRecord[]> {
    const rows = await this.prisma.dealProduct.findMany({ where: { dealId }, include: { product: { select: { name: true } } } });
    return rows.map((r) => ({ id: r.id, dealId: r.dealId, productId: r.productId, productName: r.product.name, quantity: r.quantity, unitPrice: r.unitPrice, discount: r.discount, totalValue: r.totalValue, status: r.status, removedAt: r.removedAt, description: r.description ?? undefined, deliveryTime: r.deliveryTime ?? undefined, createdAt: r.createdAt, updatedAt: r.updatedAt }));
  }

  async addToDeal(dealId: string, productId: string, data: DealProductData): Promise<void> {
    await this.prisma.dealProduct.upsert({
      where: { dealId_productId: { dealId, productId } },
      create: { dealId, productId, quantity: data.quantity ?? 1, unitPrice: data.unitPrice, discount: data.discount ?? 0, totalValue: data.totalValue, description: data.description, deliveryTime: data.deliveryTime },
      update: { quantity: data.quantity, unitPrice: data.unitPrice, discount: data.discount, totalValue: data.totalValue, description: data.description, deliveryTime: data.deliveryTime },
    });
  }

  async updateDealProduct(dealId: string, productId: string, data: Partial<DealProductData>): Promise<void> {
    await this.prisma.dealProduct.update({
      where: { dealId_productId: { dealId, productId } },
      data: { quantity: data.quantity, unitPrice: data.unitPrice, discount: data.discount, totalValue: data.totalValue, description: data.description, deliveryTime: data.deliveryTime },
    });
  }

  async removeDealProduct(dealId: string, productId: string): Promise<void> {
    await this.prisma.dealProduct.update({
      where: { dealId_productId: { dealId, productId } },
      data: { status: "removed", removedAt: new Date() },
    });
  }

  async getPartnerProducts(partnerId: string): Promise<PartnerProductRecord[]> {
    const rows = await this.prisma.partnerProduct.findMany({ where: { partnerId }, include: { product: { select: { name: true } } } });
    return rows.map((r) => ({ id: r.id, partnerId: r.partnerId, productId: r.productId, productName: r.product.name, expertiseLevel: r.expertiseLevel ?? undefined, canRefer: r.canRefer, canDeliver: r.canDeliver, commissionType: r.commissionType ?? undefined, commissionValue: r.commissionValue ?? undefined, notes: r.notes ?? undefined, createdAt: r.createdAt, updatedAt: r.updatedAt }));
  }

  async addToPartner(partnerId: string, productId: string, data?: PartnerProductData): Promise<void> {
    await this.prisma.partnerProduct.upsert({
      where: { partnerId_productId: { partnerId, productId } },
      create: { partnerId, productId, expertiseLevel: data?.expertiseLevel, canRefer: data?.canRefer ?? true, canDeliver: data?.canDeliver ?? false, commissionType: data?.commissionType, commissionValue: data?.commissionValue, notes: data?.notes },
      update: { expertiseLevel: data?.expertiseLevel, canRefer: data?.canRefer, canDeliver: data?.canDeliver, commissionType: data?.commissionType, commissionValue: data?.commissionValue, notes: data?.notes },
    });
  }

  async updatePartnerProduct(partnerId: string, productId: string, data: PartnerProductData): Promise<void> {
    await this.prisma.partnerProduct.update({
      where: { partnerId_productId: { partnerId, productId } },
      data: { expertiseLevel: data.expertiseLevel, canRefer: data.canRefer, canDeliver: data.canDeliver, commissionType: data.commissionType, commissionValue: data.commissionValue, notes: data.notes },
    });
  }

  async removeFromPartner(partnerId: string, productId: string): Promise<void> {
    await this.prisma.partnerProduct.deleteMany({ where: { partnerId, productId } });
  }
}
