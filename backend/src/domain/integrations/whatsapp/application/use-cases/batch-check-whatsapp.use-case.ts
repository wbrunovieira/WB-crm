import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { EvolutionApiPort } from "../ports/evolution-api.port";
import { LeadsRepository } from "@/domain/leads/application/repositories/leads.repository";
import { normalizePhoneForWhatsApp } from "@/infra/shared/phone/phone-normalizer";

export interface BatchCheckWhatsAppInput {
  sourceGroup: string;
  /** Delay in ms between individual checks to avoid rate limiting (default: 1500) */
  delayMs?: number;
  /** Callback fired after each lead is processed (for SSE progress) */
  onProgress?: (progress: BatchCheckProgress) => void;
}

export interface BatchCheckProgress {
  current: number;
  total: number;
  leadId: string;
  businessName: string;
  exists: boolean | null;
  error?: string;
}

export interface BatchCheckWhatsAppResult {
  total: number;
  checked: number;
  found: number;
  notFound: number;
  skipped: number;
  errors: number;
}

type Output = Either<Error, BatchCheckWhatsAppResult>;

@Injectable()
export class BatchCheckWhatsAppUseCase {
  constructor(
    private readonly evolutionApi: EvolutionApiPort,
    private readonly leadsRepo: LeadsRepository,
  ) {}

  async execute(input: BatchCheckWhatsAppInput): Promise<Output> {
    if (!input.sourceGroup?.trim()) {
      return left(new Error("sourceGroup é obrigatório"));
    }

    const leads = await this.leadsRepo.findBySourceGroup(input.sourceGroup.trim());
    const delayMs = input.delayMs ?? 1500;

    const result: BatchCheckWhatsAppResult = {
      total: leads.length,
      checked: 0,
      found: 0,
      notFound: 0,
      skipped: 0,
      errors: 0,
    };

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      const rawPhone = lead.phone ?? lead.whatsapp;

      if (!rawPhone) {
        result.skipped++;
        input.onProgress?.({
          current: i + 1,
          total: leads.length,
          leadId: lead.id.toString(),
          businessName: lead.businessName,
          exists: null,
        });
        continue;
      }

      const phone = normalizePhoneForWhatsApp(rawPhone);
      if (!phone) {
        result.skipped++;
        continue;
      }

      try {
        const checkResult = await this.evolutionApi.checkNumber(rawPhone);
        const verifiedNumber = checkResult.number
          ? (checkResult.number.startsWith("+") ? checkResult.number : `+${checkResult.number}`)
          : `+${phone}`;

        await this.leadsRepo.saveWhatsAppVerification(lead.id.toString(), {
          whatsappVerified: checkResult.exists,
          whatsappVerifiedAt: new Date(),
          whatsappVerifiedNumber: verifiedNumber,
        });

        result.checked++;
        if (checkResult.exists) result.found++;
        else result.notFound++;

        input.onProgress?.({
          current: i + 1,
          total: leads.length,
          leadId: lead.id.toString(),
          businessName: lead.businessName,
          exists: checkResult.exists,
        });
      } catch (err) {
        result.errors++;
        input.onProgress?.({
          current: i + 1,
          total: leads.length,
          leadId: lead.id.toString(),
          businessName: lead.businessName,
          exists: null,
          error: err instanceof Error ? err.message : "Erro desconhecido",
        });
      }

      // Rate limit delay between checks (skip after last item)
      if (i < leads.length - 1 && delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return right(result);
  }
}
