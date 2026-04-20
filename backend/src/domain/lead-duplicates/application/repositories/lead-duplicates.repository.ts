export interface DuplicateCheckInput {
  ownerId: string;
  cnpj?: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface DuplicateMatch {
  leadId: string;
  businessName: string;
  matchedFields: string[];
  score: number;
}

export abstract class LeadDuplicatesRepository {
  abstract findDuplicates(input: DuplicateCheckInput): Promise<DuplicateMatch[]>;
}
