import {
  ProductLinksRepository,
  LeadProductData, LeadProductRecord,
  OrganizationProductData, OrganizationProductRecord,
  DealProductData, DealProductRecord,
  PartnerProductData, PartnerProductRecord,
} from "@/domain/product-links/application/repositories/product-links.repository";

export class FakeProductLinksRepository extends ProductLinksRepository {
  leadProducts: Map<string, Map<string, LeadProductData & { productName: string }>> = new Map();
  orgProducts: Map<string, Map<string, OrganizationProductData & { productName: string }>> = new Map();
  dealProducts: Map<string, Map<string, DealProductData & { status: string; productName: string }>> = new Map();
  partnerProducts: Map<string, Map<string, PartnerProductData & { productName: string }>> = new Map();

  async getLeadProducts(leadId: string): Promise<LeadProductRecord[]> {
    const map = this.leadProducts.get(leadId) ?? new Map();
    return Array.from(map.entries()).map(([productId, d]) => ({ id: `lp-${leadId}-${productId}`, leadId, productId, createdAt: new Date(), updatedAt: new Date(), ...d }));
  }
  async addToLead(leadId: string, productId: string, data?: LeadProductData): Promise<void> {
    if (!this.leadProducts.has(leadId)) this.leadProducts.set(leadId, new Map());
    this.leadProducts.get(leadId)!.set(productId, { productName: "Product", ...data });
  }
  async updateLeadProduct(leadId: string, productId: string, data: LeadProductData): Promise<void> {
    const existing = this.leadProducts.get(leadId)?.get(productId) ?? { productName: "Product" };
    this.leadProducts.get(leadId)!.set(productId, { ...existing, ...data });
  }
  async removeFromLead(leadId: string, productId: string): Promise<void> {
    this.leadProducts.get(leadId)?.delete(productId);
  }

  async getOrganizationProducts(organizationId: string): Promise<OrganizationProductRecord[]> {
    const map = this.orgProducts.get(organizationId) ?? new Map();
    return Array.from(map.entries()).map(([productId, d]) => ({ id: `op-${organizationId}-${productId}`, organizationId, productId, createdAt: new Date(), updatedAt: new Date(), ...d }));
  }
  async addToOrganization(organizationId: string, productId: string, data?: OrganizationProductData): Promise<void> {
    if (!this.orgProducts.has(organizationId)) this.orgProducts.set(organizationId, new Map());
    this.orgProducts.get(organizationId)!.set(productId, { productName: "Product", ...data });
  }
  async updateOrganizationProduct(organizationId: string, productId: string, data: OrganizationProductData): Promise<void> {
    const existing = this.orgProducts.get(organizationId)?.get(productId) ?? { productName: "Product" };
    this.orgProducts.get(organizationId)!.set(productId, { ...existing, ...data });
  }
  async removeFromOrganization(organizationId: string, productId: string): Promise<void> {
    this.orgProducts.get(organizationId)?.delete(productId);
  }

  async getDealProducts(dealId: string): Promise<DealProductRecord[]> {
    const map = this.dealProducts.get(dealId) ?? new Map();
    return Array.from(map.entries()).map(([productId, d]) => ({ id: `dp-${dealId}-${productId}`, dealId, productId, createdAt: new Date(), updatedAt: new Date(), ...d }));
  }
  async addToDeal(dealId: string, productId: string, data: DealProductData): Promise<void> {
    if (!this.dealProducts.has(dealId)) this.dealProducts.set(dealId, new Map());
    this.dealProducts.get(dealId)!.set(productId, { productName: "Product", status: "active", ...data });
  }
  async updateDealProduct(dealId: string, productId: string, data: Partial<DealProductData>): Promise<void> {
    const existing = this.dealProducts.get(dealId)?.get(productId) ?? { productName: "Product", status: "active", unitPrice: 0, totalValue: 0 };
    this.dealProducts.get(dealId)!.set(productId, { ...existing, ...data });
  }
  async removeDealProduct(dealId: string, productId: string): Promise<void> {
    this.dealProducts.get(dealId)?.delete(productId);
  }

  async getPartnerProducts(partnerId: string): Promise<PartnerProductRecord[]> {
    const map = this.partnerProducts.get(partnerId) ?? new Map();
    return Array.from(map.entries()).map(([productId, d]) => ({ id: `pp-${partnerId}-${productId}`, partnerId, productId, createdAt: new Date(), updatedAt: new Date(), ...d }));
  }
  async addToPartner(partnerId: string, productId: string, data?: PartnerProductData): Promise<void> {
    if (!this.partnerProducts.has(partnerId)) this.partnerProducts.set(partnerId, new Map());
    this.partnerProducts.get(partnerId)!.set(productId, { productName: "Product", ...data });
  }
  async updatePartnerProduct(partnerId: string, productId: string, data: PartnerProductData): Promise<void> {
    const existing = this.partnerProducts.get(partnerId)?.get(productId) ?? { productName: "Product" };
    this.partnerProducts.get(partnerId)!.set(productId, { ...existing, ...data });
  }
  async removeFromPartner(partnerId: string, productId: string): Promise<void> {
    this.partnerProducts.get(partnerId)?.delete(productId);
  }
}
