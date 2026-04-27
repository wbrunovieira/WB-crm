import { GoogleOAuthPort } from "@/domain/integrations/email/application/ports/google-oauth.port";

export const GOOGLE_TOKEN_SINGLETON = "google-token-singleton";

export class FakeGoogleOAuthPort extends GoogleOAuthPort {
  public storedTokens: Map<string, { accessToken: string; refreshToken: string; expiresAt: Date }> = new Map();
  public shouldFail = false;
  private _returnToken = "fake-access-token";

  get returnToken(): string { return this._returnToken; }
  set returnToken(val: string) {
    this._returnToken = val;
    this.storedTokens.set(GOOGLE_TOKEN_SINGLETON, {
      accessToken: `${val}-${GOOGLE_TOKEN_SINGLETON}`,
      refreshToken: "fake-refresh-token",
      expiresAt: new Date(Date.now() + 3600_000),
    });
  }

  constructor() {
    super();
    this.storedTokens.set(GOOGLE_TOKEN_SINGLETON, {
      accessToken: `${this._returnToken}-${GOOGLE_TOKEN_SINGLETON}`,
      refreshToken: "fake-refresh-token",
      expiresAt: new Date(Date.now() + 3600_000),
    });
  }

  async getValidToken(userId: string): Promise<string> {
    if (this.shouldFail) {
      throw new Error("OAuth token retrieval failed (simulated)");
    }
    const stored = this.storedTokens.get(userId);
    if (!stored) throw new Error(`No Google token found for userId: ${userId}`);
    return stored.accessToken;
  }

  async storeTokens(
    userId: string,
    tokens: { accessToken: string; refreshToken: string; expiresAt: Date },
  ): Promise<void> {
    this.storedTokens.set(userId, tokens);
  }
}
