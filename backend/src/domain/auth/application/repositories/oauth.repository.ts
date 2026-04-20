export interface GoogleTokenInput {
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
}

export abstract class OAuthRepository {
  abstract storeGoogleTokens(input: GoogleTokenInput): Promise<void>;
  abstract deleteAllGoogleTokens(): Promise<void>;
  abstract storeGoToTokens(tokens: { accessToken: string; refreshToken?: string; expiresAt: number }): Promise<void>;
}
