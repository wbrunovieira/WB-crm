import { Proposal } from "../../enterprise/entities/proposal";

export interface ProposalFilters {
  leadId?: string;
  dealId?: string;
  status?: string;
}

export abstract class ProposalsRepository {
  abstract findById(id: string): Promise<Proposal | null>;
  abstract findByOwner(ownerId: string, filters?: ProposalFilters): Promise<Proposal[]>;
  abstract save(proposal: Proposal): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
