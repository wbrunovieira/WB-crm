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

  async execute(
    googleId: string,
  ): Promise<Either<never, { exists: boolean; leadId?: string; businessName?: string }>> {
    const found = await this.repo.findLeadByGoogleId(googleId);
    if (!found) return right({ exists: false });
    // Callers (mobile door-to-door capture) use leadId/businessName to add a visit/contact to
    // the existing lead instead of just refusing the whole capture on a dedup hit.
    return right({ exists: true, leadId: found.id, businessName: found.businessName });
  }
}
