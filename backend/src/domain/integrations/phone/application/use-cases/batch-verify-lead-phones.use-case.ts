import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { PhoneValidatorPort } from "../ports/phone-validator.port";
import { LeadsRepository } from "@/domain/leads/application/repositories/leads.repository";

export interface BatchVerifyLeadPhonesInput {
  sourceGroup: string;
  onProgress?: (progress: BatchVerifyLeadPhonesProgress) => void;
}

export interface BatchVerifyLeadPhonesProgress {
  current: number;
  total: number;
  leadId: string;
  businessName: string;
  skipped?: boolean;
  phone?: { valid: boolean; type: string };
  phone2?: { valid: boolean; type: string };
  whatsapp?: { valid: boolean; type: string };
  error?: string;
}

export interface BatchVerifyLeadPhonesResult {
  total: number;
  checked: number;
  valid: number;
  invalid: number;
  skipped: number;
  errors: number;
}

type Output = Either<Error, BatchVerifyLeadPhonesResult>;

@Injectable()
export class BatchVerifyLeadPhonesUseCase {
  constructor(
    private readonly phoneValidator: PhoneValidatorPort,
    private readonly leadsRepo: LeadsRepository,
  ) {}

  async execute(input: BatchVerifyLeadPhonesInput): Promise<Output> {
    if (!input.sourceGroup?.trim()) {
      return left(new Error("sourceGroup é obrigatório"));
    }

    const leads = await this.leadsRepo.findBySourceGroup(input.sourceGroup.trim());

    if (leads.length === 0) {
      return left(new Error(`Nenhum lead encontrado para o sourceGroup: ${input.sourceGroup}`));
    }

    const result: BatchVerifyLeadPhonesResult = {
      total: leads.length,
      checked: 0,
      valid: 0,
      invalid: 0,
      skipped: 0,
      errors: 0,
    };

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      const hasAnyPhone = !!(lead.phone || lead.phone2 || lead.whatsapp);

      if (!hasAnyPhone) {
        result.skipped++;
        input.onProgress?.({
          current: i + 1,
          total: leads.length,
          leadId: lead.id.toString(),
          businessName: lead.businessName,
          skipped: true,
        });
        continue;
      }

      try {
        const saveData: {
          phoneValid?: boolean; phoneType?: string;
          phone2Valid?: boolean; phone2Type?: string;
          whatsappPhoneValid?: boolean; whatsappPhoneType?: string;
        } = {};

        const progressData: BatchVerifyLeadPhonesProgress = {
          current: i + 1,
          total: leads.length,
          leadId: lead.id.toString(),
          businessName: lead.businessName,
        };

        let anyValid = false;
        let anyInvalid = false;

        if (lead.phone) {
          const r = this.phoneValidator.validate(lead.phone);
          saveData.phoneValid = r.valid;
          saveData.phoneType = r.type;
          progressData.phone = { valid: r.valid, type: r.type };
          if (r.valid) anyValid = true; else anyInvalid = true;
        }

        if (lead.phone2) {
          const r = this.phoneValidator.validate(lead.phone2);
          saveData.phone2Valid = r.valid;
          saveData.phone2Type = r.type;
          progressData.phone2 = { valid: r.valid, type: r.type };
          if (r.valid) anyValid = true; else anyInvalid = true;
        }

        if (lead.whatsapp) {
          const r = this.phoneValidator.validate(lead.whatsapp);
          saveData.whatsappPhoneValid = r.valid;
          saveData.whatsappPhoneType = r.type;
          progressData.whatsapp = { valid: r.valid, type: r.type };
          if (r.valid) anyValid = true; else anyInvalid = true;
        }

        await this.leadsRepo.savePhoneVerification(lead.id.toString(), saveData);

        result.checked++;
        if (anyValid) result.valid++;
        if (anyInvalid && !anyValid) result.invalid++;

        input.onProgress?.(progressData);
      } catch (err) {
        result.errors++;
        input.onProgress?.({
          current: i + 1,
          total: leads.length,
          leadId: lead.id.toString(),
          businessName: lead.businessName,
          error: err instanceof Error ? err.message : "Erro desconhecido",
        });
      }
    }

    return right(result);
  }
}
