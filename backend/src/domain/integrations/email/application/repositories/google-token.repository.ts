export interface GoogleTokenRecord {
  id: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
  email: string;
  gmailHistoryId: string | null;
}

export abstract class GoogleTokenRepository {
  abstract findFirst(): Promise<GoogleTokenRecord | null>;
  abstract save(data: Omit<GoogleTokenRecord, "id" | "gmailHistoryId">): Promise<GoogleTokenRecord>;
  abstract delete(): Promise<void>;
  abstract updateHistoryId(historyId: string): Promise<void>;
}
