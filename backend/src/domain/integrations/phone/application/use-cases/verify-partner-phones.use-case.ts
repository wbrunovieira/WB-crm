import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { PhoneValidatorPort, type PhoneValidationResult } from "../ports/phone-validator.port";
import { PartnersRepository } from "@/domain/partners/application/repositories/partners.repository";

export interface VerifyPartnerPhonesInput {
  partnerId: string;
  requesterId: string;
  requesterRole: string;
}

export interface VerifyPartnerPhonesResult {
  partnerId: string;
  phone?: PhoneValidationResult;
  whatsapp?: PhoneValidationResult;
}

type Output = Either<Error, VerifyPartnerPhonesResult>;

@Injectable()
export class VerifyPartnerPhonesUseCase {
  constructor(
    private readonly phoneValidator: PhoneValidatorPort,
    private readonly partnersRepo: PartnersRepository,
  ) {}

  async execute(input: VerifyPartnerPhonesInput): Promise<Output> {
    const partner = await this.partnersRepo.findByIdRaw(input.partnerId);
    if (!partner) {
      return left(new Error("Parceiro não encontrado"));
    }

    // Data isolation: only the owner (or an admin) may verify a partner's phones.
    if (input.requesterRole !== "admin" && partner.ownerId !== input.requesterId) {
      return left(new Error("Não autorizado"));
    }

    const saveData: {
      phoneValid?: boolean; phoneType?: string;
      whatsappPhoneValid?: boolean; whatsappPhoneType?: string;
    } = {};

    const result: VerifyPartnerPhonesResult = { partnerId: partner.id.toString() };

    if (partner.phone) {
      const r = this.phoneValidator.validate(partner.phone);
      result.phone = r;
      saveData.phoneValid = r.valid;
      saveData.phoneType = r.type;
    }

    if (partner.whatsapp) {
      const r = this.phoneValidator.validate(partner.whatsapp);
      result.whatsapp = r;
      saveData.whatsappPhoneValid = r.valid;
      saveData.whatsappPhoneType = r.type;
    }

    if (Object.keys(saveData).length > 0) {
      await this.partnersRepo.savePhoneVerification(partner.id.toString(), saveData);
    }

    return right(result);
  }
}
