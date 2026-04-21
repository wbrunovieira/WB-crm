import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { GooglePlacesSearchesRepository, GooglePlacesSearchRecord } from "@/domain/leads/application/repositories/google-places-searches.repository";

@Injectable()
export class PrismaGooglePlacesSearchesRepository extends GooglePlacesSearchesRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findFirst(where: { ownerId: string; country: string; city?: string | null; zipCode?: string | null; typeKeyword: string }): Promise<GooglePlacesSearchRecord | null> {
    return this.prisma.googlePlacesSearch.findFirst({
      where: {
        ownerId: where.ownerId,
        country: where.country,
        city: where.city ?? null,
        zipCode: where.zipCode ?? null,
        typeKeyword: where.typeKeyword,
      },
    }) as Promise<GooglePlacesSearchRecord | null>;
  }

  async create(data: { ownerId: string; country: string; city?: string; zipCode?: string; typeKeyword: string; searchQuery: string }): Promise<GooglePlacesSearchRecord> {
    return this.prisma.googlePlacesSearch.create({
      data: {
        ownerId: data.ownerId,
        country: data.country,
        city: data.city,
        zipCode: data.zipCode,
        typeKeyword: data.typeKeyword,
        searchQuery: data.searchQuery,
        fetchedPlaceIds: "[]",
      },
    }) as Promise<GooglePlacesSearchRecord>;
  }

  async update(id: string, data: { fetchedPlaceIds: string; totalFetched: number; totalImported: number }): Promise<void> {
    const current = await this.prisma.googlePlacesSearch.findUnique({
      where: { id },
      select: { totalFetched: true, totalImported: true },
    });
    await this.prisma.googlePlacesSearch.update({
      where: { id },
      data: {
        fetchedPlaceIds: data.fetchedPlaceIds,
        totalFetched: (current?.totalFetched ?? 0) + data.totalFetched,
        totalImported: (current?.totalImported ?? 0) + data.totalImported,
        lastFetchedAt: new Date(),
        status: "active",
      },
    });
  }

  async findLeadByGoogleId(googleId: string): Promise<{ id: string } | null> {
    return this.prisma.lead.findFirst({
      where: { googleId },
      select: { id: true },
    });
  }
}
