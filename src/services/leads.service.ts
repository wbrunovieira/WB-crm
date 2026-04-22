/**
 * Leads Service
 * Pure utility functions for lead data processing and conversion
 */

import type { LeadContact } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LeadWithRelations {
  id: string;
  googleId: string | null;
  businessName: string;
  registeredName: string | null;
  foundationDate: Date | null;
  companyRegistrationID: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zipCode: string | null;
  vicinity: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  email: string | null;
  instagram: string | null;
  linkedin: string | null;
  facebook: string | null;
  twitter: string | null;
  tiktok: string | null;
  categories: string | null;
  rating: number | null;
  priceLevel: number | null;
  userRatingsTotal: number | null;
  permanentlyClosed: boolean;
  types: string | null;
  companyOwner: string | null;
  companySize: string | null;
  revenue: number | null;
  employeesCount: number | null;
  description: string | null;
  equityCapital: number | null;
  businessStatus: string | null;
  primaryActivity: string | null;
  secondaryActivities: string | null;
  primaryCNAEId: string | null;
  internationalActivity: string | null;
  source: string | null;
  quality: string | null;
  searchTerm: string | null;
  fieldsFilled: number | null;
  category: string | null;
  radius: number | null;
  status: string;
  convertedAt: Date | null;
  convertedToOrganizationId: string | null;
  referredByPartnerId: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  languages: string | null;
  contacts: LeadContact[];
  primaryCNAE: { id: string; code: string; description: string } | null;
  secondaryCNAEs: Array<{ cnae: { id: string; code: string; description: string } }>;
  leadLanguages: Array<{ language: { id: string; name: string } }>;
  leadFrameworks: Array<{ framework: { id: string; name: string } }>;
  leadHosting: Array<{ hosting: { id: string; name: string } }>;
  leadDatabases: Array<{ database: { id: string; name: string } }>;
  leadERPs: Array<{ erp: { id: string; name: string } }>;
  leadCRMs: Array<{ crm: { id: string; name: string } }>;
  leadEcommerces: Array<{ ecommerce: { id: string; name: string } }>;
  products: Array<unknown>;
}

export interface ValidationResult {
  valid: boolean;
  missingFields: string[];
  warnings: string[];
}

export interface ConversionPreparation {
  isReady: boolean;
  organizationData: OrganizationData | null;
  contactsData: ContactData[];
  issues: string[];
}

export interface OrganizationData {
  name: string;
  legalName: string | null;
  website: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  address: string | null;
  streetAddress: string | null;
  postalCode: string | null;
  employeeCount: number | null;
  annualRevenue: number | null;
  cnpj: string | null;
  primaryCNAEId: string | null;
  internationalActivity: string | null;
  ownerId: string;
  sourceLeadId: string;
}

export interface ContactData {
  name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  isPrimary: boolean;
  ownerId: string;
  sourceLeadContactId: string;
}

export interface CNAETransferData {
  primaryCNAEId: string | null;
  secondaryCNAEIds: string[];
}

export interface TechProfileTransferData {
  languageIds: string[];
  frameworkIds: string[];
  hostingIds: string[];
  databaseIds: string[];
  erpIds: string[];
  crmIds: string[];
  ecommerceIds: string[];
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateLeadForConversion(lead: LeadWithRelations): ValidationResult {
  const missingFields: string[] = [];
  const warnings: string[] = [];

  if (!lead.businessName) {
    missingFields.push("businessName");
  }

  if (lead.status === "converted") {
    missingFields.push("Lead já foi convertido");
  }

  if (lead.status === "disqualified") {
    warnings.push("Lead está desqualificado");
  }

  if (!lead.contacts || lead.contacts.length === 0) {
    warnings.push("Lead não possui contatos cadastrados");
  } else if (!lead.contacts.some((c) => c.isPrimary)) {
    warnings.push("Nenhum contato marcado como principal");
  }

  if (lead.country === "BR" && !lead.primaryCNAEId) {
    warnings.push("Lead brasileiro sem CNAE primário definido");
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
    warnings,
  };
}

export function prepareLeadForConversion(lead: LeadWithRelations): ConversionPreparation {
  const validation = validateLeadForConversion(lead);
  const issues = [...validation.missingFields, ...validation.warnings];

  if (!validation.valid) {
    return {
      isReady: false,
      organizationData: null,
      contactsData: [],
      issues,
    };
  }

  const organizationData = mapLeadToOrganization(lead);
  const contactsData = (lead.contacts ?? []).map((c) =>
    mapLeadContactToContact(c, lead.ownerId)
  );

  return {
    isReady: true,
    organizationData,
    contactsData,
    issues,
  };
}

// ─── Mapping ──────────────────────────────────────────────────────────────────

export function mapLeadToOrganization(lead: LeadWithRelations): OrganizationData {
  return {
    name: lead.businessName,
    legalName: lead.registeredName,
    website: lead.website,
    phone: lead.phone,
    whatsapp: lead.whatsapp,
    email: lead.email,
    country: lead.country,
    state: lead.state,
    city: lead.city,
    address: lead.address,
    streetAddress: lead.address,
    postalCode: lead.zipCode,
    employeeCount: lead.employeesCount,
    annualRevenue: lead.revenue,
    cnpj: lead.companyRegistrationID,
    primaryCNAEId: lead.primaryCNAEId,
    internationalActivity: lead.internationalActivity,
    ownerId: lead.ownerId,
    sourceLeadId: lead.id,
  };
}

export function mapLeadContactToContact(
  contact: LeadContact,
  ownerId: string
): ContactData {
  return {
    name: contact.name,
    email: contact.email ?? null,
    phone: contact.phone ?? null,
    position: contact.role ?? null,
    isPrimary: contact.isPrimary,
    ownerId,
    sourceLeadContactId: contact.id,
  };
}

export function mapCNAEsForTransfer(lead: LeadWithRelations): CNAETransferData {
  return {
    primaryCNAEId: lead.primaryCNAEId,
    secondaryCNAEIds: (lead.secondaryCNAEs ?? []).map((s) => s.cnae.id),
  };
}

export function mapTechProfileForTransfer(lead: LeadWithRelations): TechProfileTransferData {
  return {
    languageIds: (lead.leadLanguages ?? []).map((l) => l.language.id),
    frameworkIds: (lead.leadFrameworks ?? []).map((f) => f.framework.id),
    hostingIds: (lead.leadHosting ?? []).map((h) => h.hosting.id),
    databaseIds: (lead.leadDatabases ?? []).map((d) => d.database.id),
    erpIds: (lead.leadERPs ?? []).map((e) => e.erp.id),
    crmIds: (lead.leadCRMs ?? []).map((c) => c.crm.id),
    ecommerceIds: (lead.leadEcommerces ?? []).map((e) => e.ecommerce.id),
  };
}

export interface ProductTransferData {
  productId: string;
  interestLevel: string | null;
  notes: string | null;
}

export function mapProductsForTransfer(lead: LeadWithRelations): ProductTransferData[] {
  const products = (lead.products ?? []) as Array<{
    product?: { id: string; name: string };
    interestLevel?: string | null;
    notes?: string | null;
  }>;
  return products
    .filter((p) => p.product?.id)
    .map((p) => ({
      productId: p.product!.id,
      interestLevel: p.interestLevel ?? null,
      notes: p.notes ?? null,
    }));
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

export function calculateLeadScore(lead: LeadWithRelations): number {
  let score = 0;

  if (lead.businessName) score += 10;
  if (lead.website) score += 10;
  if (lead.phone) score += 5;
  if (lead.email) score += 5;
  if (lead.city) score += 5;
  if (lead.state) score += 3;
  if (lead.country) score += 2;
  if (lead.categories || lead.companySize) score += 5;
  if (lead.employeesCount) score += 5;
  if (lead.companyRegistrationID) score += 10;
  if (lead.primaryCNAEId) score += 10;
  if (lead.contacts && lead.contacts.length > 0) score += 15;
  if (lead.leadLanguages && lead.leadLanguages.length > 0) score += 5;
  if (lead.description) score += 5;

  return Math.min(100, score);
}

export function getLeadQuality(score: number): "hot" | "warm" | "cold" {
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}
