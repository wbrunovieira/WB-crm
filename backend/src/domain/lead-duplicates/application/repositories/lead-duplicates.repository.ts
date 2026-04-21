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
  companyRegistrationID: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  isArchived: boolean;
  status: string;
  matchedFields: string[];
  score: number;
}

export interface GroupedDuplicates {
  cnpj: DuplicateMatch[];
  name: DuplicateMatch[];
  phone: DuplicateMatch[];
  email: DuplicateMatch[];
  address: DuplicateMatch[];
}

export abstract class LeadDuplicatesRepository {
  abstract findDuplicates(input: DuplicateCheckInput): Promise<DuplicateMatch[]>;
}
