import { GoToTokenPort } from "@/domain/integrations/goto/application/ports/goto-token.port";

export class FakeGoToTokenPort extends GoToTokenPort {
  public token = "fake-access-token";
  public shouldFail = false;

  async getValidAccessToken(): Promise<string> {
    if (this.shouldFail) {
      throw new Error("Token unavailable");
    }
    return this.token;
  }
}
