"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  leadICPSchema,
  leadICPExtendedSchema,
  organizationICPSchema,
  organizationICPExtendedSchema,
  type LeadICPFormData,
  type LeadICPExtendedFormData,
  type OrganizationICPFormData,
  type OrganizationICPExtendedFormData,
} from "@/lib/validations/icp";
import {
  getAuthenticatedSession,
  getOwnerFilter,
} from "@/lib/permissions";

// ============ LINK LEAD TO ICP ============

/**
 * Link a Lead to an ICP
 */
export async function linkLeadToICP(data: LeadICPFormData) {
  await getAuthenticatedSession();
  const validated = leadICPSchema.parse(data);
  const ownerFilter = await getOwnerFilter();

  // Check lead access
  const lead = await prisma.lead.findFirst({
    where: {
      id: validated.leadId,
      ...ownerFilter,
    },
  });

  if (!lead) {
    throw new Error("Lead não encontrado");
  }

  // Check ICP access
  const icp = await prisma.iCP.findFirst({
    where: {
      id: validated.icpId,
      ...ownerFilter,
    },
  });

  if (!icp) {
    throw new Error("ICP não encontrado");
  }

  // Check if already linked
  const existingLink = await prisma.leadICP.findUnique({
    where: {
      leadId_icpId: {
        leadId: validated.leadId,
        icpId: validated.icpId,
      },
    },
  });

  if (existingLink) {
    throw new Error("Lead já está vinculado a este ICP");
  }

  // Create link
  const link = await prisma.leadICP.create({
    data: {
      leadId: validated.leadId,
      icpId: validated.icpId,
      matchScore: validated.matchScore,
      notes: validated.notes,
    },
    include: {
      icp: true,
    },
  });

  revalidatePath(`/leads/${validated.leadId}`);
  revalidatePath(`/admin/icps/${validated.icpId}`);
  return link;
}

/**
 * Update a Lead ICP link with extended categorization fields
 */
export async function updateLeadICP(data: LeadICPExtendedFormData) {
  await getAuthenticatedSession();
  const validated = leadICPExtendedSchema.parse(data);
  const ownerFilter = await getOwnerFilter();

  // Check lead access
  const lead = await prisma.lead.findFirst({
    where: {
      id: validated.leadId,
      ...ownerFilter,
    },
  });

  if (!lead) {
    throw new Error("Lead não encontrado");
  }

  // Check if link exists
  const existingLink = await prisma.leadICP.findUnique({
    where: {
      leadId_icpId: {
        leadId: validated.leadId,
        icpId: validated.icpId,
      },
    },
  });

  if (!existingLink) {
    throw new Error("Vínculo não encontrado");
  }

  // Update link with extended fields
  const link = await prisma.leadICP.update({
    where: {
      leadId_icpId: {
        leadId: validated.leadId,
        icpId: validated.icpId,
      },
    },
    data: {
      matchScore: validated.matchScore,
      notes: validated.notes,
      // Essential fields
      icpFitStatus: validated.icpFitStatus,
      realDecisionMaker: validated.realDecisionMaker,
      realDecisionMakerOther: validated.realDecisionMakerOther,
      perceivedUrgency: validated.perceivedUrgency ? JSON.stringify(validated.perceivedUrgency) : null,
      businessMoment: validated.businessMoment ? JSON.stringify(validated.businessMoment) : null,
      // Specific fields
      currentPlatforms: validated.currentPlatforms ? JSON.stringify(validated.currentPlatforms) : null,
      fragmentationLevel: validated.fragmentationLevel,
      mainDeclaredPain: validated.mainDeclaredPain,
      strategicDesire: validated.strategicDesire,
      perceivedTechnicalComplexity: validated.perceivedTechnicalComplexity,
      // Strategic fields
      purchaseTrigger: validated.purchaseTrigger,
      nonClosingReason: validated.nonClosingReason,
      estimatedDecisionTime: validated.estimatedDecisionTime,
      expansionPotential: validated.expansionPotential,
    },
    include: {
      icp: true,
    },
  });

  revalidatePath(`/leads/${validated.leadId}`);
  revalidatePath(`/admin/icps/${validated.icpId}`);
  return link;
}

/**
 * Unlink a Lead from an ICP
 */
export async function unlinkLeadFromICP(leadId: string, icpId: string) {
  await getAuthenticatedSession();
  const ownerFilter = await getOwnerFilter();

  // Check lead access
  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      ...ownerFilter,
    },
  });

  if (!lead) {
    throw new Error("Lead não encontrado");
  }

  // Check if link exists
  const existingLink = await prisma.leadICP.findUnique({
    where: {
      leadId_icpId: {
        leadId,
        icpId,
      },
    },
  });

  if (!existingLink) {
    throw new Error("Vínculo não encontrado");
  }

  // Delete link
  await prisma.leadICP.delete({
    where: {
      leadId_icpId: {
        leadId,
        icpId,
      },
    },
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath(`/admin/icps/${icpId}`);
}

/**
 * Get all ICPs linked to a Lead
 */
export async function getLeadICPs(leadId: string) {
  await getAuthenticatedSession();
  const ownerFilter = await getOwnerFilter();

  // Check lead access
  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      ...ownerFilter,
    },
  });

  if (!lead) {
    throw new Error("Lead não encontrado");
  }

  const links = await prisma.leadICP.findMany({
    where: { leadId },
    include: {
      icp: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return links;
}

// ============ LINK ORGANIZATION TO ICP ============

/**
 * Link an Organization to an ICP
 */
export async function linkOrganizationToICP(data: OrganizationICPFormData) {
  await getAuthenticatedSession();
  const validated = organizationICPSchema.parse(data);
  const ownerFilter = await getOwnerFilter();

  // Check organization access
  const organization = await prisma.organization.findFirst({
    where: {
      id: validated.organizationId,
      ...ownerFilter,
    },
  });

  if (!organization) {
    throw new Error("Organização não encontrada");
  }

  // Check ICP access
  const icp = await prisma.iCP.findFirst({
    where: {
      id: validated.icpId,
      ...ownerFilter,
    },
  });

  if (!icp) {
    throw new Error("ICP não encontrado");
  }

  // Check if already linked
  const existingLink = await prisma.organizationICP.findUnique({
    where: {
      organizationId_icpId: {
        organizationId: validated.organizationId,
        icpId: validated.icpId,
      },
    },
  });

  if (existingLink) {
    throw new Error("Organização já está vinculada a este ICP");
  }

  // Create link
  const link = await prisma.organizationICP.create({
    data: {
      organizationId: validated.organizationId,
      icpId: validated.icpId,
      matchScore: validated.matchScore,
      notes: validated.notes,
    },
    include: {
      icp: true,
    },
  });

  revalidatePath(`/organizations/${validated.organizationId}`);
  revalidatePath(`/admin/icps/${validated.icpId}`);
  return link;
}

/**
 * Update an Organization ICP link with extended categorization fields
 */
export async function updateOrganizationICP(data: OrganizationICPExtendedFormData) {
  await getAuthenticatedSession();
  const validated = organizationICPExtendedSchema.parse(data);
  const ownerFilter = await getOwnerFilter();

  // Check organization access
  const organization = await prisma.organization.findFirst({
    where: {
      id: validated.organizationId,
      ...ownerFilter,
    },
  });

  if (!organization) {
    throw new Error("Organização não encontrada");
  }

  // Check if link exists
  const existingLink = await prisma.organizationICP.findUnique({
    where: {
      organizationId_icpId: {
        organizationId: validated.organizationId,
        icpId: validated.icpId,
      },
    },
  });

  if (!existingLink) {
    throw new Error("Vínculo não encontrado");
  }

  // Update link with extended fields
  const link = await prisma.organizationICP.update({
    where: {
      organizationId_icpId: {
        organizationId: validated.organizationId,
        icpId: validated.icpId,
      },
    },
    data: {
      matchScore: validated.matchScore,
      notes: validated.notes,
      // Essential fields
      icpFitStatus: validated.icpFitStatus,
      realDecisionMaker: validated.realDecisionMaker,
      realDecisionMakerOther: validated.realDecisionMakerOther,
      perceivedUrgency: validated.perceivedUrgency ? JSON.stringify(validated.perceivedUrgency) : null,
      businessMoment: validated.businessMoment ? JSON.stringify(validated.businessMoment) : null,
      // Specific fields
      currentPlatforms: validated.currentPlatforms ? JSON.stringify(validated.currentPlatforms) : null,
      fragmentationLevel: validated.fragmentationLevel,
      mainDeclaredPain: validated.mainDeclaredPain,
      strategicDesire: validated.strategicDesire,
      perceivedTechnicalComplexity: validated.perceivedTechnicalComplexity,
      // Strategic fields
      purchaseTrigger: validated.purchaseTrigger,
      nonClosingReason: validated.nonClosingReason,
      estimatedDecisionTime: validated.estimatedDecisionTime,
      expansionPotential: validated.expansionPotential,
    },
    include: {
      icp: true,
    },
  });

  revalidatePath(`/organizations/${validated.organizationId}`);
  revalidatePath(`/admin/icps/${validated.icpId}`);
  return link;
}

/**
 * Unlink an Organization from an ICP
 */
export async function unlinkOrganizationFromICP(organizationId: string, icpId: string) {
  await getAuthenticatedSession();
  const ownerFilter = await getOwnerFilter();

  // Check organization access
  const organization = await prisma.organization.findFirst({
    where: {
      id: organizationId,
      ...ownerFilter,
    },
  });

  if (!organization) {
    throw new Error("Organização não encontrada");
  }

  // Check if link exists
  const existingLink = await prisma.organizationICP.findUnique({
    where: {
      organizationId_icpId: {
        organizationId,
        icpId,
      },
    },
  });

  if (!existingLink) {
    throw new Error("Vínculo não encontrado");
  }

  // Delete link
  await prisma.organizationICP.delete({
    where: {
      organizationId_icpId: {
        organizationId,
        icpId,
      },
    },
  });

  revalidatePath(`/organizations/${organizationId}`);
  revalidatePath(`/admin/icps/${icpId}`);
}

/**
 * Get all ICPs linked to an Organization
 */
export async function getOrganizationICPs(organizationId: string) {
  await getAuthenticatedSession();
  const ownerFilter = await getOwnerFilter();

  // Check organization access
  const organization = await prisma.organization.findFirst({
    where: {
      id: organizationId,
      ...ownerFilter,
    },
  });

  if (!organization) {
    throw new Error("Organização não encontrada");
  }

  const links = await prisma.organizationICP.findMany({
    where: { organizationId },
    include: {
      icp: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return links;
}

// ============ GET ENTITIES FOR ICP ============

/**
 * Get all Leads linked to an ICP
 */
export async function getICPLeads(icpId: string) {
  await getAuthenticatedSession();
  const ownerFilter = await getOwnerFilter();

  // Check ICP access
  const icp = await prisma.iCP.findFirst({
    where: {
      id: icpId,
      ...ownerFilter,
    },
  });

  if (!icp) {
    throw new Error("ICP não encontrado");
  }

  const links = await prisma.leadICP.findMany({
    where: { icpId },
    include: {
      lead: {
        select: {
          id: true,
          businessName: true,
          city: true,
          state: true,
          status: true,
          quality: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return links;
}

/**
 * Get all Organizations linked to an ICP
 */
export async function getICPOrganizations(icpId: string) {
  await getAuthenticatedSession();
  const ownerFilter = await getOwnerFilter();

  // Check ICP access
  const icp = await prisma.iCP.findFirst({
    where: {
      id: icpId,
      ...ownerFilter,
    },
  });

  if (!icp) {
    throw new Error("ICP não encontrado");
  }

  const links = await prisma.organizationICP.findMany({
    where: { icpId },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          industry: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return links;
}

// ============ COPY ICP LINKS ON CONVERSION ============

/**
 * Copy ICP links from Lead to Organization (used during conversion)
 * This function is called internally when converting a Lead to Organization
 */
export async function copyLeadICPsToOrganization(leadId: string, organizationId: string) {
  // Get all ICP links from the lead
  const leadICPs = await prisma.leadICP.findMany({
    where: { leadId },
  });

  if (leadICPs.length === 0) {
    return [];
  }

  // Create organization ICP links (no skipDuplicates needed since this is during conversion)
  // Copy all extended categorization fields
  const organizationICPs = await prisma.organizationICP.createMany({
    data: leadICPs.map((link) => ({
      organizationId,
      icpId: link.icpId,
      matchScore: link.matchScore,
      notes: link.notes,
      // Essential fields
      icpFitStatus: link.icpFitStatus,
      realDecisionMaker: link.realDecisionMaker,
      realDecisionMakerOther: link.realDecisionMakerOther,
      perceivedUrgency: link.perceivedUrgency,
      businessMoment: link.businessMoment,
      // Specific fields
      currentPlatforms: link.currentPlatforms,
      fragmentationLevel: link.fragmentationLevel,
      mainDeclaredPain: link.mainDeclaredPain,
      strategicDesire: link.strategicDesire,
      perceivedTechnicalComplexity: link.perceivedTechnicalComplexity,
      // Strategic fields
      purchaseTrigger: link.purchaseTrigger,
      nonClosingReason: link.nonClosingReason,
      estimatedDecisionTime: link.estimatedDecisionTime,
      expansionPotential: link.expansionPotential,
    })),
  });

  return organizationICPs;
}
