import type { BusinessLine } from "../../enterprise/entities/business-line";
import type { Product } from "../../enterprise/entities/product";
import type { AdminTechOption, TechOptionType } from "../../enterprise/entities/admin-tech-option";

export abstract class AdminRepository {
  // ─── BusinessLine ────────────────────────────────────────────────────────

  abstract findBusinessLines(): Promise<BusinessLine[]>;
  abstract findBusinessLineById(id: string): Promise<BusinessLine | null>;
  abstract saveBusinessLine(bl: BusinessLine): Promise<void>;
  abstract deleteBusinessLine(id: string): Promise<void>;

  // ─── Product ─────────────────────────────────────────────────────────────

  abstract findProducts(businessLineId?: string): Promise<Product[]>;
  abstract findProductById(id: string): Promise<Product | null>;
  abstract saveProduct(p: Product): Promise<void>;
  abstract deleteProduct(id: string): Promise<void>;

  // ─── TechOption (covers TechCategory/Language/Framework + 7 Profile types) ──

  abstract findTechOptions(type: TechOptionType): Promise<AdminTechOption[]>;
  abstract findTechOptionById(type: TechOptionType, id: string): Promise<AdminTechOption | null>;
  abstract saveTechOption(type: TechOptionType, option: AdminTechOption): Promise<void>;
  abstract deleteTechOption(type: TechOptionType, id: string): Promise<void>;
  abstract countTechOptionUsages(type: TechOptionType, id: string): Promise<number>;
}
