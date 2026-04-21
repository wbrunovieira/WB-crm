export interface WhatsAppTemplateRecord {
  id: string;
  name: string;
  text: string;
  category: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export abstract class WhatsAppTemplatesRepository {
  abstract findAll(onlyActive?: boolean): Promise<WhatsAppTemplateRecord[]>;
  abstract create(data: { name: string; text: string; category?: string }): Promise<WhatsAppTemplateRecord>;
  abstract update(id: string, data: { name?: string; text?: string; category?: string; active?: boolean }): Promise<WhatsAppTemplateRecord>;
  abstract delete(id: string): Promise<void>;
}
