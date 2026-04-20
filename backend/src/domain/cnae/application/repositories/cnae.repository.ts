export interface CnaeRecord {
  id: string;
  code: string;
  description: string;
}

export abstract class CnaeRepository {
  abstract search(query: string, limit?: number): Promise<CnaeRecord[]>;
  abstract findById(id: string): Promise<CnaeRecord | null>;

  // Lead secondary CNAEs
  abstract addToLead(cnaeId: string, leadId: string): Promise<void>;
  abstract removeFromLead(cnaeId: string, leadId: string): Promise<void>;

  // Organization secondary CNAEs
  abstract addToOrganization(cnaeId: string, organizationId: string): Promise<void>;
  abstract removeFromOrganization(cnaeId: string, organizationId: string): Promise<void>;
}
