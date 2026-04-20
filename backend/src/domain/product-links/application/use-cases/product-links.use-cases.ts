import { Injectable } from "@nestjs/common";
import { Either, right } from "@/core/either";
import {
  ProductLinksRepository,
  LeadProductData, LeadProductRecord,
  OrganizationProductData, OrganizationProductRecord,
  DealProductData, DealProductRecord,
  PartnerProductData, PartnerProductRecord,
} from "../repositories/product-links.repository";

// ── Lead ──────────────────────────────────────────────────────────────────
@Injectable()
export class GetLeadProductsUseCase {
  constructor(private readonly repo: ProductLinksRepository) {}
  async execute(leadId: string): Promise<Either<never, { products: LeadProductRecord[] }>> {
    return right({ products: await this.repo.getLeadProducts(leadId) });
  }
}

@Injectable()
export class AddLeadProductUseCase {
  constructor(private readonly repo: ProductLinksRepository) {}
  async execute(leadId: string, productId: string, data?: LeadProductData): Promise<Either<never, void>> {
    await this.repo.addToLead(leadId, productId, data);
    return right(undefined);
  }
}

@Injectable()
export class UpdateLeadProductUseCase {
  constructor(private readonly repo: ProductLinksRepository) {}
  async execute(leadId: string, productId: string, data: LeadProductData): Promise<Either<never, void>> {
    await this.repo.updateLeadProduct(leadId, productId, data);
    return right(undefined);
  }
}

@Injectable()
export class RemoveLeadProductUseCase {
  constructor(private readonly repo: ProductLinksRepository) {}
  async execute(leadId: string, productId: string): Promise<Either<never, void>> {
    await this.repo.removeFromLead(leadId, productId);
    return right(undefined);
  }
}

// ── Organization ──────────────────────────────────────────────────────────
@Injectable()
export class GetOrganizationProductsUseCase {
  constructor(private readonly repo: ProductLinksRepository) {}
  async execute(organizationId: string): Promise<Either<never, { products: OrganizationProductRecord[] }>> {
    return right({ products: await this.repo.getOrganizationProducts(organizationId) });
  }
}

@Injectable()
export class AddOrganizationProductUseCase {
  constructor(private readonly repo: ProductLinksRepository) {}
  async execute(organizationId: string, productId: string, data?: OrganizationProductData): Promise<Either<never, void>> {
    await this.repo.addToOrganization(organizationId, productId, data);
    return right(undefined);
  }
}

@Injectable()
export class UpdateOrganizationProductUseCase {
  constructor(private readonly repo: ProductLinksRepository) {}
  async execute(organizationId: string, productId: string, data: OrganizationProductData): Promise<Either<never, void>> {
    await this.repo.updateOrganizationProduct(organizationId, productId, data);
    return right(undefined);
  }
}

@Injectable()
export class RemoveOrganizationProductUseCase {
  constructor(private readonly repo: ProductLinksRepository) {}
  async execute(organizationId: string, productId: string): Promise<Either<never, void>> {
    await this.repo.removeFromOrganization(organizationId, productId);
    return right(undefined);
  }
}

// ── Deal ──────────────────────────────────────────────────────────────────
@Injectable()
export class GetDealProductsUseCase {
  constructor(private readonly repo: ProductLinksRepository) {}
  async execute(dealId: string): Promise<Either<never, { products: DealProductRecord[] }>> {
    return right({ products: await this.repo.getDealProducts(dealId) });
  }
}

@Injectable()
export class AddDealProductUseCase {
  constructor(private readonly repo: ProductLinksRepository) {}
  async execute(dealId: string, productId: string, data: DealProductData): Promise<Either<never, void>> {
    await this.repo.addToDeal(dealId, productId, data);
    return right(undefined);
  }
}

@Injectable()
export class UpdateDealProductUseCase {
  constructor(private readonly repo: ProductLinksRepository) {}
  async execute(dealId: string, productId: string, data: Partial<DealProductData>): Promise<Either<never, void>> {
    await this.repo.updateDealProduct(dealId, productId, data);
    return right(undefined);
  }
}

@Injectable()
export class RemoveDealProductUseCase {
  constructor(private readonly repo: ProductLinksRepository) {}
  async execute(dealId: string, productId: string): Promise<Either<never, void>> {
    await this.repo.removeDealProduct(dealId, productId);
    return right(undefined);
  }
}

// ── Partner ───────────────────────────────────────────────────────────────
@Injectable()
export class GetPartnerProductsUseCase {
  constructor(private readonly repo: ProductLinksRepository) {}
  async execute(partnerId: string): Promise<Either<never, { products: PartnerProductRecord[] }>> {
    return right({ products: await this.repo.getPartnerProducts(partnerId) });
  }
}

@Injectable()
export class AddPartnerProductUseCase {
  constructor(private readonly repo: ProductLinksRepository) {}
  async execute(partnerId: string, productId: string, data?: PartnerProductData): Promise<Either<never, void>> {
    await this.repo.addToPartner(partnerId, productId, data);
    return right(undefined);
  }
}

@Injectable()
export class UpdatePartnerProductUseCase {
  constructor(private readonly repo: ProductLinksRepository) {}
  async execute(partnerId: string, productId: string, data: PartnerProductData): Promise<Either<never, void>> {
    await this.repo.updatePartnerProduct(partnerId, productId, data);
    return right(undefined);
  }
}

@Injectable()
export class RemovePartnerProductUseCase {
  constructor(private readonly repo: ProductLinksRepository) {}
  async execute(partnerId: string, productId: string): Promise<Either<never, void>> {
    await this.repo.removeFromPartner(partnerId, productId);
    return right(undefined);
  }
}
