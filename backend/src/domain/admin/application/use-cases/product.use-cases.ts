import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { AdminRepository } from "../repositories/admin.repository";
import { Product } from "../../enterprise/entities/product";

// ─── List ─────────────────────────────────────────────────────────────────────

@Injectable()
export class ListProductsUseCase {
  constructor(private readonly repo: AdminRepository) {}

  async execute(businessLineId?: string, active?: boolean): Promise<Either<Error, { items: Product[] }>> {
    const all = await this.repo.findProducts(businessLineId);
    const items = active !== undefined ? all.filter((p) => p.isActive === active) : all;
    return right({ items });
  }
}

// ─── Get By Id ────────────────────────────────────────────────────────────────

@Injectable()
export class GetProductByIdUseCase {
  constructor(private readonly repo: AdminRepository) {}

  async execute(id: string): Promise<Either<Error, { item: Product }>> {
    const item = await this.repo.findProductById(id);
    if (!item) return left(new Error("Produto não encontrado"));
    return right({ item });
  }
}

// ─── Create ───────────────────────────────────────────────────────────────────

export interface CreateProductInput {
  name: string;
  slug: string;
  description?: string;
  businessLineId: string;
  basePrice?: number;
  currency?: string;
  pricingType?: string;
  isActive?: boolean;
  order?: number;
}

@Injectable()
export class CreateProductUseCase {
  constructor(private readonly repo: AdminRepository) {}

  async execute(input: CreateProductInput): Promise<Either<Error, { item: Product }>> {
    const name = (input.name ?? "").trim();
    if (!name) return left(new Error("Nome do produto é obrigatório"));

    const slug = (input.slug ?? "").trim();
    if (!slug) return left(new Error("Slug é obrigatório"));

    if (!input.businessLineId) return left(new Error("Linha de negócio é obrigatória"));

    const item = Product.create({
      name,
      slug,
      description: input.description,
      businessLineId: input.businessLineId,
      basePrice: input.basePrice,
      currency: input.currency ?? "BRL",
      pricingType: input.pricingType,
      isActive: input.isActive ?? true,
      order: input.order ?? 0,
    });

    await this.repo.saveProduct(item);
    return right({ item });
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export interface UpdateProductInput {
  id: string;
  name?: string;
  slug?: string;
  description?: string;
  businessLineId?: string;
  basePrice?: number;
  currency?: string;
  pricingType?: string;
  order?: number;
}

@Injectable()
export class UpdateProductUseCase {
  constructor(private readonly repo: AdminRepository) {}

  async execute(input: UpdateProductInput): Promise<Either<Error, { item: Product }>> {
    const item = await this.repo.findProductById(input.id);
    if (!item) return left(new Error("Produto não encontrado"));

    const { id: _id, ...fields } = input;
    item.update(fields);
    await this.repo.saveProduct(item);
    return right({ item });
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

@Injectable()
export class DeleteProductUseCase {
  constructor(private readonly repo: AdminRepository) {}

  async execute(id: string): Promise<Either<Error, void>> {
    const item = await this.repo.findProductById(id);
    if (!item) return left(new Error("Produto não encontrado"));

    await this.repo.deleteProduct(id);
    return right(undefined);
  }
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

@Injectable()
export class ToggleProductUseCase {
  constructor(private readonly repo: AdminRepository) {}

  async execute(id: string): Promise<Either<Error, { item: Product }>> {
    const item = await this.repo.findProductById(id);
    if (!item) return left(new Error("Produto não encontrado"));

    item.toggleActive();
    await this.repo.saveProduct(item);
    return right({ item });
  }
}
