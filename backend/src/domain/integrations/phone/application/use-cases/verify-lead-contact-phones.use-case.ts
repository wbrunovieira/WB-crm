import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { PhoneValidatorPort, type PhoneValidationResult } from "../ports/phone-validator.port";
import { PrismaService } from "@/infra/database/prisma.service";

export interface VerifyLeadContactPhonesInput {
  leadContactId: string;
  requesterId: string;
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
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: VerifyLeadContactPhonesInput): Promise<Output> {
    const leadContact = await this.prisma.leadContact.findUnique({
      where: { id: input.leadContactId },
      select: { id: true, phone: true },
    });

    if (!leadContact) {
      return left(new Error("LeadContact não encontrado"));
    }

    const result: VerifyLeadContactPhonesResult = { leadContactId: leadContact.id };

    if (!leadContact.phone) {
      return right(result);
    }

    const phoneResult = this.phoneValidator.validate(leadContact.phone);
    result.phone = phoneResult;

    await this.prisma.leadContact.update({
      where: { id: input.leadContactId },
      data: {
        phoneValid: phoneResult.valid,
        phoneType: phoneResult.type,
      },
    });

    return right(result);
  }
}
