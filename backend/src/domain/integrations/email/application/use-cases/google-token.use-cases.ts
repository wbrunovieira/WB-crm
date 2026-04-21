import { Injectable } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { GoogleTokenRepository, GoogleTokenRecord } from "../repositories/google-token.repository";

@Injectable()
export class GetGoogleTokenUseCase {
  constructor(private readonly repo: GoogleTokenRepository) {}

  async execute(): Promise<Either<never, { token: GoogleTokenRecord | null }>> {
    const token = await this.repo.findFirst();
    return right({ token });
  }
}

@Injectable()
export class SaveGoogleTokenUseCase {
  constructor(private readonly repo: GoogleTokenRepository) {}

  async execute(data: Omit<GoogleTokenRecord, "id" | "gmailHistoryId">): Promise<Either<never, { token: GoogleTokenRecord }>> {
    const token = await this.repo.save(data);
    return right({ token });
  }
}

@Injectable()
export class DeleteGoogleTokenUseCase {
  constructor(private readonly repo: GoogleTokenRepository) {}

  async execute(): Promise<Either<never, void>> {
    await this.repo.delete();
    return right(undefined);
  }
}

@Injectable()
export class UpdateTokenHistoryIdUseCase {
  constructor(private readonly repo: GoogleTokenRepository) {}

  async execute(historyId: string): Promise<Either<never, void>> {
    await this.repo.updateHistoryId(historyId);
    return right(undefined);
  }
}
