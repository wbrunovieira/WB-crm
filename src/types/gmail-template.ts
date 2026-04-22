export interface GmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string | null;
  active: boolean;
  createdAt: string | Date;
}

export interface GmailTemplateActive {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string | null;
}

export interface GmailTemplateInput {
  name: string;
  subject: string;
  body: string;
  category?: string;
  active?: boolean;
}
