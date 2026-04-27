import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { PhoneValidatorPort, type PhoneValidationResult } from "../ports/phone-validator.port";
import { ContactsRepository } from "@/domain/contacts/application/repositories/contacts.repository";

export interface VerifyContactPhonesInput {
  contactId: string;
  requesterId: string;
}

export interface VerifyContactPhonesResult {
  contactId: string;
  phone?: PhoneValidationResult;
  whatsapp?: PhoneValidationResult;
}

type Output = Either<Error, VerifyContactPhonesResult>;

@Injectable()
export class VerifyContactPhonesUseCase {
  constructor(
    private readonly phoneValidator: PhoneValidatorPort,
    private readonly contactsRepo: ContactsRepository,
  ) {}

  async execute(input: VerifyContactPhonesInput): Promise<Output> {
    const contact = await this.contactsRepo.findById(input.contactId);
    if (!contact) {
      return left(new Error("Contato não encontrado"));
    }

    const saveData: {
      phoneValid?: boolean; phoneType?: string;
      whatsappPhoneValid?: boolean; whatsappPhoneType?: string;
    } = {};

    const result: VerifyContactPhonesResult = { contactId: contact.id.toString() };

    if (contact.phone) {
      const r = this.phoneValidator.validate(contact.phone);
      result.phone = r;
      saveData.phoneValid = r.valid;
      saveData.phoneType = r.type;
    }

    if (contact.whatsapp) {
      const r = this.phoneValidator.validate(contact.whatsapp);
      result.whatsapp = r;
      saveData.whatsappPhoneValid = r.valid;
      saveData.whatsappPhoneType = r.type;
    }

    if (Object.keys(saveData).length > 0) {
      await this.contactsRepo.savePhoneVerification(contact.id.toString(), saveData);
    }

    return right(result);
  }
}
