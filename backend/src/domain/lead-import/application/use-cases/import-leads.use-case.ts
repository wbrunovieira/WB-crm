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
    skipDuplicates?: boolean;
  }): Promise<Either<never, ImportResult>> {
    const { rows, ownerId, skipDuplicates = false } = input;
    const result: ImportResult = { total: rows.length, imported: 0, skipped: 0, errors: [], skippedDetails: [] };

    if (rows.length === 0) return right(result);

    // Collect lookup data for bulk duplicate check
    const names = rows.map(r => r.businessName.trim().toLowerCase()).filter(Boolean);
    const cnpjs = rows.map(r => r.companyRegistrationID).filter((id): id is string => !!id);

    const [existingNames, existingCnpjs] = skipDuplicates
      ? [new Set<string>(), new Set<string>()]
      : await Promise.all([
          this.repo.findExistingByNames(names, ownerId),
          cnpjs.length > 0 ? this.repo.findExistingByRegistrationIds(cnpjs, ownerId) : Promise.resolve(new Set<string>()),
        ]);

    const toCreate: Lead[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const normalizedName = row.businessName.trim().toLowerCase();

      // Deduplication: CNPJ takes priority, then name
      if (!skipDuplicates && row.companyRegistrationID && existingCnpjs.has(row.companyRegistrationID)) {
        result.skipped++;
        result.skippedDetails.push({ rowIndex: i, businessName: row.businessName, reason: "cnpj" });
        continue;
      }
      if (!skipDuplicates && existingNames.has(normalizedName)) {
        result.skipped++;
        result.skippedDetails.push({ rowIndex: i, businessName: row.businessName, reason: "name" });
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
        foundationDate: row.foundationDate ? new Date(row.foundationDate) : undefined,
        businessStatus: row.businessStatus,
        legalNature: row.legalNature,
        branchType: row.branchType,
        simplesNacional: row.simplesNacional,
        isMei: row.isMei,
        email: row.email,
        phone: row.phone,
        phone2: row.phone2,
        whatsapp: row.whatsapp,
        website: row.website,
        address: row.address,
        vicinity: row.vicinity,
        city: row.city,
        state: row.state,
        country: row.country,
        zipCode: row.zipCode,
        instagram: row.instagram,
        linkedin: row.linkedin,
        facebook: row.facebook,
        twitter: row.twitter,
        tiktok: row.tiktok,
        companyOwner: row.companyOwner,
        companySize: row.companySize,
        revenue: row.revenue,
        revenueRange: row.revenueRange,
        equityCapital: row.equityCapital,
        employeesCount: row.employeesCount,
        description: row.description,
        segment: row.segment,
        source: row.source ?? "import",
        quality: row.quality,
        searchTerm: row.searchTerm,
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
