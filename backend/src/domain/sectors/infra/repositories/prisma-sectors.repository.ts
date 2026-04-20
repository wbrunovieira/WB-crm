import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { SectorsRepository } from "../../application/repositories/sectors.repository";
import { Sector, CreateSectorProps } from "../../enterprise/entities/sector";
import { SectorName } from "../../enterprise/value-objects/sector-name.vo";
import { SectorSlug } from "../../enterprise/value-objects/sector-slug.vo";
import { UniqueEntityID } from "@/core/unique-entity-id";
import type { Sector as PrismaSector } from "@prisma/client";

function toDomain(raw: PrismaSector): Sector {
  return Sector.create(
    {
      name: SectorName.create(raw.name).unwrap(),
      slug: SectorSlug.create(raw.slug).unwrap(),
      description: raw.description ?? undefined,
      marketSize: raw.marketSize ?? undefined,
      marketSizeNotes: raw.marketSizeNotes ?? undefined,
      averageTicket: raw.averageTicket ?? undefined,
      budgetSeason: raw.budgetSeason ?? undefined,
      salesCycleDays: raw.salesCycleDays ?? undefined,
      salesCycleNotes: raw.salesCycleNotes ?? undefined,
      decisionMakers: raw.decisionMakers ?? undefined,
      buyingProcess: raw.buyingProcess ?? undefined,
      mainObjections: raw.mainObjections ?? undefined,
      mainPains: raw.mainPains ?? undefined,
      referenceCompanies: raw.referenceCompanies ?? undefined,
      competitorsLandscape: raw.competitorsLandscape ?? undefined,
      jargons: raw.jargons ?? undefined,
      regulatoryNotes: raw.regulatoryNotes ?? undefined,
      isActive: raw.isActive,
      ownerId: raw.ownerId,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    } as CreateSectorProps,
    new UniqueEntityID(raw.id),
  );
}

@Injectable()
export class PrismaSectorsRepository extends SectorsRepository {
  constructor(private readonly prisma: PrismaService) { super(); }

  async findById(id: string): Promise<Sector | null> {
    const raw = await this.prisma.sector.findUnique({ where: { id } });
    return raw ? toDomain(raw) : null;
  }

  async findByOwner(ownerId: string): Promise<Sector[]> {
    const rows = await this.prisma.sector.findMany({ where: { ownerId }, orderBy: { name: "asc" } });
    return rows.map(toDomain);
  }

  async existsBySlugAndOwner(slug: string, ownerId: string): Promise<boolean> {
    return (await this.prisma.sector.count({ where: { slug, ownerId } })) > 0;
  }

  async save(sector: Sector): Promise<void> {
    const p = sector.allProps;
    const data = {
      name: sector.name, slug: sector.slug,
      description: p.description ?? null,
      marketSize: p.marketSize ?? null,
      marketSizeNotes: p.marketSizeNotes ?? null,
      averageTicket: p.averageTicket ?? null,
      budgetSeason: p.budgetSeason ?? null,
      salesCycleDays: p.salesCycleDays ?? null,
      salesCycleNotes: p.salesCycleNotes ?? null,
      decisionMakers: p.decisionMakers ?? null,
      buyingProcess: p.buyingProcess ?? null,
      mainObjections: p.mainObjections ?? null,
      mainPains: p.mainPains ?? null,
      referenceCompanies: p.referenceCompanies ?? null,
      competitorsLandscape: p.competitorsLandscape ?? null,
      jargons: p.jargons ?? null,
      regulatoryNotes: p.regulatoryNotes ?? null,
      isActive: sector.isActive,
      ownerId: sector.ownerId,
      updatedAt: sector.updatedAt,
    };
    await this.prisma.sector.upsert({
      where: { id: sector.id.toString() },
      create: { id: sector.id.toString(), ...data, createdAt: sector.createdAt },
      update: data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.sector.delete({ where: { id } });
  }

  async addToLead(sectorId: string, leadId: string): Promise<void> {
    await this.prisma.leadSector.upsert({
      where: { leadId_sectorId: { leadId, sectorId } },
      create: { leadId, sectorId },
      update: {},
    });
  }

  async removeFromLead(sectorId: string, leadId: string): Promise<void> {
    await this.prisma.leadSector.deleteMany({ where: { leadId, sectorId } });
  }

  async addToOrganization(sectorId: string, organizationId: string): Promise<void> {
    await this.prisma.organizationSector.upsert({
      where: { organizationId_sectorId: { organizationId, sectorId } },
      create: { organizationId, sectorId },
      update: {},
    });
  }

  async removeFromOrganization(sectorId: string, organizationId: string): Promise<void> {
    await this.prisma.organizationSector.deleteMany({ where: { organizationId, sectorId } });
  }
}
