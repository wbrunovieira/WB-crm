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

export abstract class LeadsRepository {
  abstract findMany(requesterId: string, requesterRole: string, filters?: LeadFilters): Promise<LeadSummary[]>;
  abstract findById(id: string, requesterId: string, requesterRole: string): Promise<LeadDetail | null>;
  abstract findByIdRaw(id: string): Promise<Lead | null>;
  abstract save(lead: Lead): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
