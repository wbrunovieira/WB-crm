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
}

export abstract class LeadContactsRepository {
  abstract findByLead(leadId: string): Promise<LeadContactRecord[]>;
  abstract findById(id: string): Promise<LeadContactRecord | null>;
  abstract create(data: CreateLeadContactData): Promise<LeadContactRecord>;
  abstract update(id: string, data: UpdateLeadContactData): Promise<LeadContactRecord>;
  abstract toggleActive(id: string): Promise<LeadContactRecord>;
  abstract delete(id: string): Promise<void>;
}
