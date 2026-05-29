import type { Lead } from "../../enterprise/entities/lead";
import type { LeadSummary, LeadDetail } from "../../enterprise/read-models/lead-read-models";

export interface LeadFilters {
  search?: string;
  contactSearch?: string;
  status?: string;
  quality?: string;
  isArchived?: boolean;
  isProspect?: boolean;
  ownerIdFilter?: string; // "all", "mine", or userId
  icpId?: string;
  hasCadence?: "yes" | "no";
  hasDeepResearch?: "yes" | "no";
  sourceGroup?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "businessName" | "city" | "quality" | "status" | "hasCadence" | "starRating";
  sortDir?: "asc" | "desc";
}

export interface PaginatedLeads {
  leads: LeadSummary[];
  total: number;
  page: number;
  pageSize: number;
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

export interface LeadSelectItem {
  id: string;
  businessName: string;
  leadContacts: Array<{ id: string; name: string; email: string | null; role: string | null; isPrimary: boolean }>;
}

export abstract class LeadsRepository {
  abstract findMany(requesterId: string, requesterRole: string, filters?: LeadFilters): Promise<PaginatedLeads>;
  abstract findById(id: string, requesterId: string, requesterRole: string): Promise<LeadDetail | null>;
  abstract findByIdRaw(id: string): Promise<Lead | null>;
  abstract save(lead: Lead): Promise<void>;
  abstract saveWithRelations(lead: Lead, relations: LeadRelations): Promise<void>;
  abstract delete(id: string): Promise<void>;
  abstract findForSelect(requesterId: string, requesterRole: string): Promise<LeadSelectItem[]>;
  abstract findBySourceGroup(sourceGroup: string): Promise<Lead[]>;
  abstract findDistinctSourceGroups(requesterId: string, requesterRole: string): Promise<string[]>;
  abstract saveWhatsAppVerification(leadId: string, data: { whatsappVerified: boolean; whatsappVerifiedAt: Date; whatsappVerifiedNumber: string }): Promise<void>;
  abstract saveEmailVerification(leadId: string, data: { emailVerified: boolean; emailVerifiedAt: Date; emailVerificationStatus: string; emailVerificationReason: string }): Promise<void>;
  abstract savePhoneVerification(leadId: string, data: { phoneValid?: boolean; phoneType?: string; phone2Valid?: boolean; phone2Type?: string; whatsappPhoneValid?: boolean; whatsappPhoneType?: string; whatsapp?: string }): Promise<void>;
  abstract saveMetaAds(leadId: string, metaAdsJson: string): Promise<void>;
  /** Google Drive folder bookkeeping for the lead (used by proposals). */
  abstract findDriveFolder(leadId: string): Promise<{ driveFolderId: string | null; businessName: string | null } | null>;
  abstract setDriveFolder(leadId: string, driveFolderId: string): Promise<void>;
}
