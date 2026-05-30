import { Injectable } from "@nestjs/common";
import { OAuthRepository } from "../repositories/oauth.repository";

export interface GoToConnectionStatus {
  connected: boolean;
  hasRefreshToken?: boolean;
  expiresAt?: number;
  isExpired?: boolean;
  expiresInMs?: number;
}

@Injectable()
export class GetGoToConnectionStatusUseCase {
  constructor(private readonly oauth: OAuthRepository) {}

  /** `now` (ms) é passado pelo controller para manter o use case puro/testável. */
  async execute(now: number): Promise<GoToConnectionStatus> {
    const tokens = await this.oauth.loadGoToTokens();
    if (!tokens) return { connected: false };
    return {
      connected: true,
      hasRefreshToken: !!tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      isExpired: tokens.expiresAt < now,
      expiresInMs: tokens.expiresAt - now,
    };
  }
}
