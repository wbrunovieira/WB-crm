import { Injectable } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { Lead } from "@/domain/leads/enterprise/entities/lead";
import { LeadImportRepository, ImportLeadRowData, ImportResult } from "../repositories/lead-import.repository";

@Injectable()
export class ImportLeadsUseCase {
  constructor(private readonly repo: LeadImportRepository) {}

  async execute(input: {
    rows: ImportLeadRowData[];
    ownerId: string;
  }): Promise<Either<never, ImportResult>> {
    const { rows, ownerId } = input;
    const result: ImportResult = { total: rows.length, imported: 0, skipped: 0, errors: [] };

    if (rows.length === 0) return right(result);

    // Collect lookup data for bulk duplicate check
    const names = rows.map(r => r.businessName.trim().toLowerCase()).filter(Boolean);
    const cnpjs = rows.map(r => r.companyRegistrationID).filter((id): id is string => !!id);

    const [existingNames, existingCnpjs] = await Promise.all([
      this.repo.findExistingByNames(names, ownerId),
      cnpjs.length > 0 ? this.repo.findExistingByRegistrationIds(cnpjs, ownerId) : Promise.resolve(new Set<string>()),
    ]);

    const toCreate: Lead[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const normalizedName = row.businessName.trim().toLowerCase();

      // Deduplication: CNPJ takes priority, then name
      if (row.companyRegistrationID && existingCnpjs.has(row.companyRegistrationID)) {
        result.skipped++;
        continue;
      }
      if (existingNames.has(normalizedName)) {
        result.skipped++;
        continue;
      }

      const trimmedName = row.businessName.trim();
      if (!trimmedName) {
        result.errors.push({ row: i + 1, reason: "businessName não pode ser vazio" });
        continue;
      }

      const lead = Lead.create({
        businessName: trimmedName,
        registeredName: row.registeredName,
        companyRegistrationID: row.companyRegistrationID,
        email: row.email,
        phone: row.phone,
        whatsapp: row.whatsapp,
        website: row.website,
        address: row.address,
        city: row.city,
        state: row.state,
        country: row.country,
        zipCode: row.zipCode,
        instagram: row.instagram,
        linkedin: row.linkedin,
        facebook: row.facebook,
        description: row.description,
        source: row.source ?? "import",
        quality: row.quality,
        ownerId,
      });

      toCreate.push(lead);
      // Mark name as seen to avoid intra-batch duplicates
      existingNames.add(normalizedName);
    }

    if (toCreate.length > 0) {
      await this.repo.batchCreate(toCreate);
      result.imported = toCreate.length;
    }

    return right(result);
  }
}
