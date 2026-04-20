import { Sector } from "../../enterprise/entities/sector";

export abstract class SectorsRepository {
  abstract findById(id: string): Promise<Sector | null>;
  abstract findByOwner(ownerId: string): Promise<Sector[]>;
  abstract existsBySlugAndOwner(slug: string, ownerId: string): Promise<boolean>;
  abstract save(sector: Sector): Promise<void>;
  abstract delete(id: string): Promise<void>;

  abstract addToLead(sectorId: string, leadId: string): Promise<void>;
  abstract removeFromLead(sectorId: string, leadId: string): Promise<void>;
  abstract addToOrganization(sectorId: string, organizationId: string): Promise<void>;
  abstract removeFromOrganization(sectorId: string, organizationId: string): Promise<void>;
}
