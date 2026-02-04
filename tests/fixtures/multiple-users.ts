import type { User } from '@prisma/client';
import type { Session } from 'next-auth';
import type { UserRole } from '@/types/next-auth';

// User A - SDR role (can only see own data)
export const userA: User = {
  id: 'user-a-id-123',
  email: 'user-a@example.com',
  name: 'User A (SDR)',
  emailVerified: null,
  image: null,
  password: 'hashed-password-a',
  role: 'sdr',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// User B - SDR role (can only see own data)
export const userB: User = {
  id: 'user-b-id-456',
  email: 'user-b@example.com',
  name: 'User B (SDR)',
  emailVerified: null,
  image: null,
  password: 'hashed-password-b',
  role: 'sdr',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// User C - Closer role (can only see own data)
export const userC: User = {
  id: 'user-c-id-789',
  email: 'user-c@example.com',
  name: 'User C (Closer)',
  emailVerified: null,
  image: null,
  password: 'hashed-password-c',
  role: 'closer',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// Admin User - Can see all data
export const adminUser: User = {
  id: 'admin-id-000',
  email: 'admin@example.com',
  name: 'Admin User',
  emailVerified: null,
  image: null,
  password: 'hashed-password-admin',
  role: 'admin',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// Sessions
export const sessionUserA: Session = {
  user: {
    id: userA.id,
    email: userA.email,
    name: userA.name,
    role: userA.role as UserRole,
  },
  expires: '2025-12-31T23:59:59.999Z',
};

export const sessionUserB: Session = {
  user: {
    id: userB.id,
    email: userB.email,
    name: userB.name,
    role: userB.role as UserRole,
  },
  expires: '2025-12-31T23:59:59.999Z',
};

export const sessionUserC: Session = {
  user: {
    id: userC.id,
    email: userC.email,
    name: userC.name,
    role: userC.role as UserRole,
  },
  expires: '2025-12-31T23:59:59.999Z',
};

export const sessionAdmin: Session = {
  user: {
    id: adminUser.id,
    email: adminUser.email,
    name: adminUser.name,
    role: adminUser.role as UserRole,
  },
  expires: '2025-12-31T23:59:59.999Z',
};

// Helper to create mock entities with owner
export function createMockDeal(ownerId: string, overrides: Partial<{
  id: string;
  title: string;
  value: number;
  status: string;
}> = {}) {
  return {
    id: overrides.id || `deal-${ownerId}-${Date.now()}`,
    title: overrides.title || `Deal owned by ${ownerId}`,
    value: overrides.value || 10000,
    currency: 'BRL',
    status: overrides.status || 'open',
    stageId: 'stage-1',
    contactId: null,
    organizationId: null,
    expectedCloseDate: null,
    ownerId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function createMockContact(ownerId: string, overrides: Partial<{
  id: string;
  name: string;
  email: string;
}> = {}) {
  return {
    id: overrides.id || `contact-${ownerId}-${Date.now()}`,
    name: overrides.name || `Contact owned by ${ownerId}`,
    email: overrides.email || `contact-${ownerId}@example.com`,
    phone: null,
    whatsapp: null,
    role: null,
    department: null,
    organizationId: null,
    leadId: null,
    partnerId: null,
    linkedin: null,
    status: 'active',
    isPrimary: false,
    birthDate: null,
    notes: null,
    preferredLanguage: 'pt-BR',
    source: null,
    sourceLeadContactId: null,
    ownerId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function createMockLead(ownerId: string, overrides: Partial<{
  id: string;
  businessName: string;
  status: string;
  convertedAt: Date | null;
  convertedToOrganizationId: string | null;
}> = {}) {
  return {
    id: overrides.id || `lead-${ownerId}-${Date.now()}`,
    googleId: null,
    businessName: overrides.businessName || `Lead owned by ${ownerId}`,
    registeredName: null,
    companyRegistrationID: null,
    website: null,
    email: null,
    phone: null,
    whatsapp: null,
    country: 'Brasil',
    state: null,
    city: null,
    zipCode: null,
    address: null,
    vicinity: null,
    foundationDate: null,
    description: null,
    // Google Places fields
    categories: null,
    rating: null,
    priceLevel: null,
    userRatingsTotal: null,
    permanentlyClosed: false,
    types: null,
    // Business info
    equityCapital: null,
    businessStatus: null,
    primaryActivity: null,
    secondaryActivities: null,
    status: overrides.status || 'new',
    quality: null,
    source: null,
    employeesCount: null,
    revenue: null,
    companySize: null,
    companyOwner: null,
    searchTerm: null,
    fieldsFilled: null,
    category: null,
    radius: null,
    instagram: null,
    linkedin: null,
    facebook: null,
    twitter: null,
    tiktok: null,
    convertedAt: overrides.convertedAt ?? null,
    convertedToOrganizationId: overrides.convertedToOrganizationId ?? null,
    referredByPartnerId: null,
    labelId: null,
    primaryCNAEId: null,
    internationalActivity: null,
    ownerId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function createMockOrganization(ownerId: string, overrides: Partial<{
  id: string;
  name: string;
  hasHosting: boolean;
  hostingRenewalDate: Date | null;
  hostingPlan: string | null;
  hostingValue: number | null;
  hostingReminderDays: number;
  hostingNotes: string | null;
}> = {}) {
  return {
    id: overrides.id || `org-${ownerId}-${Date.now()}`,
    name: overrides.name || `Organization owned by ${ownerId}`,
    legalName: null,
    foundationDate: null,
    website: null,
    phone: null,
    whatsapp: null,
    email: null,
    country: null,
    state: null,
    city: null,
    zipCode: null,
    streetAddress: null,
    industry: null,
    employeeCount: null,
    annualRevenue: null,
    taxId: null,
    description: null,
    companyOwner: null,
    companySize: null,
    primaryCNAEId: null,
    internationalActivity: null,
    instagram: null,
    linkedin: null,
    facebook: null,
    twitter: null,
    tiktok: null,
    sourceLeadId: null,
    externalProjectIds: null,
    labelId: null,
    // Hosting fields
    hasHosting: overrides.hasHosting ?? false,
    hostingRenewalDate: overrides.hostingRenewalDate ?? null,
    hostingPlan: overrides.hostingPlan ?? null,
    hostingValue: overrides.hostingValue ?? null,
    hostingReminderDays: overrides.hostingReminderDays ?? 30,
    hostingNotes: overrides.hostingNotes ?? null,
    ownerId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function createMockActivity(ownerId: string, overrides: Partial<{
  id: string;
  subject: string;
  type: string;
}> = {}) {
  return {
    id: overrides.id || `activity-${ownerId}-${Date.now()}`,
    type: overrides.type || 'call',
    subject: overrides.subject || `Activity owned by ${ownerId}`,
    description: null,
    dueDate: null,
    completed: false,
    dealId: null,
    contactId: null,
    contactIds: null,
    leadId: null,
    partnerId: null,
    ownerId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function createMockPartner(ownerId: string, overrides: Partial<{
  id: string;
  name: string;
  partnerType: string;
}> = {}) {
  return {
    id: overrides.id || `partner-${ownerId}-${Date.now()}`,
    name: overrides.name || `Partner owned by ${ownerId}`,
    legalName: null,
    foundationDate: null,
    partnerType: overrides.partnerType || 'indicador',
    website: null,
    email: null,
    phone: null,
    whatsapp: null,
    country: null,
    state: null,
    city: null,
    zipCode: null,
    streetAddress: null,
    linkedin: null,
    instagram: null,
    facebook: null,
    twitter: null,
    industry: null,
    employeeCount: null,
    companySize: null,
    description: null,
    expertise: null,
    notes: null,
    lastContactDate: new Date(),
    ownerId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function createMockLeadContact(leadId: string, overrides: Partial<{
  id: string;
  name: string;
  email: string;
  isPrimary: boolean;
  convertedToContactId: string | null;
}> = {}) {
  return {
    id: overrides.id || `lead-contact-${leadId}-${Date.now()}`,
    name: overrides.name || `Contact for lead ${leadId}`,
    email: overrides.email || null,
    phone: null,
    whatsapp: null,
    role: null,
    isPrimary: overrides.isPrimary ?? false,
    leadId,
    convertedToContactId: overrides.convertedToContactId ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function createMockLeadICP(leadId: string, icpId: string, overrides: Partial<{
  id: string;
  matchScore: number | null;
  notes: string | null;
  icpFitStatus: string | null;
  realDecisionMaker: string | null;
  realDecisionMakerOther: string | null;
  perceivedUrgency: string | null;
  businessMoment: string | null;
  currentPlatforms: string | null;
  fragmentationLevel: number | null;
  mainDeclaredPain: string | null;
  strategicDesire: string | null;
  perceivedTechnicalComplexity: number | null;
  purchaseTrigger: string | null;
  nonClosingReason: string | null;
  estimatedDecisionTime: string | null;
  expansionPotential: number | null;
}> = {}) {
  return {
    id: overrides.id || `lead-icp-${leadId}-${icpId}`,
    leadId,
    icpId,
    matchScore: overrides.matchScore ?? null,
    notes: overrides.notes ?? null,
    // Essential Fields
    icpFitStatus: overrides.icpFitStatus ?? null,
    realDecisionMaker: overrides.realDecisionMaker ?? null,
    realDecisionMakerOther: overrides.realDecisionMakerOther ?? null,
    perceivedUrgency: overrides.perceivedUrgency ?? null,
    businessMoment: overrides.businessMoment ?? null,
    // Specific Fields
    currentPlatforms: overrides.currentPlatforms ?? null,
    fragmentationLevel: overrides.fragmentationLevel ?? null,
    mainDeclaredPain: overrides.mainDeclaredPain ?? null,
    strategicDesire: overrides.strategicDesire ?? null,
    perceivedTechnicalComplexity: overrides.perceivedTechnicalComplexity ?? null,
    // Strategic Fields
    purchaseTrigger: overrides.purchaseTrigger ?? null,
    nonClosingReason: overrides.nonClosingReason ?? null,
    estimatedDecisionTime: overrides.estimatedDecisionTime ?? null,
    expansionPotential: overrides.expansionPotential ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function createMockOrganizationICP(organizationId: string, icpId: string, overrides: Partial<{
  id: string;
  matchScore: number | null;
  notes: string | null;
  icpFitStatus: string | null;
  realDecisionMaker: string | null;
  realDecisionMakerOther: string | null;
  perceivedUrgency: string | null;
  businessMoment: string | null;
  currentPlatforms: string | null;
  fragmentationLevel: number | null;
  mainDeclaredPain: string | null;
  strategicDesire: string | null;
  perceivedTechnicalComplexity: number | null;
  purchaseTrigger: string | null;
  nonClosingReason: string | null;
  estimatedDecisionTime: string | null;
  expansionPotential: number | null;
}> = {}) {
  return {
    id: overrides.id || `org-icp-${organizationId}-${icpId}`,
    organizationId,
    icpId,
    matchScore: overrides.matchScore ?? null,
    notes: overrides.notes ?? null,
    // Essential Fields
    icpFitStatus: overrides.icpFitStatus ?? null,
    realDecisionMaker: overrides.realDecisionMaker ?? null,
    realDecisionMakerOther: overrides.realDecisionMakerOther ?? null,
    perceivedUrgency: overrides.perceivedUrgency ?? null,
    businessMoment: overrides.businessMoment ?? null,
    // Specific Fields
    currentPlatforms: overrides.currentPlatforms ?? null,
    fragmentationLevel: overrides.fragmentationLevel ?? null,
    mainDeclaredPain: overrides.mainDeclaredPain ?? null,
    strategicDesire: overrides.strategicDesire ?? null,
    perceivedTechnicalComplexity: overrides.perceivedTechnicalComplexity ?? null,
    // Strategic Fields
    purchaseTrigger: overrides.purchaseTrigger ?? null,
    nonClosingReason: overrides.nonClosingReason ?? null,
    estimatedDecisionTime: overrides.estimatedDecisionTime ?? null,
    expansionPotential: overrides.expansionPotential ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
