export abstract class GoogleOAuthPort {
  /** Returns a valid access_token, auto-refreshing if expired. */
  abstract getValidToken(userId: string): Promise<string>;

  abstract storeTokens(
    userId: string,
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresAt: Date;
    },
  ): Promise<void>;
}
