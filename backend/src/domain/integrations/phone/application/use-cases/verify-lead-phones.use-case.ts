import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { PhoneValidatorPort, type PhoneValidationResult } from "../ports/phone-validator.port";
import { LeadsRepository } from "@/domain/leads/application/repositories/leads.repository";

export interface VerifyLeadPhonesInput {
  leadId: string;
  requesterId: string;
}

export interface VerifyLeadPhonesResult {
  leadId: string;
  phone?: PhoneValidationResult;
  phone2?: PhoneValidationResult;
  whatsapp?: PhoneValidationResult;
}

type Output = Either<Error, VerifyLeadPhonesResult>;

@Injectable()
export class VerifyLeadPhonesUseCase {
  constructor(
    private readonly phoneValidator: PhoneValidatorPort,
    private readonly leadsRepo: LeadsRepository,
  ) {}

  async execute(input: VerifyLeadPhonesInput): Promise<Output> {
    const lead = await this.leadsRepo.findByIdRaw(input.leadId);
    if (!lead) {
      return left(new Error("Lead não encontrado"));
    }

    const saveData: {
      phoneValid?: boolean; phoneType?: string;
      phone2Valid?: boolean; phone2Type?: string;
      whatsappPhoneValid?: boolean; whatsappPhoneType?: string;
    } = {};

    const result: VerifyLeadPhonesResult = { leadId: lead.id.toString() };

    const country = lead.country ?? undefined;

    if (lead.phone) {
      const r = this.phoneValidator.validate(lead.phone, country);
      result.phone = r;
      saveData.phoneValid = r.valid;
      saveData.phoneType = r.type;
    }

    if (lead.phone2) {
      const r = this.phoneValidator.validate(lead.phone2, country);
      result.phone2 = r;
      saveData.phone2Valid = r.valid;
      saveData.phone2Type = r.type;
    }

    if (lead.whatsapp) {
      const r = this.phoneValidator.validate(lead.whatsapp, country);
      result.whatsapp = r;
      saveData.whatsappPhoneValid = r.valid;
      saveData.whatsappPhoneType = r.type;
    }

    if (Object.keys(saveData).length > 0) {
      await this.leadsRepo.savePhoneVerification(lead.id.toString(), saveData);
    }

    return right(result);
  }
}
