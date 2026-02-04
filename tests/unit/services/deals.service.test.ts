/**
 * Unit Tests for Deals Service
 * Pure unit tests with edge cases, boundary conditions, and triangulation
 */

import { describe, it, expect } from "vitest";
import {
  calculateDealValue,
  calculateDealValueWithDiscount,
  calculateExpectedValue,
  getDealSummary,
  validateDealStageTransition,
  isForwardTransition,
  getNextStage,
  getPreviousStage,
  type DealWithRelations,
  type DealProductWithProduct,
} from "@/services/deals.service";
import type { Stage } from "@prisma/client";

// ==================== Test Helpers ====================

function createDeal(overrides: Partial<DealWithRelations> = {}): DealWithRelations {
  return {
    id: "deal-1",
    title: "Test Deal",
    value: 1000,
    currency: "BRL",
    status: "open",
    stageId: "stage-1",
    contactId: null,
    organizationId: null,
    ownerId: "user-1",
    closedAt: null,
    expectedCloseDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    products: [],
    activities: [],
    stage: null,
    ...overrides,
  } as DealWithRelations;
}

function createProduct(overrides: Partial<DealProductWithProduct> = {}): DealProductWithProduct {
  return {
    id: "dp-1",
    dealId: "deal-1",
    productId: "prod-1",
    quantity: 1,
    unitPrice: 100,
    discount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as DealProductWithProduct;
}

function createStage(overrides: Partial<Stage> = {}): Stage {
  return {
    id: "stage-1",
    name: "Proposta",
    order: 1,
    probability: 50,
    pipelineId: "pipeline-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Stage;
}

// ==================== calculateDealValue ====================

describe("calculateDealValue", () => {
  describe("when deal has no products", () => {
    it("returns deal base value", () => {
      const deal = createDeal({ value: 5000, products: [] });
      expect(calculateDealValue(deal)).toBe(5000);
    });

    it("returns 0 when deal value is 0", () => {
      const deal = createDeal({ value: 0, products: [] });
      expect(calculateDealValue(deal)).toBe(0);
    });

    it("returns 0 when deal value is null", () => {
      const deal = createDeal({ value: null as any, products: [] });
      expect(calculateDealValue(deal)).toBe(0);
    });

    it("returns 0 when products is undefined", () => {
      const deal = createDeal({ value: 0, products: undefined });
      expect(calculateDealValue(deal)).toBe(0);
    });
  });

  describe("when deal has products", () => {
    it("calculates sum of single product", () => {
      const deal = createDeal({
        products: [createProduct({ quantity: 2, unitPrice: 100, discount: 0 })],
      });
      expect(calculateDealValue(deal)).toBe(200);
    });

    it("calculates sum of multiple products", () => {
      const deal = createDeal({
        products: [
          createProduct({ quantity: 2, unitPrice: 100, discount: 0 }),
          createProduct({ quantity: 3, unitPrice: 50, discount: 0 }),
        ],
      });
      expect(calculateDealValue(deal)).toBe(350); // 200 + 150
    });

    // Triangulation: verify calculation is quantity * price
    it("correctly multiplies quantity by price (triangulation 1)", () => {
      const deal = createDeal({
        products: [createProduct({ quantity: 5, unitPrice: 20, discount: 0 })],
      });
      expect(calculateDealValue(deal)).toBe(100);
    });

    it("correctly multiplies quantity by price (triangulation 2)", () => {
      const deal = createDeal({
        products: [createProduct({ quantity: 10, unitPrice: 10, discount: 0 })],
      });
      expect(calculateDealValue(deal)).toBe(100);
    });
  });

  describe("discount handling", () => {
    it("applies 10% discount correctly", () => {
      const deal = createDeal({
        products: [createProduct({ quantity: 1, unitPrice: 1000, discount: 10 })],
      });
      expect(calculateDealValue(deal)).toBe(900);
    });

    it("applies 50% discount correctly", () => {
      const deal = createDeal({
        products: [createProduct({ quantity: 1, unitPrice: 1000, discount: 50 })],
      });
      expect(calculateDealValue(deal)).toBe(500);
    });

    it("applies 100% discount correctly", () => {
      const deal = createDeal({
        products: [createProduct({ quantity: 1, unitPrice: 1000, discount: 100 })],
      });
      expect(calculateDealValue(deal)).toBe(0);
    });

    it("handles 0% discount", () => {
      const deal = createDeal({
        products: [createProduct({ quantity: 1, unitPrice: 1000, discount: 0 })],
      });
      expect(calculateDealValue(deal)).toBe(1000);
    });

    it("handles null discount as 0%", () => {
      const deal = createDeal({
        products: [createProduct({ quantity: 1, unitPrice: 1000, discount: null as any })],
      });
      expect(calculateDealValue(deal)).toBe(1000);
    });

    it("handles undefined discount as 0%", () => {
      const deal = createDeal({
        products: [createProduct({ quantity: 1, unitPrice: 1000, discount: undefined as any })],
      });
      expect(calculateDealValue(deal)).toBe(1000);
    });
  });

  describe("quantity edge cases", () => {
    it("treats quantity of 0 as 1 (falsy fallback)", () => {
      // Implementation uses `quantity || 1`, so 0 becomes 1
      const deal = createDeal({
        products: [createProduct({ quantity: 0, unitPrice: 1000, discount: 0 })],
      });
      expect(calculateDealValue(deal)).toBe(1000);
    });

    it("handles null quantity as 1", () => {
      const deal = createDeal({
        products: [createProduct({ quantity: null as any, unitPrice: 100, discount: 0 })],
      });
      expect(calculateDealValue(deal)).toBe(100);
    });

    it("handles fractional quantities", () => {
      const deal = createDeal({
        products: [createProduct({ quantity: 1.5, unitPrice: 100, discount: 0 })],
      });
      expect(calculateDealValue(deal)).toBe(150);
    });
  });

  describe("price fallback logic", () => {
    it("uses unitPrice when available", () => {
      const deal = createDeal({
        products: [
          createProduct({
            unitPrice: 200,
            product: { id: "p1", name: "Product", price: 100 },
          }),
        ],
      });
      expect(calculateDealValue(deal)).toBe(200);
    });

    it("falls back to product.price when unitPrice is null", () => {
      const deal = createDeal({
        products: [
          createProduct({
            unitPrice: null as any,
            product: { id: "p1", name: "Product", price: 150 },
          }),
        ],
      });
      expect(calculateDealValue(deal)).toBe(150);
    });

    it("returns 0 when both unitPrice and product.price are null", () => {
      const deal = createDeal({
        products: [
          createProduct({
            unitPrice: null as any,
            product: { id: "p1", name: "Product", price: null },
          }),
        ],
      });
      expect(calculateDealValue(deal)).toBe(0);
    });

    it("returns 0 when unitPrice is null and no product", () => {
      const deal = createDeal({
        products: [createProduct({ unitPrice: null as any, product: undefined })],
      });
      expect(calculateDealValue(deal)).toBe(0);
    });
  });

  describe("complex scenarios", () => {
    it("handles multiple products with mixed discounts", () => {
      const deal = createDeal({
        products: [
          createProduct({ quantity: 2, unitPrice: 100, discount: 10 }), // 180
          createProduct({ quantity: 3, unitPrice: 200, discount: 25 }), // 450
          createProduct({ quantity: 1, unitPrice: 500, discount: 0 }),  // 500
        ],
      });
      expect(calculateDealValue(deal)).toBe(1130);
    });

    it("handles large numbers", () => {
      const deal = createDeal({
        products: [createProduct({ quantity: 1000, unitPrice: 999999, discount: 0 })],
      });
      expect(calculateDealValue(deal)).toBe(999999000);
    });

    it("handles very small decimal values", () => {
      const deal = createDeal({
        products: [createProduct({ quantity: 1, unitPrice: 0.01, discount: 0 })],
      });
      expect(calculateDealValue(deal)).toBeCloseTo(0.01, 5);
    });
  });
});

// ==================== calculateDealValueWithDiscount ====================

describe("calculateDealValueWithDiscount", () => {
  it("applies additional discount to base value", () => {
    const deal = createDeal({ value: 1000, products: [] });
    expect(calculateDealValueWithDiscount(deal, 10)).toBe(900);
  });

  it("applies additional discount to calculated product value", () => {
    const deal = createDeal({
      products: [createProduct({ quantity: 1, unitPrice: 1000, discount: 0 })],
    });
    expect(calculateDealValueWithDiscount(deal, 20)).toBe(800);
  });

  it("returns 0 with 100% discount", () => {
    const deal = createDeal({ value: 5000, products: [] });
    expect(calculateDealValueWithDiscount(deal, 100)).toBe(0);
  });

  it("returns full value with 0% discount", () => {
    const deal = createDeal({ value: 5000, products: [] });
    expect(calculateDealValueWithDiscount(deal, 0)).toBe(5000);
  });

  // Triangulation
  it("applies 25% discount correctly", () => {
    const deal = createDeal({ value: 400, products: [] });
    expect(calculateDealValueWithDiscount(deal, 25)).toBe(300);
  });

  it("applies 33.33% discount correctly", () => {
    const deal = createDeal({ value: 300, products: [] });
    expect(calculateDealValueWithDiscount(deal, 33.33)).toBeCloseTo(200.01, 1);
  });

  it("stacks with product-level discounts", () => {
    // Product: 1000 * (1 - 10%) = 900
    // Additional: 900 * (1 - 10%) = 810
    const deal = createDeal({
      products: [createProduct({ quantity: 1, unitPrice: 1000, discount: 10 })],
    });
    expect(calculateDealValueWithDiscount(deal, 10)).toBe(810);
  });
});

// ==================== calculateExpectedValue ====================

describe("calculateExpectedValue", () => {
  it("calculates expected value based on stage probability", () => {
    const deal = createDeal({
      value: 1000,
      products: [],
      stage: createStage({ probability: 50 }),
    });
    expect(calculateExpectedValue(deal)).toBe(500);
  });

  it("returns 0 when stage is undefined", () => {
    const deal = createDeal({ value: 1000, products: [], stage: undefined });
    expect(calculateExpectedValue(deal)).toBe(0);
  });

  it("returns 0 when stage probability is 0", () => {
    const deal = createDeal({
      value: 1000,
      products: [],
      stage: createStage({ probability: 0 }),
    });
    expect(calculateExpectedValue(deal)).toBe(0);
  });

  it("returns full value when probability is 100", () => {
    const deal = createDeal({
      value: 1000,
      products: [],
      stage: createStage({ probability: 100 }),
    });
    expect(calculateExpectedValue(deal)).toBe(1000);
  });

  // Triangulation
  it("calculates 75% probability correctly", () => {
    const deal = createDeal({
      value: 400,
      products: [],
      stage: createStage({ probability: 75 }),
    });
    expect(calculateExpectedValue(deal)).toBe(300);
  });

  it("calculates 25% probability correctly", () => {
    const deal = createDeal({
      value: 400,
      products: [],
      stage: createStage({ probability: 25 }),
    });
    expect(calculateExpectedValue(deal)).toBe(100);
  });

  it("uses calculated product value instead of base value", () => {
    const deal = createDeal({
      value: 1000, // Should be ignored
      products: [createProduct({ quantity: 1, unitPrice: 500, discount: 0 })],
      stage: createStage({ probability: 50 }),
    });
    expect(calculateExpectedValue(deal)).toBe(250); // 500 * 0.5
  });
});

// ==================== getDealSummary ====================

describe("getDealSummary", () => {
  it("returns all expected fields", () => {
    const deal = createDeal({
      id: "d-123",
      title: "Test Deal",
      value: 1000,
      currency: "USD",
    });

    const summary = getDealSummary(deal);

    expect(summary).toHaveProperty("id", "d-123");
    expect(summary).toHaveProperty("title", "Test Deal");
    expect(summary).toHaveProperty("value", 1000);
    expect(summary).toHaveProperty("calculatedValue");
    expect(summary).toHaveProperty("currency", "USD");
    expect(summary).toHaveProperty("stage");
    expect(summary).toHaveProperty("probability");
    expect(summary).toHaveProperty("expectedValue");
    expect(summary).toHaveProperty("productCount");
    expect(summary).toHaveProperty("activityCount");
    expect(summary).toHaveProperty("pendingActivities");
    expect(summary).toHaveProperty("completedActivities");
  });

  it("counts activities correctly", () => {
    const deal = createDeal({
      activities: [
        { id: "a1", completed: true } as any,
        { id: "a2", completed: false } as any,
        { id: "a3", completed: false } as any,
        { id: "a4", completed: true } as any,
      ],
    });

    const summary = getDealSummary(deal);

    expect(summary.activityCount).toBe(4);
    expect(summary.completedActivities).toBe(2);
    expect(summary.pendingActivities).toBe(2);
  });

  it("handles empty activities", () => {
    const deal = createDeal({ activities: [] });

    const summary = getDealSummary(deal);

    expect(summary.activityCount).toBe(0);
    expect(summary.completedActivities).toBe(0);
    expect(summary.pendingActivities).toBe(0);
  });

  it("handles undefined activities", () => {
    const deal = createDeal({ activities: undefined });

    const summary = getDealSummary(deal);

    expect(summary.activityCount).toBe(0);
  });

  it("counts products correctly", () => {
    const deal = createDeal({
      products: [createProduct(), createProduct(), createProduct()],
    });

    const summary = getDealSummary(deal);

    expect(summary.productCount).toBe(3);
  });

  it("defaults currency to BRL", () => {
    const deal = createDeal({ currency: null as any });

    const summary = getDealSummary(deal);

    expect(summary.currency).toBe("BRL");
  });

  it("returns null stage when no stage", () => {
    const deal = createDeal({ stage: undefined });

    const summary = getDealSummary(deal);

    expect(summary.stage).toBeNull();
    expect(summary.probability).toBe(0);
  });
});

// ==================== validateDealStageTransition ====================

describe("validateDealStageTransition", () => {
  const stages = [
    createStage({ id: "s1", name: "Lead", order: 1, probability: 10 }),
    createStage({ id: "s2", name: "Qualified", order: 2, probability: 30 }),
    createStage({ id: "s3", name: "Proposal", order: 3, probability: 50 }),
    createStage({ id: "s4", name: "Negotiation", order: 4, probability: 75 }),
    createStage({ id: "s5", name: "Won", order: 5, probability: 100 }),
  ];

  describe("forward transitions", () => {
    it("allows transition to next stage", () => {
      const deal = createDeal({ stage: stages[0], contactId: "c1" });
      const result = validateDealStageTransition(deal, stages[1], stages);
      expect(result.valid).toBe(true);
    });

    it("allows skipping stages", () => {
      const deal = createDeal({ stage: stages[0], contactId: "c1" });
      const result = validateDealStageTransition(deal, stages[3], stages);
      expect(result.valid).toBe(true);
    });
  });

  describe("backward transitions", () => {
    it("allows backward transition for open deals", () => {
      const deal = createDeal({ stage: stages[2], status: "open", contactId: "c1" });
      const result = validateDealStageTransition(deal, stages[1], stages);
      expect(result.valid).toBe(true);
    });

    it("blocks backward transition for won deals", () => {
      const deal = createDeal({ stage: stages[4], status: "won" });
      const result = validateDealStageTransition(deal, stages[2], stages);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("ganho");
    });

    it("blocks backward transition for lost deals", () => {
      const deal = createDeal({ stage: stages[3], status: "lost" });
      const result = validateDealStageTransition(deal, stages[1], stages);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("perdido");
    });
  });

  describe("high probability stage requirements", () => {
    it("requires contact for probability >= 50", () => {
      const deal = createDeal({
        stage: stages[0],
        contactId: null,
        organizationId: null,
      });
      const result = validateDealStageTransition(deal, stages[2], stages);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("contato ou organização");
    });

    it("allows transition with contact", () => {
      const deal = createDeal({ stage: stages[0], contactId: "contact-1" });
      const result = validateDealStageTransition(deal, stages[2], stages);
      expect(result.valid).toBe(true);
    });

    it("allows transition with organization", () => {
      const deal = createDeal({ stage: stages[0], organizationId: "org-1" });
      const result = validateDealStageTransition(deal, stages[2], stages);
      expect(result.valid).toBe(true);
    });

    it("allows low probability stages without contact", () => {
      const deal = createDeal({
        stage: stages[0],
        contactId: null,
        organizationId: null,
      });
      const result = validateDealStageTransition(deal, stages[1], stages);
      expect(result.valid).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("allows transition when no current stage", () => {
      const deal = createDeal({ stage: undefined });
      const result = validateDealStageTransition(deal, stages[0], stages);
      expect(result.valid).toBe(true);
    });

    it("allows transition to final stage", () => {
      const deal = createDeal({ stage: stages[3], contactId: "c1" });
      const result = validateDealStageTransition(deal, stages[4], stages);
      expect(result.valid).toBe(true);
    });
  });
});

// ==================== Stage Navigation ====================

describe("isForwardTransition", () => {
  it("returns true when moving to higher order", () => {
    const current = createStage({ order: 1 });
    const target = createStage({ order: 2 });
    expect(isForwardTransition(current, target)).toBe(true);
  });

  it("returns false when moving to lower order", () => {
    const current = createStage({ order: 3 });
    const target = createStage({ order: 2 });
    expect(isForwardTransition(current, target)).toBe(false);
  });

  it("returns false when moving to same order", () => {
    const current = createStage({ order: 2 });
    const target = createStage({ order: 2 });
    expect(isForwardTransition(current, target)).toBe(false);
  });

  it("returns true when no current stage", () => {
    const target = createStage({ order: 1 });
    expect(isForwardTransition(null, target)).toBe(true);
  });
});

describe("getNextStage", () => {
  const stages = [
    createStage({ id: "s1", order: 1 }),
    createStage({ id: "s2", order: 2 }),
    createStage({ id: "s3", order: 3 }),
  ];

  it("returns next stage in order", () => {
    const next = getNextStage(stages[0], stages);
    expect(next?.id).toBe("s2");
  });

  it("returns null for last stage", () => {
    const next = getNextStage(stages[2], stages);
    expect(next).toBeNull();
  });

  it("handles unsorted stages array", () => {
    const unsorted = [stages[2], stages[0], stages[1]];
    const next = getNextStage(stages[0], unsorted);
    expect(next?.id).toBe("s2");
  });

  it("returns null when stage not found", () => {
    const unknownStage = createStage({ id: "unknown", order: 99 });
    const next = getNextStage(unknownStage, stages);
    expect(next).toBeNull();
  });
});

describe("getPreviousStage", () => {
  const stages = [
    createStage({ id: "s1", order: 1 }),
    createStage({ id: "s2", order: 2 }),
    createStage({ id: "s3", order: 3 }),
  ];

  it("returns previous stage in order", () => {
    const prev = getPreviousStage(stages[1], stages);
    expect(prev?.id).toBe("s1");
  });

  it("returns null for first stage", () => {
    const prev = getPreviousStage(stages[0], stages);
    expect(prev).toBeNull();
  });

  it("handles unsorted stages array", () => {
    const unsorted = [stages[2], stages[0], stages[1]];
    const prev = getPreviousStage(stages[2], unsorted);
    expect(prev?.id).toBe("s2");
  });
});
