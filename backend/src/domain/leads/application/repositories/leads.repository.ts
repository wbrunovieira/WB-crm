import type { Lead } from "../../enterprise/entities/lead";
import type { LeadSummary, LeadDetail } from "../../enterprise/read-models/lead-read-models";

export interface LeadFilters {
  search?: string;
  status?: string;
  quality?: string;
  isArchived?: boolean;
  isProspect?: boolean;
  ownerIdFilter?: string; // "all", "mine", or userId
}

export interface LeadContactInput {
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  linkedin?: string;
  instagram?: string;
  role?: string;
  isPrimary?: boolean;
  languages?: string;
}

export interface LeadRelations {
  labelIds?: string[];
  icpId?: string | null; // null = remove all ICPs
  contacts?: LeadContactInput[];
}

export abstract class LeadsRepository {
  abstract findMany(requesterId: string, requesterRole: string, filters?: LeadFilters): Promise<LeadSummary[]>;
  abstract findById(id: string, requesterId: string, requesterRole: string): Promise<LeadDetail | null>;
  abstract findByIdRaw(id: string): Promise<Lead | null>;
  abstract save(lead: Lead): Promise<void>;
  abstract saveWithRelations(lead: Lead, relations: LeadRelations): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
