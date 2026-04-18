import { AdminRepository } from "@/domain/admin/application/repositories/admin.repository";
import { BusinessLine } from "@/domain/admin/enterprise/entities/business-line";
import { Product } from "@/domain/admin/enterprise/entities/product";
import { AdminTechOption, type TechOptionType } from "@/domain/admin/enterprise/entities/admin-tech-option";

export class InMemoryAdminRepository extends AdminRepository {
  public businessLines: BusinessLine[] = [];
  public products: Product[] = [];
  public techOptions: Map<TechOptionType, AdminTechOption[]> = new Map();

  private techStore(type: TechOptionType): AdminTechOption[] {
    if (!this.techOptions.has(type)) this.techOptions.set(type, []);
    return this.techOptions.get(type)!;
  }

  // ─── BusinessLine ────────────────────────────────────────────────────────

  async findBusinessLines(): Promise<BusinessLine[]> {
    return [...this.businessLines];
  }

  async findBusinessLineById(id: string): Promise<BusinessLine | null> {
    return this.businessLines.find((bl) => bl.id.toString() === id) ?? null;
  }

  async saveBusinessLine(bl: BusinessLine): Promise<void> {
    const idx = this.businessLines.findIndex((b) => b.id.toString() === bl.id.toString());
    if (idx >= 0) this.businessLines[idx] = bl;
    else this.businessLines.push(bl);
  }

  async deleteBusinessLine(id: string): Promise<void> {
    this.businessLines = this.businessLines.filter((bl) => bl.id.toString() !== id);
  }

  // ─── Product ─────────────────────────────────────────────────────────────

  async findProducts(businessLineId?: string): Promise<Product[]> {
    if (businessLineId) return this.products.filter((p) => p.businessLineId === businessLineId);
    return [...this.products];
  }

  async findProductById(id: string): Promise<Product | null> {
    return this.products.find((p) => p.id.toString() === id) ?? null;
  }

  async saveProduct(p: Product): Promise<void> {
    const idx = this.products.findIndex((x) => x.id.toString() === p.id.toString());
    if (idx >= 0) this.products[idx] = p;
    else this.products.push(p);
  }

  async deleteProduct(id: string): Promise<void> {
    this.products = this.products.filter((p) => p.id.toString() !== id);
  }

  // ─── TechOption ──────────────────────────────────────────────────────────

  async findTechOptions(type: TechOptionType): Promise<AdminTechOption[]> {
    return [...this.techStore(type)];
  }

  async findTechOptionById(type: TechOptionType, id: string): Promise<AdminTechOption | null> {
    return this.techStore(type).find((o) => o.id.toString() === id) ?? null;
  }

  async saveTechOption(type: TechOptionType, option: AdminTechOption): Promise<void> {
    const store = this.techStore(type);
    const idx = store.findIndex((o) => o.id.toString() === option.id.toString());
    if (idx >= 0) store[idx] = option;
    else store.push(option);
  }

  async deleteTechOption(type: TechOptionType, id: string): Promise<void> {
    const store = this.techStore(type);
    this.techOptions.set(type, store.filter((o) => o.id.toString() !== id));
  }

  async countTechOptionUsages(_type: TechOptionType, _id: string): Promise<number> {
    return 0;
  }
}
