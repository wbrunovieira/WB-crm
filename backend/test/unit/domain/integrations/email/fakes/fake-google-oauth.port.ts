import { GoogleOAuthPort } from "@/domain/integrations/email/application/ports/google-oauth.port";

export const GOOGLE_TOKEN_SINGLETON = "google-token-singleton";

export class FakeGoogleOAuthPort extends GoogleOAuthPort {
  public storedTokens: Map<string, { accessToken: string; refreshToken: string; expiresAt: Date }> = new Map();
  public shouldFail = false;
  public returnToken = "fake-access-token";

  constructor() {
    super();
    // Simulate production: singleton key is always pre-seeded
    this.storedTokens.set(GOOGLE_TOKEN_SINGLETON, {
      accessToken: this.returnToken,
      refreshToken: "fake-refresh-token",
      expiresAt: new Date(Date.now() + 3600_000),
    });
  }

  async getValidToken(userId: string): Promise<string> {
    if (this.shouldFail) {
      throw new Error("OAuth token retrieval failed (simulated)");
    }
    const token = this.storedTokens.get(userId);
    if (!token) {
      throw new Error(`No Google token found for userId: ${userId}`);
    }
    return token.accessToken;
  }

  async storeTokens(
    userId: string,
    tokens: { accessToken: string; refreshToken: string; expiresAt: Date },
  ): Promise<void> {
    this.storedTokens.set(userId, tokens);
  }
}
