import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { AdminRepository } from "@/domain/admin/application/repositories/admin.repository";
import { BusinessLine } from "@/domain/admin/enterprise/entities/business-line";
import { Product } from "@/domain/admin/enterprise/entities/product";
import { AdminTechOption, type TechOptionType } from "@/domain/admin/enterprise/entities/admin-tech-option";
import { UniqueEntityID } from "@/core/unique-entity-id";

// ─── Prisma model lookup ───────────────────────────────────────────────────────

type PrismaDelegate = {
  findMany: (args?: unknown) => Promise<unknown[]>;
  findUnique: (args: unknown) => Promise<unknown>;
  upsert: (args: unknown) => Promise<unknown>;
  delete: (args: unknown) => Promise<void>;
  count: (args?: unknown) => Promise<number>;
};

const TECH_PRISMA_MODEL: Record<TechOptionType, keyof PrismaService> = {
  "tech-category":      "techCategory",
  "tech-language":      "techLanguage",
  "tech-framework":     "techFramework",
  "profile-language":   "techProfileLanguage",
  "profile-framework":  "techProfileFramework",
  "profile-hosting":    "techProfileHosting",
  "profile-database":   "techProfileDatabase",
  "profile-erp":        "techProfileERP",
  "profile-crm":        "techProfileCRM",
  "profile-ecommerce":  "techProfileEcommerce",
};

// ─── Mappers ──────────────────────────────────────────────────────────────────

function toBusinessLineDomain(row: {
  id: string; name: string; slug: string; description: string | null;
  color: string | null; icon: string | null; isActive: boolean; order: number;
  createdAt: Date; updatedAt: Date;
}): BusinessLine {
  return BusinessLine.create(
    {
      name: row.name, slug: row.slug, description: row.description ?? undefined,
      color: row.color ?? undefined, icon: row.icon ?? undefined,
      isActive: row.isActive, order: row.order,
      createdAt: row.createdAt, updatedAt: row.updatedAt,
    },
    new UniqueEntityID(row.id),
  );
}

function toProductDomain(row: {
  id: string; name: string; slug: string; description: string | null;
  businessLineId: string; basePrice: number | null; currency: string;
  pricingType: string | null; isActive: boolean; order: number;
  createdAt: Date; updatedAt: Date;
}): Product {
  return Product.create(
    {
      name: row.name, slug: row.slug, description: row.description ?? undefined,
      businessLineId: row.businessLineId, basePrice: row.basePrice ?? undefined,
      currency: row.currency, pricingType: row.pricingType ?? undefined,
      isActive: row.isActive, order: row.order,
      createdAt: row.createdAt, updatedAt: row.updatedAt,
    },
    new UniqueEntityID(row.id),
  );
}

function toTechOptionDomain(type: TechOptionType, row: Record<string, unknown>): AdminTechOption {
  return AdminTechOption.create(
    {
      entityType: type,
      name: row.name as string,
      slug: row.slug as string,
      description: (row.description as string | null) ?? undefined,
      color: (row.color as string | null) ?? undefined,
      icon: (row.icon as string | null) ?? undefined,
      order: (row.order as number | null) ?? undefined,
      isActive: row.isActive as boolean,
      languageSlug: (row.languageSlug as string | null) ?? undefined,
      subType: (row.type as string | null) ?? undefined, // Prisma uses 'type' field
      createdAt: row.createdAt as Date,
      updatedAt: row.updatedAt as Date,
    },
    new UniqueEntityID(row.id as string),
  );
}

@Injectable()
export class PrismaAdminRepository extends AdminRepository {
  constructor(private readonly prisma: PrismaService) { super(); }

  private techModel(type: TechOptionType): PrismaDelegate {
    return this.prisma[TECH_PRISMA_MODEL[type]] as unknown as PrismaDelegate;
  }

  // ─── BusinessLine ────────────────────────────────────────────────────────

  async findBusinessLines(): Promise<BusinessLine[]> {
    const rows = await this.prisma.businessLine.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] });
    return rows.map(toBusinessLineDomain);
  }

  async findBusinessLineById(id: string): Promise<BusinessLine | null> {
    const row = await this.prisma.businessLine.findUnique({ where: { id } });
    return row ? toBusinessLineDomain(row) : null;
  }

  async saveBusinessLine(bl: BusinessLine): Promise<void> {
    const data = {
      id: bl.id.toString(),
      name: bl.name,
      slug: bl.slug,
      description: bl.description ?? null,
      color: bl.color ?? null,
      icon: bl.icon ?? null,
      isActive: bl.isActive,
      order: bl.order,
      updatedAt: bl.updatedAt,
    };
    await this.prisma.businessLine.upsert({
      where: { id: data.id },
      create: { ...data, createdAt: bl.createdAt },
      update: { name: data.name, slug: data.slug, description: data.description, color: data.color, icon: data.icon, isActive: data.isActive, order: data.order, updatedAt: data.updatedAt },
    });
  }

  async deleteBusinessLine(id: string): Promise<void> {
    await this.prisma.businessLine.delete({ where: { id } });
  }

  // ─── Product ─────────────────────────────────────────────────────────────

  async findProducts(businessLineId?: string): Promise<Product[]> {
    const rows = await this.prisma.product.findMany({
      where: businessLineId ? { businessLineId } : undefined,
      orderBy: [{ order: "asc" }, { name: "asc" }],
    });
    return rows.map(toProductDomain);
  }

  async findProductById(id: string): Promise<Product | null> {
    const row = await this.prisma.product.findUnique({ where: { id } });
    return row ? toProductDomain(row) : null;
  }

  async saveProduct(p: Product): Promise<void> {
    const data = {
      id: p.id.toString(),
      name: p.name,
      slug: p.slug,
      description: p.description ?? null,
      businessLineId: p.businessLineId,
      basePrice: p.basePrice ?? null,
      currency: p.currency,
      pricingType: p.pricingType ?? null,
      isActive: p.isActive,
      order: p.order,
      updatedAt: p.updatedAt,
    };
    await this.prisma.product.upsert({
      where: { id: data.id },
      create: { ...data, createdAt: p.createdAt },
      update: { name: data.name, slug: data.slug, description: data.description, businessLineId: data.businessLineId, basePrice: data.basePrice, currency: data.currency, pricingType: data.pricingType, isActive: data.isActive, order: data.order, updatedAt: data.updatedAt },
    });
  }

  async deleteProduct(id: string): Promise<void> {
    await this.prisma.product.delete({ where: { id } });
  }

  // ─── TechOption (generic) ────────────────────────────────────────────────

  async findTechOptions(type: TechOptionType): Promise<AdminTechOption[]> {
    const rows = await this.techModel(type).findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] } as unknown) as Record<string, unknown>[];
    return rows.map((r) => toTechOptionDomain(type, r));
  }

  async findTechOptionById(type: TechOptionType, id: string): Promise<AdminTechOption | null> {
    const row = await this.techModel(type).findUnique({ where: { id } } as unknown) as Record<string, unknown> | null;
    return row ? toTechOptionDomain(type, row) : null;
  }

  async saveTechOption(type: TechOptionType, option: AdminTechOption): Promise<void> {
    const data: Record<string, unknown> = {
      id: option.id.toString(),
      name: option.name,
      slug: option.slug,
      isActive: option.isActive,
      updatedAt: option.updatedAt,
    };

    if (option.color !== undefined) data.color = option.color ?? null;
    if (option.icon !== undefined) data.icon = option.icon ?? null;
    if (option.order !== undefined) data.order = option.order ?? 0;
    if (option.description !== undefined) data.description = option.description ?? null;

    // type-specific fields
    if (type === "tech-framework" && option.languageSlug !== undefined) {
      data.languageSlug = option.languageSlug ?? null;
    }
    if ((type === "profile-hosting" || type === "profile-database") && option.subType !== undefined) {
      data.type = option.subType ?? null; // Prisma column is 'type'
    }

    const { id: _id, updatedAt: _u, ...updateFields } = data;

    await this.techModel(type).upsert({
      where: { id: data.id },
      create: { ...data, createdAt: option.createdAt },
      update: updateFields,
    } as unknown);
  }

  async deleteTechOption(type: TechOptionType, id: string): Promise<void> {
    await this.techModel(type).delete({ where: { id } } as unknown);
  }

  async countTechOptionUsages(_type: TechOptionType, _id: string): Promise<number> {
    // Usage counts are not critical for admin delete — return 0 (no FK protection needed)
    return 0;
  }
}
