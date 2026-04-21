import { Injectable } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { GmailTemplatesRepository, GmailTemplateRecord } from "../repositories/gmail-templates.repository";

@Injectable()
export class GetGmailTemplatesUseCase {
  constructor(private readonly repo: GmailTemplatesRepository) {}

  async execute(onlyActive = false): Promise<Either<never, { templates: GmailTemplateRecord[] }>> {
    const templates = await this.repo.findAll(onlyActive);
    return right({ templates });
  }
}

@Injectable()
export class CreateGmailTemplateUseCase {
  constructor(private readonly repo: GmailTemplatesRepository) {}

  async execute(input: { name: string; subject: string; body: string; category?: string }): Promise<Either<never, { template: GmailTemplateRecord }>> {
    const template = await this.repo.create(input);
    return right({ template });
  }
}

@Injectable()
export class UpdateGmailTemplateUseCase {
  constructor(private readonly repo: GmailTemplatesRepository) {}

  async execute(input: { id: string; name?: string; subject?: string; body?: string; category?: string; active?: boolean }): Promise<Either<never, { template: GmailTemplateRecord }>> {
    const { id, ...data } = input;
    const template = await this.repo.update(id, data);
    return right({ template });
  }
}

@Injectable()
export class DeleteGmailTemplateUseCase {
  constructor(private readonly repo: GmailTemplatesRepository) {}

  async execute(id: string): Promise<Either<never, void>> {
    await this.repo.delete(id);
    return right(undefined);
  }
}
