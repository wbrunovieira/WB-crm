import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { AdminRepository } from "../repositories/admin.repository";
import { AdminTechOption, type TechOptionType } from "../../enterprise/entities/admin-tech-option";

// ─── List ─────────────────────────────────────────────────────────────────────

@Injectable()
export class ListTechOptionsUseCase {
  constructor(private readonly repo: AdminRepository) {}

  async execute(type: TechOptionType): Promise<Either<Error, { items: AdminTechOption[] }>> {
    const items = await this.repo.findTechOptions(type);
    return right({ items });
  }
}

// ─── Create ───────────────────────────────────────────────────────────────────

export interface CreateTechOptionInput {
  type: TechOptionType;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: string;
  order?: number;
  isActive?: boolean;
  languageSlug?: string;
  subType?: string;
}

@Injectable()
export class CreateTechOptionUseCase {
  constructor(private readonly repo: AdminRepository) {}

  async execute(input: CreateTechOptionInput): Promise<Either<Error, { item: AdminTechOption }>> {
    const name = (input.name ?? "").trim();
    if (!name) return left(new Error("Nome é obrigatório"));

    const slug = (input.slug ?? "").trim();
    if (!slug) return left(new Error("Slug é obrigatório"));

    const item = AdminTechOption.create({
      entityType: input.type,
      name,
      slug,
      description: input.description,
      color: input.color,
      icon: input.icon,
      order: input.order ?? 0,
      isActive: input.isActive ?? true,
      languageSlug: input.languageSlug,
      subType: input.subType,
    });

    await this.repo.saveTechOption(input.type, item);
    return right({ item });
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export interface UpdateTechOptionInput {
  type: TechOptionType;
  id: string;
  name?: string;
  slug?: string;
  description?: string;
  color?: string;
  icon?: string;
  order?: number;
  languageSlug?: string;
  subType?: string;
}

@Injectable()
export class UpdateTechOptionUseCase {
  constructor(private readonly repo: AdminRepository) {}

  async execute(input: UpdateTechOptionInput): Promise<Either<Error, { item: AdminTechOption }>> {
    const item = await this.repo.findTechOptionById(input.type, input.id);
    if (!item) return left(new Error("Item não encontrado"));

    const { type: _type, id: _id, ...fields } = input;
    item.update(fields);
    await this.repo.saveTechOption(input.type, item);
    return right({ item });
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

@Injectable()
export class DeleteTechOptionUseCase {
  constructor(private readonly repo: AdminRepository) {}

  async execute(type: TechOptionType, id: string): Promise<Either<Error, void>> {
    const item = await this.repo.findTechOptionById(type, id);
    if (!item) return left(new Error("Item não encontrado"));

    await this.repo.deleteTechOption(type, id);
    return right(undefined);
  }
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

@Injectable()
export class ToggleTechOptionUseCase {
  constructor(private readonly repo: AdminRepository) {}

  async execute(type: TechOptionType, id: string): Promise<Either<Error, { item: AdminTechOption }>> {
    const item = await this.repo.findTechOptionById(type, id);
    if (!item) return left(new Error("Item não encontrado"));

    item.toggleActive();
    await this.repo.saveTechOption(type, item);
    return right({ item });
  }
}
