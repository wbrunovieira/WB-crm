import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { AdminRepository } from "../repositories/admin.repository";
import { BusinessLine } from "../../enterprise/entities/business-line";
import { UniqueEntityID } from "@/core/unique-entity-id";

// ─── List ─────────────────────────────────────────────────────────────────────

@Injectable()
export class ListBusinessLinesUseCase {
  constructor(private readonly repo: AdminRepository) {}

  async execute(): Promise<Either<Error, { items: BusinessLine[] }>> {
    const items = await this.repo.findBusinessLines();
    return right({ items });
  }
}

// ─── Create ───────────────────────────────────────────────────────────────────

export interface CreateBusinessLineInput {
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
  order?: number;
}

@Injectable()
export class CreateBusinessLineUseCase {
  constructor(private readonly repo: AdminRepository) {}

  async execute(input: CreateBusinessLineInput): Promise<Either<Error, { item: BusinessLine }>> {
    const name = (input.name ?? "").trim();
    if (!name) return left(new Error("Nome da linha de negócio é obrigatório"));

    const slug = (input.slug ?? "").trim();
    if (!slug) return left(new Error("Slug é obrigatório"));

    const item = BusinessLine.create({
      name,
      slug,
      description: input.description,
      color: input.color,
      icon: input.icon,
      isActive: input.isActive ?? true,
      order: input.order ?? 0,
    });

    await this.repo.saveBusinessLine(item);
    return right({ item });
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export interface UpdateBusinessLineInput {
  id: string;
  name?: string;
  slug?: string;
  description?: string;
  color?: string;
  icon?: string;
  order?: number;
}

@Injectable()
export class UpdateBusinessLineUseCase {
  constructor(private readonly repo: AdminRepository) {}

  async execute(input: UpdateBusinessLineInput): Promise<Either<Error, { item: BusinessLine }>> {
    const item = await this.repo.findBusinessLineById(input.id);
    if (!item) return left(new Error("Linha de negócio não encontrada"));

    const { id: _id, ...fields } = input;
    item.update(fields);
    await this.repo.saveBusinessLine(item);
    return right({ item });
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

@Injectable()
export class DeleteBusinessLineUseCase {
  constructor(private readonly repo: AdminRepository) {}

  async execute(id: string): Promise<Either<Error, void>> {
    const item = await this.repo.findBusinessLineById(id);
    if (!item) return left(new Error("Linha de negócio não encontrada"));

    await this.repo.deleteBusinessLine(id);
    return right(undefined);
  }
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

@Injectable()
export class ToggleBusinessLineUseCase {
  constructor(private readonly repo: AdminRepository) {}

  async execute(id: string): Promise<Either<Error, { item: BusinessLine }>> {
    const item = await this.repo.findBusinessLineById(id);
    if (!item) return left(new Error("Linha de negócio não encontrada"));

    item.toggleActive();
    await this.repo.saveBusinessLine(item);
    return right({ item });
  }
}
