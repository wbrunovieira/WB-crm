import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { WhatsAppTemplatesRepository, WhatsAppTemplateRecord } from "../repositories/whatsapp-templates.repository";

export class TemplateNotFoundError extends Error { name = "TemplateNotFoundError"; }
export class UnauthorizedError extends Error { name = "UnauthorizedError"; }

@Injectable()
export class GetWhatsAppTemplatesUseCase {
  constructor(private readonly repo: WhatsAppTemplatesRepository) {}

  async execute(onlyActive = false): Promise<Either<never, { templates: WhatsAppTemplateRecord[] }>> {
    const templates = await this.repo.findAll(onlyActive);
    return right({ templates });
  }
}

@Injectable()
export class CreateWhatsAppTemplateUseCase {
  constructor(private readonly repo: WhatsAppTemplatesRepository) {}

  async execute(input: { name: string; text: string; category?: string; requesterRole: string }): Promise<Either<UnauthorizedError, { template: WhatsAppTemplateRecord }>> {
    if (input.requesterRole !== "admin") return left(new UnauthorizedError("Apenas administradores podem gerenciar templates"));
    if (!input.name.trim()) return left(new UnauthorizedError("Nome obrigatório"));
    if (!input.text.trim()) return left(new UnauthorizedError("Texto obrigatório"));
    const template = await this.repo.create({ name: input.name.trim(), text: input.text.trim(), category: input.category?.trim() });
    return right({ template });
  }
}

@Injectable()
export class UpdateWhatsAppTemplateUseCase {
  constructor(private readonly repo: WhatsAppTemplatesRepository) {}

  async execute(input: { id: string; name?: string; text?: string; category?: string; active?: boolean; requesterRole: string }): Promise<Either<UnauthorizedError | TemplateNotFoundError, { template: WhatsAppTemplateRecord }>> {
    if (input.requesterRole !== "admin") return left(new UnauthorizedError("Apenas administradores podem gerenciar templates"));
    const { id, requesterRole: _role, ...data } = input;
    const template = await this.repo.update(id, data);
    return right({ template });
  }
}

@Injectable()
export class DeleteWhatsAppTemplateUseCase {
  constructor(private readonly repo: WhatsAppTemplatesRepository) {}

  async execute(input: { id: string; requesterRole: string }): Promise<Either<UnauthorizedError, void>> {
    if (input.requesterRole !== "admin") return left(new UnauthorizedError("Apenas administradores podem gerenciar templates"));
    await this.repo.delete(input.id);
    return right(undefined);
  }
}
