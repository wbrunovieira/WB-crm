import { GoogleOAuthPort } from "@/domain/integrations/email/application/ports/google-oauth.port";

export class FakeGoogleOAuthPort extends GoogleOAuthPort {
  public storedTokens: Map<string, { accessToken: string; refreshToken: string; expiresAt: Date }> = new Map();
  public shouldFail = false;
  public returnToken = "fake-access-token";

  async getValidToken(userId: string): Promise<string> {
    if (this.shouldFail) {
      throw new Error("OAuth token retrieval failed (simulated)");
    }
    return `${this.returnToken}-${userId}`;
  }

  async storeTokens(
    userId: string,
    tokens: { accessToken: string; refreshToken: string; expiresAt: Date },
  ): Promise<void> {
    this.storedTokens.set(userId, tokens);
  }
}
