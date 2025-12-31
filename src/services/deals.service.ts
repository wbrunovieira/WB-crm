/**
 * Deals Service
 * Phase 9: Architecture Improvements - Service Layer
 *
 * Contains business logic for deal operations:
 * - Value calculations
 * - Summary generation
 * - Stage transition validation
 */

import type { Deal, DealProduct, Activity, Stage } from "@prisma/client";

export interface DealProductWithProduct extends DealProduct {
  product?: {
    id: string;
    name: string;
    price: number | null;
  };
}

export interface DealWithRelations extends Deal {
  products?: DealProductWithProduct[];
  activities?: Activity[];
  stage?: Stage;
}

export interface DealSummary {
  id: string;
  title: string;
  value: number;
  calculatedValue: number;
  currency: string;
  stage: string | null;
  probability: number;
  expectedValue: number;
  productCount: number;
  activityCount: number;
  pendingActivities: number;
  completedActivities: number;
}

export interface StageTransitionResult {
  valid: boolean;
  reason?: string;
}

// ==================== Value Calculations ====================

/**
 * Calculates the total value of a deal based on its products
 * If no products, returns the deal's base value
 */
export function calculateDealValue(deal: DealWithRelations): number {
  if (!deal.products || deal.products.length === 0) {
    return deal.value || 0;
  }

  return deal.products.reduce((total, dp) => {
    const quantity = dp.quantity || 1;
    const unitPrice = dp.unitPrice || dp.product?.price || 0;
    const discount = dp.discount || 0;
    const lineTotal = quantity * unitPrice * (1 - discount / 100);
    return total + lineTotal;
  }, 0);
}

/**
 * Calculates the total value with a discount applied
 */
export function calculateDealValueWithDiscount(
  deal: DealWithRelations,
  discountPercent: number
): number {
  const baseValue = calculateDealValue(deal);
  return baseValue * (1 - discountPercent / 100);
}

/**
 * Calculates the expected value based on stage probability
 */
export function calculateExpectedValue(deal: DealWithRelations): number {
  const value = calculateDealValue(deal);
  const probability = deal.stage?.probability ?? 0;
  return value * (probability / 100);
}

// ==================== Deal Summary ====================

/**
 * Generates a comprehensive summary of a deal
 */
export function getDealSummary(deal: DealWithRelations): DealSummary {
  const calculatedValue = calculateDealValue(deal);
  const probability = deal.stage?.probability ?? 0;

  const activities = deal.activities || [];
  const pendingActivities = activities.filter((a) => !a.completed).length;
  const completedActivities = activities.filter((a) => a.completed).length;

  return {
    id: deal.id,
    title: deal.title,
    value: deal.value || 0,
    calculatedValue,
    currency: deal.currency || "BRL",
    stage: deal.stage?.name ?? null,
    probability,
    expectedValue: calculatedValue * (probability / 100),
    productCount: deal.products?.length ?? 0,
    activityCount: activities.length,
    pendingActivities,
    completedActivities,
  };
}

// ==================== Stage Transition Validation ====================

/**
 * Validates if a deal can transition to a new stage
 * Returns validation result with reason if invalid
 */
export function validateDealStageTransition(
  deal: DealWithRelations,
  targetStage: Stage,
  stages: Stage[]
): StageTransitionResult {
  // Get current and target stage orders
  const currentStage = deal.stage;
  if (!currentStage) {
    // No current stage, allow transition
    return { valid: true };
  }

  const currentOrder = currentStage.order;
  const targetOrder = targetStage.order;

  // Check if moving backwards (to a lower order stage)
  if (targetOrder < currentOrder) {
    // Check if deal has won/lost status that prevents backward movement
    if (deal.status === "won") {
      return {
        valid: false,
        reason: "Não é possível mover um negócio ganho para uma etapa anterior",
      };
    }
    if (deal.status === "lost") {
      return {
        valid: false,
        reason: "Não é possível mover um negócio perdido para uma etapa anterior",
      };
    }
  }

  // Check if target stage is a "closed" stage (usually last stages)
  const maxOrder = Math.max(...stages.map((s) => s.order));
  if (targetStage.order === maxOrder && !deal.closedAt) {
    // Moving to final stage - this is allowed but should set closedAt
    return { valid: true };
  }

  // Check if deal has required information for advanced stages
  if (targetStage.probability && targetStage.probability >= 50) {
    // Higher probability stages might require contact
    if (!deal.contactId && !deal.organizationId) {
      return {
        valid: false,
        reason: "É necessário vincular um contato ou organização para avançar",
      };
    }
  }

  return { valid: true };
}

/**
 * Checks if a stage transition is a "forward" movement
 */
export function isForwardTransition(
  currentStage: Stage | null,
  targetStage: Stage
): boolean {
  if (!currentStage) return true;
  return targetStage.order > currentStage.order;
}

/**
 * Gets the next stage in the pipeline
 */
export function getNextStage(
  currentStage: Stage,
  stages: Stage[]
): Stage | null {
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);
  const currentIndex = sortedStages.findIndex((s) => s.id === currentStage.id);

  if (currentIndex === -1 || currentIndex === sortedStages.length - 1) {
    return null;
  }

  return sortedStages[currentIndex + 1];
}

/**
 * Gets the previous stage in the pipeline
 */
export function getPreviousStage(
  currentStage: Stage,
  stages: Stage[]
): Stage | null {
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);
  const currentIndex = sortedStages.findIndex((s) => s.id === currentStage.id);

  if (currentIndex <= 0) {
    return null;
  }

  return sortedStages[currentIndex - 1];
}
