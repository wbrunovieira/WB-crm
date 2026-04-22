/**
 * Deals Service
 * Pure utility functions for deal data processing
 */

import type { Stage } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DealProduct {
  id: string;
  dealId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalValue?: number;
  description?: string | null;
  deliveryTime?: string | null;
  status?: string;
  removedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  product?: { id: string; name: string; price: number | null } | null;
}

export type DealProductWithProduct = DealProduct;

export interface DealWithRelations {
  id: string;
  title: string;
  value: number;
  currency: string;
  status: string;
  stageId: string;
  contactId: string | null;
  organizationId: string | null;
  ownerId: string;
  description: string | null;
  closedAt: Date | null;
  expectedCloseDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  products: DealProduct[];
  activities: Array<{ id: string; completed: boolean }>;
  stage?: Stage | null;
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

// ─── Value calculations ───────────────────────────────────────────────────────

export function calculateDealValue(deal: DealWithRelations): number {
  if (!deal.products || deal.products.length === 0) {
    return deal.value;
  }
  return deal.products.reduce((sum, p) => {
    const base = p.unitPrice * p.quantity;
    const discounted = base * (1 - (p.discount || 0) / 100);
    return sum + discounted;
  }, 0);
}

export function calculateDealValueWithDiscount(
  deal: DealWithRelations,
  discountPercent: number
): number {
  const baseValue = calculateDealValue(deal);
  return baseValue * (1 - discountPercent / 100);
}

export function calculateExpectedValue(deal: DealWithRelations, probability?: number): number {
  const prob = probability ?? deal.stage?.probability ?? 0;
  return calculateDealValue(deal) * (prob / 100);
}

export function getDealSummary(deal: DealWithRelations): DealSummary {
  const calculatedValue = calculateDealValue(deal);
  const probability = deal.stage?.probability ?? 0;
  const expectedValue = calculatedValue * (probability / 100);
  const completedActivities = deal.activities.filter((a) => a.completed).length;
  const pendingActivities = deal.activities.filter((a) => !a.completed).length;

  return {
    id: deal.id,
    title: deal.title,
    value: deal.value,
    calculatedValue,
    currency: deal.currency,
    stage: deal.stage?.name ?? null,
    probability,
    expectedValue,
    productCount: deal.products.length,
    activityCount: deal.activities.length,
    pendingActivities,
    completedActivities,
  };
}

// ─── Stage navigation ─────────────────────────────────────────────────────────

export function isForwardTransition(
  currentStage: Stage | null | undefined,
  targetStage: Stage
): boolean {
  if (!currentStage) return true;
  return targetStage.order > currentStage.order;
}

export function getNextStage(currentStage: Stage, stages: Stage[]): Stage | null {
  const sorted = [...stages].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((s) => s.id === currentStage.id);
  return idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null;
}

export function getPreviousStage(currentStage: Stage, stages: Stage[]): Stage | null {
  const sorted = [...stages].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((s) => s.id === currentStage.id);
  return idx > 0 ? sorted[idx - 1] : null;
}

export function validateDealStageTransition(
  deal: DealWithRelations,
  targetStage: Stage,
  stages: Stage[]
): StageTransitionResult {
  // Block if deal is already won or lost and moving backward
  if (deal.status === "won" && deal.stage) {
    const forward = isForwardTransition(deal.stage as Stage, targetStage);
    if (!forward) {
      return { valid: false, reason: "Deal já foi ganho e não pode retroceder de etapa" };
    }
  }
  if (deal.status === "lost" && deal.stage) {
    const forward = isForwardTransition(deal.stage as Stage, targetStage);
    if (!forward) {
      return { valid: false, reason: "Deal já foi perdido e não pode retroceder de etapa" };
    }
  }

  // High probability stages require contact or organization
  if (targetStage.probability >= 50 && !deal.contactId && !deal.organizationId) {
    return {
      valid: false,
      reason: "Para esta etapa é necessário um contato ou organização",
    };
  }

  return { valid: true };
}
