import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { OAuthRepository, type GoogleTokenInput } from "../repositories/oauth.repository";

export class OAuthForbiddenError extends Error { name = "OAuthForbiddenError"; }
export class OAuthTokenExchangeError extends Error { name = "OAuthTokenExchangeError"; }

@Injectable()
export class StoreGoogleTokensUseCase {
  constructor(private readonly repo: OAuthRepository) {}

  async execute(input: GoogleTokenInput): Promise<Either<never, void>> {
    await this.repo.storeGoogleTokens(input);
    return right(undefined);
  }
}

@Injectable()
export class DisconnectGoogleUseCase {
  constructor(private readonly repo: OAuthRepository) {}

  async execute(input: { requesterRole: string }): Promise<Either<OAuthForbiddenError, void>> {
    if (input.requesterRole !== "admin") return left(new OAuthForbiddenError("Apenas admins podem desconectar conta Google"));
    await this.repo.deleteAllGoogleTokens();
    return right(undefined);
  }
}

@Injectable()
export class StoreGoToTokensUseCase {
  constructor(private readonly repo: OAuthRepository) {}

  async execute(tokens: { accessToken: string; refreshToken?: string; expiresAt: number }): Promise<Either<never, void>> {
    await this.repo.storeGoToTokens(tokens);
    return right(undefined);
  }
}
