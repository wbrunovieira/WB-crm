/**
 * Leads Service
 * Phase 9: Architecture Improvements - Service Layer
 *
 * Contains business logic for lead operations:
 * - Conversion preparation and validation
 * - Data mapping for conversion
 * - Lead qualification
 */

import type {
  Lead,
  LeadContact,
  Organization,
  Contact,
  CNAE,
} from "@prisma/client";

export interface LeadWithRelations extends Lead {
  contacts?: LeadContact[];
  primaryCNAE?: CNAE | null;
  secondaryCNAEs?: Array<{ cnae: CNAE }>;
  languages?: Array<{ language: { id: string; name: string } }>;
  frameworks?: Array<{ framework: { id: string; name: string } }>;
  hosting?: Array<{ hosting: { id: string; name: string } }>;
  databases?: Array<{ database: { id: string; name: string } }>;
  erps?: Array<{ erp: { id: string; name: string } }>;
  crms?: Array<{ crm: { id: string; name: string } }>;
  ecommerces?: Array<{ ecommerce: { id: string; name: string } }>;
  products?: Array<{
    product: { id: string; name: string };
    interestLevel?: string;
    notes?: string;
  }>;
}

export interface ConversionValidationResult {
  valid: boolean;
  missingFields: string[];
  warnings: string[];
}

export interface OrganizationData {
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
  ownerId: string;
  sourceLeadId: string;
}

export interface ContactData {
  name: string;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  isPrimary: boolean;
  ownerId: string;
  organizationId?: string;
  sourceLeadContactId: string;
}

// ==================== Conversion Validation ====================

/**
 * Validates if a lead is ready for conversion
 * Returns validation result with missing fields and warnings
 */
export function validateLeadForConversion(
  lead: LeadWithRelations
): ConversionValidationResult {
  const missingFields: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!lead.businessName) {
    missingFields.push("businessName");
  }

  // Check for at least one contact
  if (!lead.contacts || lead.contacts.length === 0) {
    warnings.push("Lead não possui contatos cadastrados");
  }

  // Check for primary contact
  const hasPrimaryContact = lead.contacts?.some((c) => c.isPrimary);
  if (lead.contacts && lead.contacts.length > 0 && !hasPrimaryContact) {
    warnings.push("Nenhum contato marcado como principal");
  }

  // Check if already converted
  if (lead.status === "converted") {
    missingFields.push("status: Lead já foi convertido");
  }

  // Check if disqualified
  if (lead.status === "disqualified") {
    warnings.push("Lead está desqualificado");
  }

  // Recommend CNAE for Brazilian companies
  if (lead.country === "BR" && !lead.primaryCNAEId) {
    warnings.push("CNAE principal não definido para empresa brasileira");
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
    warnings,
  };
}

/**
 * Prepares lead data for conversion
 * Returns data ready for creating organization
 */
export function prepareLeadForConversion(lead: LeadWithRelations): {
  isReady: boolean;
  organizationData: OrganizationData | null;
  contactsData: ContactData[];
  issues: string[];
} {
  const validation = validateLeadForConversion(lead);

  if (!validation.valid) {
    return {
      isReady: false,
      organizationData: null,
      contactsData: [],
      issues: validation.missingFields,
    };
  }

  const organizationData = mapLeadToOrganization(lead);
  const contactsData = lead.contacts?.map((c) => mapLeadContactToContact(c, lead.ownerId)) || [];

  return {
    isReady: true,
    organizationData,
    contactsData,
    issues: validation.warnings,
  };
}

// ==================== Data Mapping ====================

/**
 * Maps lead data to organization data structure
 */
export function mapLeadToOrganization(lead: LeadWithRelations): OrganizationData {
  return {
    name: lead.businessName!,
    legalName: lead.legalName,
    website: lead.website,
    phone: lead.phone,
    country: lead.country,
    state: lead.state,
    city: lead.city,
    address: lead.address,
    postalCode: lead.postalCode,
    industry: lead.industry,
    employeeCount: lead.employeeCount,
    annualRevenue: lead.annualRevenue,
    cnpj: lead.cnpj,
    primaryCNAEId: lead.primaryCNAEId,
    internationalActivity: lead.internationalActivity,
    techDetails: lead.techDetails,
    ownerId: lead.ownerId,
    sourceLeadId: lead.id,
  };
}

/**
 * Maps lead contact data to contact data structure
 */
export function mapLeadContactToContact(
  leadContact: LeadContact,
  ownerId: string
): ContactData {
  return {
    name: leadContact.name,
    email: leadContact.email,
    phone: leadContact.phone,
    position: leadContact.position,
    isPrimary: leadContact.isPrimary || false,
    ownerId,
    sourceLeadContactId: leadContact.id,
  };
}

/**
 * Maps CNAE data for transfer
 */
export function mapCNAEsForTransfer(lead: LeadWithRelations): {
  primaryCNAEId: string | null;
  secondaryCNAEIds: string[];
} {
  return {
    primaryCNAEId: lead.primaryCNAEId,
    secondaryCNAEIds: lead.secondaryCNAEs?.map((sc) => sc.cnae.id) || [],
  };
}

/**
 * Maps tech profile for transfer
 */
export function mapTechProfileForTransfer(lead: LeadWithRelations): {
  languageIds: string[];
  frameworkIds: string[];
  hostingIds: string[];
  databaseIds: string[];
  erpIds: string[];
  crmIds: string[];
  ecommerceIds: string[];
} {
  return {
    languageIds: lead.languages?.map((l) => l.language.id) || [],
    frameworkIds: lead.frameworks?.map((f) => f.framework.id) || [],
    hostingIds: lead.hosting?.map((h) => h.hosting.id) || [],
    databaseIds: lead.databases?.map((d) => d.database.id) || [],
    erpIds: lead.erps?.map((e) => e.erp.id) || [],
    crmIds: lead.crms?.map((c) => c.crm.id) || [],
    ecommerceIds: lead.ecommerces?.map((e) => e.ecommerce.id) || [],
  };
}

/**
 * Maps products for transfer
 */
export function mapProductsForTransfer(lead: LeadWithRelations): Array<{
  productId: string;
  interestLevel?: string;
  notes?: string;
}> {
  return (
    lead.products?.map((p) => ({
      productId: p.product.id,
      interestLevel: p.interestLevel,
      notes: p.notes,
    })) || []
  );
}

// ==================== Lead Qualification ====================

/**
 * Calculates lead score based on completeness
 */
export function calculateLeadScore(lead: LeadWithRelations): number {
  let score = 0;

  // Basic info (30 points)
  if (lead.businessName) score += 10;
  if (lead.website) score += 5;
  if (lead.phone) score += 5;
  if (lead.industry) score += 5;
  if (lead.employeeCount) score += 5;

  // Contact info (30 points)
  if (lead.contacts && lead.contacts.length > 0) {
    score += 15;
    if (lead.contacts.some((c) => c.isPrimary)) score += 5;
    if (lead.contacts.some((c) => c.email)) score += 5;
    if (lead.contacts.some((c) => c.phone)) score += 5;
  }

  // Location (10 points)
  if (lead.country) score += 3;
  if (lead.state) score += 3;
  if (lead.city) score += 4;

  // Business details (20 points)
  if (lead.cnpj || lead.country !== "BR") score += 10;
  if (lead.primaryCNAEId || lead.internationalActivity) score += 10;

  // Tech profile (10 points)
  const hasTechProfile =
    (lead.languages?.length ?? 0) > 0 ||
    (lead.frameworks?.length ?? 0) > 0 ||
    (lead.databases?.length ?? 0) > 0;
  if (hasTechProfile) score += 10;

  return Math.min(score, 100);
}

/**
 * Determines lead quality based on score
 */
export function getLeadQuality(score: number): "cold" | "warm" | "hot" {
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}
