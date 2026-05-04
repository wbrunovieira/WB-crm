export interface GoogleTokenInput {
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
}

export interface GoToTokenRecord {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // ms timestamp
}

export abstract class OAuthRepository {
  abstract storeGoogleTokens(input: GoogleTokenInput): Promise<void>;
  abstract deleteAllGoogleTokens(): Promise<void>;
  abstract storeGoToTokens(tokens: GoToTokenRecord): Promise<void>;
  abstract loadGoToTokens(): Promise<GoToTokenRecord | null>;
}
