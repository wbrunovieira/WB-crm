export interface GmailTemplateRecord {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export abstract class GmailTemplatesRepository {
  abstract findAll(onlyActive?: boolean): Promise<GmailTemplateRecord[]>;
  abstract create(data: { name: string; subject: string; body: string; category?: string }): Promise<GmailTemplateRecord>;
  abstract update(id: string, data: { name?: string; subject?: string; body?: string; category?: string; active?: boolean }): Promise<GmailTemplateRecord>;
  abstract delete(id: string): Promise<void>;
}
