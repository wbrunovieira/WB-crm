import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { PhoneValidatorPort, type PhoneValidationResult } from "../ports/phone-validator.port";
import { LeadContactsRepository } from "@/domain/leads/application/repositories/lead-contacts.repository";
import { LeadsRepository } from "@/domain/leads/application/repositories/leads.repository";

export interface VerifyLeadContactPhonesInput {
  leadContactId: string;
  requesterId: string;
  requesterRole: string;
}

export interface VerifyLeadContactPhonesResult {
  leadContactId: string;
  phone?: PhoneValidationResult;
}

type Output = Either<Error, VerifyLeadContactPhonesResult>;

@Injectable()
export class VerifyLeadContactPhonesUseCase {
  constructor(
    private readonly phoneValidator: PhoneValidatorPort,
    private readonly leadContacts: LeadContactsRepository,
    private readonly leads: LeadsRepository,
  ) {}

  async execute(input: VerifyLeadContactPhonesInput): Promise<Output> {
    const leadContact = await this.leadContacts.findById(input.leadContactId);
    if (!leadContact) {
      return left(new Error("LeadContact não encontrado"));
    }

    // Data isolation: access is governed by the parent lead's owner.
    const lead = await this.leads.findByIdRaw(leadContact.leadId);
    if (!lead) {
      return left(new Error("Lead não encontrado"));
    }
    if (input.requesterRole !== "admin" && lead.ownerId !== input.requesterId) {
      return left(new Error("Não autorizado"));
    }

    const result: VerifyLeadContactPhonesResult = { leadContactId: leadContact.id };

    if (!leadContact.phone) {
      return right(result);
    }

    const phoneResult = this.phoneValidator.validate(leadContact.phone);
    result.phone = phoneResult;

    await this.leadContacts.savePhoneVerification(leadContact.id, {
      phoneValid: phoneResult.valid,
      phoneType: phoneResult.type,
    });

    return right(result);
  }
}
