/**
 * Transaction Wrappers for WB-CRM
 * Phase 9: Architecture Improvements - Transaction Wrappers
 *
 * Provides utilities for wrapping complex operations in Prisma transactions
 * to ensure data consistency and atomicity.
 */

import { prisma } from "./prisma";
import type { PrismaClient, Prisma } from "@prisma/client";

// Transaction client type
type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Options for transaction operations
 */
export interface TransactionOptions {
  maxRetries?: number;
  timeout?: number;
  isolationLevel?: Prisma.TransactionIsolationLevel;
}

const DEFAULT_OPTIONS: TransactionOptions = {
  maxRetries: 3,
  timeout: 30000, // 30 seconds
};

/**
 * Wraps an operation in a Prisma transaction with retry logic
 */
export async function withTransaction<T>(
  operation: (tx: TransactionClient) => Promise<T>,
  options: TransactionOptions = {}
): Promise<T> {
  const { maxRetries, timeout, isolationLevel } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  let lastError: Error | null = null;
  let attempts = 0;

  while (attempts < (maxRetries ?? 3)) {
    try {
      return await prisma.$transaction(operation, {
        maxWait: timeout,
        timeout: timeout,
        isolationLevel,
      });
    } catch (error) {
      lastError = error as Error;
      attempts++;

      // Only retry on specific transient errors
      if (!isRetryableError(error) || attempts >= (maxRetries ?? 3)) {
        throw error;
      }

      // Exponential backoff
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempts) * 100)
      );
    }
  }

  throw lastError;
}

/**
 * Checks if an error is retryable (transient)
 */
function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes("deadlock") ||
    message.includes("lock wait timeout") ||
    message.includes("connection") ||
    message.includes("serialization failure")
  );
}

// ==================== Lead Conversion Transaction ====================

export interface LeadConversionInput {
  leadId: string;
  ownerId: string;
  organizationData: {
    name: string;
    legalName?: string | null;
    website?: string | null;
    phone?: string | null;
    country?: string | null;
    state?: string | null;
    city?: string | null;
    address?: string | null;
    postalCode?: string | null;
    industry?: string | null;
    employeeCount?: string | null;
    annualRevenue?: number | null;
    cnpj?: string | null;
    primaryCNAEId?: string | null;
    internationalActivity?: string | null;
    techDetails?: string | null;
  };
  contactsData: Array<{
    leadContactId: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    position?: string | null;
    isPrimary: boolean;
  }>;
  secondaryCNAEIds?: string[];
  techProfile?: {
    languageIds?: string[];
    frameworkIds?: string[];
    hostingIds?: string[];
    databaseIds?: string[];
    erpIds?: string[];
    crmIds?: string[];
    ecommerceIds?: string[];
  };
  productIds?: string[];
}

export interface LeadConversionResult {
  organizationId: string;
  contactIds: string[];
  success: boolean;
}

/**
 * Converts a lead to organization within a transaction
 * Ensures all related data is transferred atomically
 */
export async function convertLeadToOrganizationTransaction(
  input: LeadConversionInput
): Promise<LeadConversionResult> {
  return withTransaction(async (tx) => {
    // 1. Create organization
    const organization = await tx.organization.create({
      data: {
        ...input.organizationData,
        ownerId: input.ownerId,
        sourceLeadId: input.leadId,
      },
    });

    // 2. Create contacts
    const contactIds: string[] = [];
    for (const contactData of input.contactsData) {
      const contact = await tx.contact.create({
        data: {
          name: contactData.name,
          email: contactData.email,
          phone: contactData.phone,
          position: contactData.position,
          isPrimary: contactData.isPrimary,
          ownerId: input.ownerId,
          organizationId: organization.id,
          sourceLeadContactId: contactData.leadContactId,
        },
      });
      contactIds.push(contact.id);

      // Update lead contact with converted reference
      await tx.leadContact.update({
        where: { id: contactData.leadContactId },
        data: { convertedToContactId: contact.id },
      });
    }

    // 3. Transfer secondary CNAEs
    if (input.secondaryCNAEIds && input.secondaryCNAEIds.length > 0) {
      await tx.organizationSecondaryCNAE.createMany({
        data: input.secondaryCNAEIds.map((cnaeId) => ({
          organizationId: organization.id,
          cnaeId,
        })),
      });
    }

    // 4. Transfer tech profile
    if (input.techProfile) {
      const { techProfile } = input;

      if (techProfile.languageIds?.length) {
        await tx.organizationLanguage.createMany({
          data: techProfile.languageIds.map((languageId) => ({
            organizationId: organization.id,
            languageId,
          })),
        });
      }

      if (techProfile.frameworkIds?.length) {
        await tx.organizationFramework.createMany({
          data: techProfile.frameworkIds.map((frameworkId) => ({
            organizationId: organization.id,
            frameworkId,
          })),
        });
      }

      if (techProfile.hostingIds?.length) {
        await tx.organizationHosting.createMany({
          data: techProfile.hostingIds.map((hostingId) => ({
            organizationId: organization.id,
            hostingId,
          })),
        });
      }

      if (techProfile.databaseIds?.length) {
        await tx.organizationDatabase.createMany({
          data: techProfile.databaseIds.map((databaseId) => ({
            organizationId: organization.id,
            databaseId,
          })),
        });
      }

      if (techProfile.erpIds?.length) {
        await tx.organizationERP.createMany({
          data: techProfile.erpIds.map((erpId) => ({
            organizationId: organization.id,
            erpId,
          })),
        });
      }

      if (techProfile.crmIds?.length) {
        await tx.organizationCRM.createMany({
          data: techProfile.crmIds.map((crmId) => ({
            organizationId: organization.id,
            crmId,
          })),
        });
      }

      if (techProfile.ecommerceIds?.length) {
        await tx.organizationEcommerce.createMany({
          data: techProfile.ecommerceIds.map((ecommerceId) => ({
            organizationId: organization.id,
            ecommerceId,
          })),
        });
      }
    }

    // 5. Transfer products
    if (input.productIds && input.productIds.length > 0) {
      await tx.organizationProduct.createMany({
        data: input.productIds.map((productId) => ({
          organizationId: organization.id,
          productId,
        })),
      });
    }

    // 6. Update lead status
    await tx.lead.update({
      where: { id: input.leadId },
      data: {
        status: "converted",
        convertedToOrganizationId: organization.id,
      },
    });

    return {
      organizationId: organization.id,
      contactIds,
      success: true,
    };
  });
}

// ==================== Deal Cascade Delete Transaction ====================

export interface DealDeleteResult {
  deletedProductCount: number;
  deletedTechStackCount: number;
  deletedActivityCount: number;
  success: boolean;
}

/**
 * Deletes a deal and all related records within a transaction
 */
export async function deleteDealWithCascade(
  dealId: string,
  ownerId: string
): Promise<DealDeleteResult> {
  return withTransaction(async (tx) => {
    // Verify ownership first
    const deal = await tx.deal.findFirst({
      where: { id: dealId, ownerId },
    });

    if (!deal) {
      throw new Error("Negócio não encontrado");
    }

    // 1. Delete deal products
    const deletedProducts = await tx.dealProduct.deleteMany({
      where: { dealId },
    });

    // 2. Delete deal tech stack
    const deletedTechStack = await tx.dealTechStack.deleteMany({
      where: { dealId },
    });

    // 3. Delete deal languages
    await tx.dealLanguage.deleteMany({
      where: { dealId },
    });

    // 4. Delete deal frameworks
    await tx.dealFramework.deleteMany({
      where: { dealId },
    });

    // 5. Delete or unlink activities
    const deletedActivities = await tx.activity.deleteMany({
      where: { dealId },
    });

    // 6. Delete the deal itself
    await tx.deal.delete({
      where: { id: dealId },
    });

    return {
      deletedProductCount: deletedProducts.count,
      deletedTechStackCount: deletedTechStack.count,
      deletedActivityCount: deletedActivities.count,
      success: true,
    };
  });
}

// ==================== Organization Cascade Delete Transaction ====================

export interface OrganizationDeleteResult {
  deletedContactCount: number;
  deletedDealCount: number;
  deletedTechProfileCount: number;
  deletedProductCount: number;
  deletedCNAECount: number;
  success: boolean;
}

/**
 * Deletes an organization and all related records within a transaction
 */
export async function deleteOrganizationWithCascade(
  organizationId: string,
  ownerId: string
): Promise<OrganizationDeleteResult> {
  return withTransaction(async (tx) => {
    // Verify ownership first
    const organization = await tx.organization.findFirst({
      where: { id: organizationId, ownerId },
    });

    if (!organization) {
      throw new Error("Organização não encontrada");
    }

    // 1. Delete contacts (this will cascade delete contact's activities)
    const deletedContacts = await tx.contact.deleteMany({
      where: { organizationId },
    });

    // 2. Delete deals (activities linked to deals will be deleted via deal cascade)
    const deals = await tx.deal.findMany({
      where: { organizationId },
      select: { id: true },
    });

    let deletedDealCount = 0;
    for (const deal of deals) {
      // Delete deal's related records first
      await tx.dealProduct.deleteMany({ where: { dealId: deal.id } });
      await tx.dealTechStack.deleteMany({ where: { dealId: deal.id } });
      await tx.dealLanguage.deleteMany({ where: { dealId: deal.id } });
      await tx.dealFramework.deleteMany({ where: { dealId: deal.id } });
      await tx.activity.deleteMany({ where: { dealId: deal.id } });
      await tx.deal.delete({ where: { id: deal.id } });
      deletedDealCount++;
    }

    // 3. Delete tech profile
    let techProfileCount = 0;
    techProfileCount += (await tx.organizationLanguage.deleteMany({ where: { organizationId } })).count;
    techProfileCount += (await tx.organizationFramework.deleteMany({ where: { organizationId } })).count;
    techProfileCount += (await tx.organizationHosting.deleteMany({ where: { organizationId } })).count;
    techProfileCount += (await tx.organizationDatabase.deleteMany({ where: { organizationId } })).count;
    techProfileCount += (await tx.organizationERP.deleteMany({ where: { organizationId } })).count;
    techProfileCount += (await tx.organizationCRM.deleteMany({ where: { organizationId } })).count;
    techProfileCount += (await tx.organizationEcommerce.deleteMany({ where: { organizationId } })).count;

    // 4. Delete products
    const deletedProducts = await tx.organizationProduct.deleteMany({
      where: { organizationId },
    });

    // 5. Delete secondary CNAEs
    const deletedCNAEs = await tx.organizationSecondaryCNAE.deleteMany({
      where: { organizationId },
    });

    // 6. Delete activities directly linked to organization
    await tx.activity.deleteMany({
      where: { organizationId },
    });

    // 7. Delete the organization itself
    await tx.organization.delete({
      where: { id: organizationId },
    });

    return {
      deletedContactCount: deletedContacts.count,
      deletedDealCount,
      deletedTechProfileCount: techProfileCount,
      deletedProductCount: deletedProducts.count,
      deletedCNAECount: deletedCNAEs.count,
      success: true,
    };
  });
}
