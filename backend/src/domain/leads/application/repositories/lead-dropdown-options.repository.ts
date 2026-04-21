export interface LeadDropdownOptionRecord {
  id: string;
  name: string;
  category: string;
  ownerId: string;
  createdAt: Date;
}

export abstract class LeadDropdownOptionsRepository {
  abstract findByCategory(ownerId: string, category: string): Promise<LeadDropdownOptionRecord[]>;
  abstract create(data: { name: string; category: string; ownerId: string }): Promise<LeadDropdownOptionRecord>;
}
