export interface LeadContactRecord {
  id: string;
  leadId: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  linkedin: string | null;
  instagram: string | null;
  isPrimary: boolean;
  isActive: boolean;
  languages: string | null;
  commLanguage: string;
  convertedToContactId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeadContactData {
  leadId: string;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  linkedin?: string;
  instagram?: string;
  isPrimary?: boolean;
  languages?: string;
  commLanguage?: string;
}

export interface UpdateLeadContactData {
  name?: string;
  role?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  linkedin?: string;
  instagram?: string;
  isPrimary?: boolean;
  languages?: string;
  commLanguage?: string;
}

export interface EmailVerificationData {
  valid: boolean;
  status: string;
  reason: string;
  verifiedAt: Date;
}

export abstract class LeadContactsRepository {
  abstract findByLead(leadId: string): Promise<LeadContactRecord[]>;
  abstract findById(id: string): Promise<LeadContactRecord | null>;
  abstract create(data: CreateLeadContactData): Promise<LeadContactRecord>;
  abstract update(id: string, data: UpdateLeadContactData): Promise<LeadContactRecord>;
  abstract toggleActive(id: string): Promise<LeadContactRecord>;
  abstract delete(id: string): Promise<void>;
  /** Persist the outcome of an email verification on the lead contact. */
  abstract saveEmailVerification(id: string, data: EmailVerificationData): Promise<void>;
  /** Returns the leadId of the owner's lead contact matching this email (case-insensitive), or null. */
  abstract findLeadIdByContactEmailForOwner(email: string, ownerId: string): Promise<string | null>;
  /** Persist the outcome of a phone verification on the lead contact. */
  abstract savePhoneVerification(id: string, data: { phoneValid: boolean; phoneType: string }): Promise<void>;
}
