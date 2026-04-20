import { describe, it, expect, beforeEach } from "vitest";
import {
  GetLeadProductsUseCase, AddLeadProductUseCase, UpdateLeadProductUseCase, RemoveLeadProductUseCase,
  GetOrganizationProductsUseCase, AddOrganizationProductUseCase, RemoveOrganizationProductUseCase,
  GetDealProductsUseCase, AddDealProductUseCase, UpdateDealProductUseCase, RemoveDealProductUseCase,
  GetPartnerProductsUseCase, AddPartnerProductUseCase, RemovePartnerProductUseCase,
} from "@/domain/product-links/application/use-cases/product-links.use-cases";
import { FakeProductLinksRepository } from "../../fakes/fake-product-links.repository";

let repo: FakeProductLinksRepository;
beforeEach(() => { repo = new FakeProductLinksRepository(); });

describe("Lead products", () => {
  it("adds product to lead", async () => {
    await new AddLeadProductUseCase(repo).execute("lead-001", "prod-001", { interestLevel: "high", estimatedValue: 5000 });
    const { products } = (await new GetLeadProductsUseCase(repo).execute("lead-001")).unwrap();
    expect(products).toHaveLength(1);
    expect(products[0].interestLevel).toBe("high");
    expect(products[0].estimatedValue).toBe(5000);
  });

  it("updates lead product", async () => {
    await repo.addToLead("lead-001", "prod-001", { interestLevel: "low" });
    await new UpdateLeadProductUseCase(repo).execute("lead-001", "prod-001", { interestLevel: "high" });
    const { products } = (await new GetLeadProductsUseCase(repo).execute("lead-001")).unwrap();
    expect(products[0].interestLevel).toBe("high");
  });

  it("removes product from lead", async () => {
    await repo.addToLead("lead-001", "prod-001");
    await new RemoveLeadProductUseCase(repo).execute("lead-001", "prod-001");
    const { products } = (await new GetLeadProductsUseCase(repo).execute("lead-001")).unwrap();
    expect(products).toHaveLength(0);
  });
});

describe("Organization products", () => {
  it("adds product to organization", async () => {
    await new AddOrganizationProductUseCase(repo).execute("org-001", "prod-001", { status: "purchased", totalRevenue: 10000 });
    const { products } = (await new GetOrganizationProductsUseCase(repo).execute("org-001")).unwrap();
    expect(products).toHaveLength(1);
    expect(products[0].status).toBe("purchased");
    expect(products[0].totalRevenue).toBe(10000);
  });

  it("removes product from organization", async () => {
    await repo.addToOrganization("org-001", "prod-001");
    await new RemoveOrganizationProductUseCase(repo).execute("org-001", "prod-001");
    const { products } = (await new GetOrganizationProductsUseCase(repo).execute("org-001")).unwrap();
    expect(products).toHaveLength(0);
  });
});

describe("Deal products", () => {
  it("adds product to deal", async () => {
    await new AddDealProductUseCase(repo).execute("deal-001", "prod-001", { unitPrice: 1000, totalValue: 1000, quantity: 1 });
    const { products } = (await new GetDealProductsUseCase(repo).execute("deal-001")).unwrap();
    expect(products).toHaveLength(1);
    expect(products[0].unitPrice).toBe(1000);
  });

  it("updates deal product", async () => {
    await repo.addToDeal("deal-001", "prod-001", { unitPrice: 1000, totalValue: 1000 });
    await new UpdateDealProductUseCase(repo).execute("deal-001", "prod-001", { unitPrice: 900, totalValue: 900 });
    const { products } = (await new GetDealProductsUseCase(repo).execute("deal-001")).unwrap();
    expect(products[0].unitPrice).toBe(900);
  });

  it("removes deal product", async () => {
    await repo.addToDeal("deal-001", "prod-001", { unitPrice: 500, totalValue: 500 });
    await new RemoveDealProductUseCase(repo).execute("deal-001", "prod-001");
    const { products } = (await new GetDealProductsUseCase(repo).execute("deal-001")).unwrap();
    expect(products).toHaveLength(0);
  });
});

describe("Partner products", () => {
  it("adds product to partner", async () => {
    await new AddPartnerProductUseCase(repo).execute("partner-001", "prod-001", { expertiseLevel: "expert", canRefer: true });
    const { products } = (await new GetPartnerProductsUseCase(repo).execute("partner-001")).unwrap();
    expect(products).toHaveLength(1);
    expect(products[0].expertiseLevel).toBe("expert");
  });

  it("removes product from partner", async () => {
    await repo.addToPartner("partner-001", "prod-001");
    await new RemovePartnerProductUseCase(repo).execute("partner-001", "prod-001");
    const { products } = (await new GetPartnerProductsUseCase(repo).execute("partner-001")).unwrap();
    expect(products).toHaveLength(0);
  });
});
