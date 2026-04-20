export interface LeadProductData {
  interestLevel?: string;
  estimatedValue?: number;
  notes?: string;
}

export interface LeadProductRecord extends LeadProductData {
  id: string;
  leadId: string;
  productId: string;
  productName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationProductData {
  status?: string;
  firstPurchaseAt?: Date;
  lastPurchaseAt?: Date;
  totalPurchases?: number;
  totalRevenue?: number;
  notes?: string;
}

export interface OrganizationProductRecord extends OrganizationProductData {
  id: string;
  organizationId: string;
  productId: string;
  productName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DealProductData {
  quantity?: number;
  unitPrice: number;
  discount?: number;
  totalValue: number;
  description?: string;
  deliveryTime?: number;
}

export interface DealProductRecord extends DealProductData {
  id: string;
  dealId: string;
  productId: string;
  productName: string;
  status: string;
  removedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PartnerProductData {
  expertiseLevel?: string;
  canRefer?: boolean;
  canDeliver?: boolean;
  commissionType?: string;
  commissionValue?: number;
  notes?: string;
}

export interface PartnerProductRecord extends PartnerProductData {
  id: string;
  partnerId: string;
  productId: string;
  productName: string;
  createdAt: Date;
  updatedAt: Date;
}

export abstract class ProductLinksRepository {
  abstract getLeadProducts(leadId: string): Promise<LeadProductRecord[]>;
  abstract addToLead(leadId: string, productId: string, data?: LeadProductData): Promise<void>;
  abstract updateLeadProduct(leadId: string, productId: string, data: LeadProductData): Promise<void>;
  abstract removeFromLead(leadId: string, productId: string): Promise<void>;

  abstract getOrganizationProducts(organizationId: string): Promise<OrganizationProductRecord[]>;
  abstract addToOrganization(organizationId: string, productId: string, data?: OrganizationProductData): Promise<void>;
  abstract updateOrganizationProduct(organizationId: string, productId: string, data: OrganizationProductData): Promise<void>;
  abstract removeFromOrganization(organizationId: string, productId: string): Promise<void>;

  abstract getDealProducts(dealId: string): Promise<DealProductRecord[]>;
  abstract addToDeal(dealId: string, productId: string, data: DealProductData): Promise<void>;
  abstract updateDealProduct(dealId: string, productId: string, data: Partial<DealProductData>): Promise<void>;
  abstract removeDealProduct(dealId: string, productId: string): Promise<void>;

  abstract getPartnerProducts(partnerId: string): Promise<PartnerProductRecord[]>;
  abstract addToPartner(partnerId: string, productId: string, data?: PartnerProductData): Promise<void>;
  abstract updatePartnerProduct(partnerId: string, productId: string, data: PartnerProductData): Promise<void>;
  abstract removeFromPartner(partnerId: string, productId: string): Promise<void>;
}
