import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { PhoneValidatorPort } from "../ports/phone-validator.port";
import { ContactsRepository } from "@/domain/contacts/application/repositories/contacts.repository";

export interface BatchVerifyContactPhonesInput {
  ownerId: string;
  onProgress?: (progress: BatchVerifyContactPhonesProgress) => void;
}

export interface BatchVerifyContactPhonesProgress {
  current: number;
  total: number;
  contactId: string;
  name: string;
  skipped?: boolean;
  phone?: { valid: boolean; type: string };
  whatsapp?: { valid: boolean; type: string };
  error?: string;
}

export interface BatchVerifyContactPhonesResult {
  total: number;
  checked: number;
  valid: number;
  invalid: number;
  skipped: number;
  errors: number;
}

type Output = Either<Error, BatchVerifyContactPhonesResult>;

@Injectable()
export class BatchVerifyContactPhonesUseCase {
  constructor(
    private readonly phoneValidator: PhoneValidatorPort,
    private readonly contactsRepo: ContactsRepository,
  ) {}

  async execute(input: BatchVerifyContactPhonesInput): Promise<Output> {
    const contacts = await this.contactsRepo.findByOwnerId(input.ownerId);

    if (contacts.length === 0) {
      return left(new Error(`Nenhum contato encontrado para o proprietário: ${input.ownerId}`));
    }

    const result: BatchVerifyContactPhonesResult = {
      total: contacts.length,
      checked: 0,
      valid: 0,
      invalid: 0,
      skipped: 0,
      errors: 0,
    };

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      const hasAnyPhone = !!(contact.phone || contact.whatsapp);

      if (!hasAnyPhone) {
        result.skipped++;
        input.onProgress?.({
          current: i + 1,
          total: contacts.length,
          contactId: contact.id.toString(),
          name: contact.name,
          skipped: true,
        });
        continue;
      }

      try {
        const saveData: {
          phoneValid?: boolean; phoneType?: string;
          whatsappPhoneValid?: boolean; whatsappPhoneType?: string;
        } = {};

        const progressData: BatchVerifyContactPhonesProgress = {
          current: i + 1,
          total: contacts.length,
          contactId: contact.id.toString(),
          name: contact.name,
        };

        let anyValid = false;
        let anyInvalid = false;

        if (contact.phone) {
          const r = this.phoneValidator.validate(contact.phone);
          saveData.phoneValid = r.valid;
          saveData.phoneType = r.type;
          progressData.phone = { valid: r.valid, type: r.type };
          if (r.valid) anyValid = true; else anyInvalid = true;
        }

        if (contact.whatsapp) {
          const r = this.phoneValidator.validate(contact.whatsapp);
          saveData.whatsappPhoneValid = r.valid;
          saveData.whatsappPhoneType = r.type;
          progressData.whatsapp = { valid: r.valid, type: r.type };
          if (r.valid) anyValid = true; else anyInvalid = true;
        }

        await this.contactsRepo.savePhoneVerification(contact.id.toString(), saveData);

        result.checked++;
        if (anyValid) result.valid++;
        if (anyInvalid && !anyValid) result.invalid++;

        input.onProgress?.(progressData);
      } catch (err) {
        result.errors++;
        input.onProgress?.({
          current: i + 1,
          total: contacts.length,
          contactId: contact.id.toString(),
          name: contact.name,
          error: err instanceof Error ? err.message : "Erro desconhecido",
        });
      }
    }

    return right(result);
  }
}
