import { Injectable } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { GooglePlacesSearchesRepository, GooglePlacesSearchRecord } from "../repositories/google-places-searches.repository";

@Injectable()
export class FindOrCreateGooglePlacesSearchUseCase {
  constructor(private readonly repo: GooglePlacesSearchesRepository) {}

  async execute(input: {
    ownerId: string;
    country: string;
    city?: string;
    zipCode?: string;
    typeKeyword: string;
    searchQuery: string;
  }): Promise<Either<never, { profile: GooglePlacesSearchRecord }>> {
    let profile = await this.repo.findFirst({
      ownerId: input.ownerId,
      country: input.country,
      city: input.city ?? null,
      zipCode: input.zipCode ?? null,
      typeKeyword: input.typeKeyword,
    });

    if (!profile) {
      profile = await this.repo.create({
        ownerId: input.ownerId,
        country: input.country,
        city: input.city,
        zipCode: input.zipCode,
        typeKeyword: input.typeKeyword,
        searchQuery: input.searchQuery,
      });
    }

    return right({ profile });
  }
}

@Injectable()
export class UpdateGooglePlacesSearchUseCase {
  constructor(private readonly repo: GooglePlacesSearchesRepository) {}

  async execute(input: {
    id: string;
    fetchedPlaceIds: string;
    newlySeenCount: number;
    importedCount: number;
  }): Promise<Either<never, void>> {
    await this.repo.update(input.id, {
      fetchedPlaceIds: input.fetchedPlaceIds,
      totalFetched: input.newlySeenCount,
      totalImported: input.importedCount,
    });
    return right(undefined);
  }
}

@Injectable()
export class CheckLeadGoogleIdExistsUseCase {
  constructor(private readonly repo: GooglePlacesSearchesRepository) {}

  async execute(googleId: string): Promise<Either<never, { exists: boolean }>> {
    const found = await this.repo.findLeadByGoogleId(googleId);
    return right({ exists: !!found });
  }
}
