export interface EmailTrackingRecord {
  id: string;
  token: string;
  type: "open" | "click";
  emailMessageId: string;
  targetUrl?: string; // for click tracking
  ownerId: string;
}

export abstract class EmailTrackingRepository {
  abstract findByToken(token: string): Promise<EmailTrackingRecord | null>;
  abstract save(record: EmailTrackingRecord): Promise<void>;
  abstract recordOpen(token: string, userAgent?: string, ip?: string): Promise<void>;
  abstract recordClick(token: string, url: string, userAgent?: string, ip?: string): Promise<void>;
}
