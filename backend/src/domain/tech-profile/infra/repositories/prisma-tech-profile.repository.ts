import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { TechProfileRepository, TechProfileType, TechProfileItem, TechProfileResult } from "../../application/repositories/tech-profile.repository";

const PROFILE_TABLE: Record<TechProfileType, string> = {
  language:  "techProfileLanguage",
  framework: "techProfileFramework",
  hosting:   "techProfileHosting",
  database:  "techProfileDatabase",
  erp:       "techProfileERP",
  crm:       "techProfileCRM",
  ecommerce: "techProfileEcommerce",
};

const LEAD_JUNCTION: Record<TechProfileType, string> = {
  language:  "leadLanguage",
  framework: "leadFramework",
  hosting:   "leadHosting",
  database:  "leadDatabase",
  erp:       "leadERP",
  crm:       "leadCRM",
  ecommerce: "leadEcommerce",
};

const ORG_JUNCTION: Record<TechProfileType, string> = {
  language:  "organizationLanguage",
  framework: "organizationFramework",
  hosting:   "organizationHosting",
  database:  "organizationDatabase",
  erp:       "organizationERP",
  crm:       "organizationCRM",
  ecommerce: "organizationEcommerce",
};

const ITEM_FK: Record<TechProfileType, string> = {
  language: "languageId", framework: "frameworkId", hosting: "hostingId",
  database: "databaseId", erp: "erpId", crm: "crmId", ecommerce: "ecommerceId",
};

const UNIQUE_LEAD_KEY: Record<TechProfileType, string> = {
  language: "leadId_languageId", framework: "leadId_frameworkId", hosting: "leadId_hostingId",
  database: "leadId_databaseId", erp: "leadId_erpId", crm: "leadId_crmId", ecommerce: "leadId_ecommerceId",
};

const UNIQUE_ORG_KEY: Record<TechProfileType, string> = {
  language: "organizationId_languageId", framework: "organizationId_frameworkId", hosting: "organizationId_hostingId",
  database: "organizationId_databaseId", erp: "organizationId_erpId", crm: "organizationId_crmId", ecommerce: "organizationId_ecommerceId",
};

function toItem(raw: { id: string; name: string; slug: string; color?: string | null; icon?: string | null }): TechProfileItem {
  return { id: raw.id, name: raw.name, slug: raw.slug, color: raw.color, icon: raw.icon };
}

@Injectable()
export class PrismaTechProfileRepository extends TechProfileRepository {
  constructor(private readonly prisma: PrismaService) { super(); }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private table(name: string): any { return (this.prisma as any)[name]; }

  async getAvailableItems(type: TechProfileType): Promise<TechProfileItem[]> {
    const rows = await this.table(PROFILE_TABLE[type]).findMany({ where: { isActive: true }, orderBy: { order: "asc" } });
    return rows.map(toItem);
  }

  private async getEntityItems(junctionMap: Record<TechProfileType, string>, fkName: string, entityId: string): Promise<TechProfileResult> {
    const types: TechProfileType[] = ["language", "framework", "hosting", "database", "erp", "crm", "ecommerce"];
    const results = await Promise.all(
      types.map(async (type) => {
        const rows = await this.table(junctionMap[type]).findMany({
          where: { [fkName]: entityId },
          include: { [type]: true },
        });
        return { type, items: rows.map((r: Record<string, unknown>) => toItem(r[type] as TechProfileItem)) };
      }),
    );
    const map = Object.fromEntries(results.map(({ type, items }) => [type, items]));
    return { languages: map.language, frameworks: map.framework, hosting: map.hosting, databases: map.database, erps: map.erp, crms: map.crm, ecommerce: map.ecommerce };
  }

  async getLeadTechProfile(leadId: string): Promise<TechProfileResult> {
    return this.getEntityItems(LEAD_JUNCTION, "leadId", leadId);
  }

  async addToLead(leadId: string, type: TechProfileType, itemId: string): Promise<void> {
    const fk = ITEM_FK[type];
    const uniqueKey = UNIQUE_LEAD_KEY[type];
    await this.table(LEAD_JUNCTION[type]).upsert({
      where: { [uniqueKey]: { leadId, [fk]: itemId } },
      create: { leadId, [fk]: itemId },
      update: {},
    });
  }

  async removeFromLead(leadId: string, type: TechProfileType, itemId: string): Promise<void> {
    const fk = ITEM_FK[type];
    await this.table(LEAD_JUNCTION[type]).deleteMany({ where: { leadId, [fk]: itemId } });
  }

  async getOrganizationTechProfile(organizationId: string): Promise<TechProfileResult> {
    return this.getEntityItems(ORG_JUNCTION, "organizationId", organizationId);
  }

  async addToOrganization(organizationId: string, type: TechProfileType, itemId: string): Promise<void> {
    const fk = ITEM_FK[type];
    const uniqueKey = UNIQUE_ORG_KEY[type];
    await this.table(ORG_JUNCTION[type]).upsert({
      where: { [uniqueKey]: { organizationId, [fk]: itemId } },
      create: { organizationId, [fk]: itemId },
      update: {},
    });
  }

  async removeFromOrganization(organizationId: string, type: TechProfileType, itemId: string): Promise<void> {
    const fk = ITEM_FK[type];
    await this.table(ORG_JUNCTION[type]).deleteMany({ where: { organizationId, [fk]: itemId } });
  }
}
