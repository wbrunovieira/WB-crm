/**
 * Tests for Deals Service
 * Phase 9: Architecture Improvements - Service Layer
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
} from "@/services/deals.service";
import type { Stage } from "@prisma/client";

// Helper to create mock deal
function createMockDeal(overrides: Partial<DealWithRelations> = {}): DealWithRelations {
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

// Helper to create mock stage
function createMockStage(overrides: Partial<Stage> = {}): Stage {
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

describe("Deals Service", () => {
  // ==================== calculateDealValue ====================
  describe("calculateDealValue", () => {
    it("should return deal base value when no products", () => {
      const deal = createMockDeal({ value: 5000, products: [] });

      const result = calculateDealValue(deal);

      expect(result).toBe(5000);
    });

    it("should return 0 when no products and no value", () => {
      const deal = createMockDeal({ value: 0, products: [] });

      const result = calculateDealValue(deal);

      expect(result).toBe(0);
    });

    it("should calculate total from products", () => {
      const deal = createMockDeal({
        value: 0,
        products: [
          {
            id: "dp-1",
            dealId: "deal-1",
            productId: "prod-1",
            quantity: 2,
            unitPrice: 100,
            discount: 0,
            totalValue: 200,
            description: null,
            deliveryTime: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "dp-2",
            dealId: "deal-1",
            productId: "prod-2",
            quantity: 1,
            unitPrice: 500,
            discount: 0,
            totalValue: 500,
            description: null,
            deliveryTime: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      const result = calculateDealValue(deal);

      expect(result).toBe(700); // 2*100 + 1*500
    });

    it("should apply discount to product lines", () => {
      const deal = createMockDeal({
        products: [
          {
            id: "dp-1",
            dealId: "deal-1",
            productId: "prod-1",
            quantity: 1,
            unitPrice: 1000,
            discount: 10, // 10% discount
            totalValue: 900,
            description: null,
            deliveryTime: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      const result = calculateDealValue(deal);

      expect(result).toBe(900); // 1000 * 0.9
    });

    it("should use product price when unitPrice is null", () => {
      const deal = createMockDeal({
        products: [
          {
            id: "dp-1",
            dealId: "deal-1",
            productId: "prod-1",
            quantity: 1,
            unitPrice: 250,
            discount: 0,
            totalValue: 250,
            description: null,
            deliveryTime: null,
            product: { id: "prod-1", name: "Product", price: 250 },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      const result = calculateDealValue(deal);

      expect(result).toBe(250);
    });

    it("should handle multiple products with discounts", () => {
      const deal = createMockDeal({
        products: [
          {
            id: "dp-1",
            dealId: "deal-1",
            productId: "prod-1",
            quantity: 2,
            unitPrice: 100,
            discount: 10, // 10% off = 180
            totalValue: 180,
            description: null,
            deliveryTime: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "dp-2",
            dealId: "deal-1",
            productId: "prod-2",
            quantity: 3,
            unitPrice: 200,
            discount: 25, // 25% off = 450
            totalValue: 450,
            description: null,
            deliveryTime: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      const result = calculateDealValue(deal);

      expect(result).toBe(630); // 180 + 450
    });
  });

  // ==================== calculateDealValueWithDiscount ====================
  describe("calculateDealValueWithDiscount", () => {
    it("should apply additional discount to deal value", () => {
      const deal = createMockDeal({ value: 1000, products: [] });

      const result = calculateDealValueWithDiscount(deal, 10);

      expect(result).toBe(900);
    });

    it("should return 0 with 100% discount", () => {
      const deal = createMockDeal({ value: 1000, products: [] });

      const result = calculateDealValueWithDiscount(deal, 100);

      expect(result).toBe(0);
    });

    it("should apply discount to calculated product total", () => {
      const deal = createMockDeal({
        products: [
          {
            id: "dp-1",
            dealId: "deal-1",
            productId: "prod-1",
            quantity: 1,
            unitPrice: 1000,
            discount: 0,
            totalValue: 1000,
            description: null,
            deliveryTime: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      const result = calculateDealValueWithDiscount(deal, 20);

      expect(result).toBe(800);
    });
  });

  // ==================== getDealSummary ====================
  describe("getDealSummary", () => {
    it("should return complete deal summary", () => {
      const deal = createMockDeal({
        id: "deal-123",
        title: "Big Deal",
        value: 5000,
        currency: "USD",
        stage: createMockStage({ name: "Negotiation", probability: 75 }),
        products: [
          { id: "dp-1", dealId: "deal-123", productId: "p1", quantity: 1, unitPrice: 1000, discount: 0, totalValue: 1000, description: null, deliveryTime: null, createdAt: new Date(), updatedAt: new Date() },
        ],
        activities: [
          { id: "a-1", completed: true } as any,
          { id: "a-2", completed: false } as any,
          { id: "a-3", completed: false } as any,
        ],
      });

      const summary = getDealSummary(deal);

      expect(summary.id).toBe("deal-123");
      expect(summary.title).toBe("Big Deal");
      expect(summary.value).toBe(5000);
      expect(summary.calculatedValue).toBe(1000);
      expect(summary.currency).toBe("USD");
      expect(summary.stage).toBe("Negotiation");
      expect(summary.probability).toBe(75);
      expect(summary.expectedValue).toBe(750); // 1000 * 0.75
      expect(summary.productCount).toBe(1);
      expect(summary.activityCount).toBe(3);
      expect(summary.pendingActivities).toBe(2);
      expect(summary.completedActivities).toBe(1);
    });

    it("should handle deal with no activities", () => {
      const deal = createMockDeal({ activities: [] });

      const summary = getDealSummary(deal);

      expect(summary.activityCount).toBe(0);
      expect(summary.pendingActivities).toBe(0);
      expect(summary.completedActivities).toBe(0);
    });

    it("should handle deal with no stage", () => {
      const deal = createMockDeal({ stage: undefined });

      const summary = getDealSummary(deal);

      expect(summary.stage).toBeNull();
      expect(summary.probability).toBe(0);
      expect(summary.expectedValue).toBe(0);
    });
  });

  // ==================== validateDealStageTransition ====================
  describe("validateDealStageTransition", () => {
    const stages: Stage[] = [
      createMockStage({ id: "s1", name: "Lead", order: 1, probability: 10 }),
      createMockStage({ id: "s2", name: "Qualified", order: 2, probability: 30 }),
      createMockStage({ id: "s3", name: "Proposal", order: 3, probability: 50 }),
      createMockStage({ id: "s4", name: "Negotiation", order: 4, probability: 75 }),
      createMockStage({ id: "s5", name: "Won", order: 5, probability: 100 }),
    ];

    it("should allow valid forward transition", () => {
      const deal = createMockDeal({
        stage: stages[0],
        contactId: "contact-1",
      });

      const result = validateDealStageTransition(deal, stages[1], stages);

      expect(result.valid).toBe(true);
    });

    it("should allow transition when no current stage", () => {
      const deal = createMockDeal({ stage: undefined });

      const result = validateDealStageTransition(deal, stages[0], stages);

      expect(result.valid).toBe(true);
    });

    it("should block backward transition for won deals", () => {
      const deal = createMockDeal({
        stage: stages[4],
        status: "won",
      });

      const result = validateDealStageTransition(deal, stages[2], stages);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("ganho");
    });

    it("should block backward transition for lost deals", () => {
      const deal = createMockDeal({
        stage: stages[3],
        status: "lost",
      });

      const result = validateDealStageTransition(deal, stages[1], stages);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("perdido");
    });

    it("should require contact for high probability stages", () => {
      const deal = createMockDeal({
        stage: stages[0],
        contactId: null,
        organizationId: null,
      });

      const result = validateDealStageTransition(deal, stages[2], stages);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("contato ou organização");
    });

    it("should allow high probability stage with contact", () => {
      const deal = createMockDeal({
        stage: stages[0],
        contactId: "contact-1",
      });

      const result = validateDealStageTransition(deal, stages[2], stages);

      expect(result.valid).toBe(true);
    });

    it("should allow high probability stage with organization", () => {
      const deal = createMockDeal({
        stage: stages[0],
        organizationId: "org-1",
      });

      const result = validateDealStageTransition(deal, stages[2], stages);

      expect(result.valid).toBe(true);
    });
  });

  // ==================== Stage Navigation ====================
  describe("Stage Navigation", () => {
    const stages: Stage[] = [
      createMockStage({ id: "s1", order: 1 }),
      createMockStage({ id: "s2", order: 2 }),
      createMockStage({ id: "s3", order: 3 }),
    ];

    describe("isForwardTransition", () => {
      it("should return true for higher order stage", () => {
        expect(isForwardTransition(stages[0], stages[1])).toBe(true);
      });

      it("should return false for lower order stage", () => {
        expect(isForwardTransition(stages[2], stages[1])).toBe(false);
      });

      it("should return true when no current stage", () => {
        expect(isForwardTransition(null, stages[0])).toBe(true);
      });
    });

    describe("getNextStage", () => {
      it("should return next stage", () => {
        const next = getNextStage(stages[0], stages);

        expect(next?.id).toBe("s2");
      });

      it("should return null for last stage", () => {
        const next = getNextStage(stages[2], stages);

        expect(next).toBeNull();
      });
    });

    describe("getPreviousStage", () => {
      it("should return previous stage", () => {
        const prev = getPreviousStage(stages[1], stages);

        expect(prev?.id).toBe("s1");
      });

      it("should return null for first stage", () => {
        const prev = getPreviousStage(stages[0], stages);

        expect(prev).toBeNull();
      });
    });
  });
});
