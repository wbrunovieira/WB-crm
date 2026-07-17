import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { LeadContactsRepository, LeadContactRecord } from "../repositories/lead-contacts.repository";
import { normalizePhoneE164 } from "@/infra/shared/phone/phone-normalizer";
import { CommLanguage } from "@/core/value-objects/comm-language";

export class LeadContactNotFoundError extends Error { name = "LeadContactNotFoundError"; }

@Injectable()
export class GetLeadContactsUseCase {
  constructor(private readonly repo: LeadContactsRepository) {}

  async execute(input: { leadId: string }): Promise<Either<Error, LeadContactRecord[]>> {
    return right(await this.repo.findByLead(input.leadId));
  }
}

@Injectable()
export class CreateLeadContactUseCase {
  constructor(private readonly repo: LeadContactsRepository) {}

  async execute(input: {
    leadId: string;
    name: string;
    role?: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    linkedin?: string;
    instagram?: string;
    isPrimary?: boolean;
    languages?: string;
    commLanguage?: string;
  }): Promise<Either<Error, LeadContactRecord>> {
    const trimmed = input.name.trim();
    if (!trimmed) return left(new Error("name não pode ser vazio"));
    const langR = CommLanguage.create(input.commLanguage);
    if (langR.isLeft()) return left(langR.value);
    return right(await this.repo.create({
      ...input,
      name: trimmed,
      phone: normalizePhoneE164(input.phone) ?? undefined,
      whatsapp: normalizePhoneE164(input.whatsapp) ?? undefined,
      commLanguage: langR.value.value,
    }));
  }
}

@Injectable()
export class UpdateLeadContactUseCase {
  constructor(private readonly repo: LeadContactsRepository) {}

  async execute(input: {
    id: string;
    name?: string;
    role?: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    linkedin?: string;
    instagram?: string;
    isPrimary?: boolean;
    languages?: string;
    commLanguage?: string;
  }): Promise<Either<Error, LeadContactRecord>> {
    const existing = await this.repo.findById(input.id);
    if (!existing) return left(new LeadContactNotFoundError("Contato não encontrado"));
    if (input.name !== undefined && !input.name.trim()) return left(new Error("name não pode ser vazio"));
    const { id, ...data } = input;
    if (data.phone !== undefined) data.phone = normalizePhoneE164(data.phone) ?? undefined;
    if (data.whatsapp !== undefined) data.whatsapp = normalizePhoneE164(data.whatsapp) ?? undefined;
    if (data.commLanguage !== undefined) {
      const langR = CommLanguage.create(data.commLanguage);
      if (langR.isLeft()) return left(langR.value);
      data.commLanguage = langR.value.value;
    }
    return right(await this.repo.update(id, data));
  }
}

@Injectable()
export class DeleteLeadContactUseCase {
  constructor(private readonly repo: LeadContactsRepository) {}

  async execute(input: { id: string }): Promise<Either<Error, void>> {
    const existing = await this.repo.findById(input.id);
    if (!existing) return left(new LeadContactNotFoundError("Contato não encontrado"));
    await this.repo.delete(input.id);
    return right(undefined);
  }
}

@Injectable()
export class ToggleLeadContactActiveUseCase {
  constructor(private readonly repo: LeadContactsRepository) {}

  async execute(input: { id: string }): Promise<Either<Error, LeadContactRecord>> {
    const existing = await this.repo.findById(input.id);
    if (!existing) return left(new LeadContactNotFoundError("Contato não encontrado"));
    return right(await this.repo.toggleActive(input.id));
  }
}
