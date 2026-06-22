import { Injectable } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { Lead } from "@/domain/leads/enterprise/entities/lead";
import { LeadImportRepository, ImportLeadRowData, ImportResult, ImportContactData } from "../repositories/lead-import.repository";
import { normalizePhoneE164 } from "@/infra/shared/phone/phone-normalizer";
import { CnaeEntry } from "../../enterprise/value-objects/cnae-entry.vo";

@Injectable()
export class ImportLeadsUseCase {
  constructor(private readonly repo: LeadImportRepository) {}

  async execute(input: {
    rows: ImportLeadRowData[];
    ownerId: string;
    skipDuplicates?: boolean;
  }): Promise<Either<never, ImportResult>> {
    const { rows, ownerId, skipDuplicates = false } = input;
    const result: ImportResult = { total: rows.length, imported: 0, skipped: 0, cnaeUpdated: 0, errors: [], skippedDetails: [] };

    if (rows.length === 0) return right(result);

    // Collect lookup data for bulk duplicate check
    // Fallback: use registeredName when businessName is empty (common in Brazilian company data)
    const resolvedName = (r: ImportLeadRowData) =>
      r.businessName?.trim() || r.registeredName?.trim() || "";
    const names = rows.map(r => resolvedName(r).toLowerCase()).filter(Boolean);
    const cnpjs = rows.map(r => r.companyRegistrationID).filter((id): id is string => !!id);

    const [existingNames, existingCnpjs] = skipDuplicates
      ? [new Map<string, string>(), new Map<string, string>()]
      : await Promise.all([
          this.repo.findExistingByNames(names, ownerId),
          cnpjs.length > 0 ? this.repo.findExistingByRegistrationIds(cnpjs, ownerId) : Promise.resolve(new Map<string, string>()),
        ]);

    // Pre-resolve primary CNAE IDs in parallel (only for rows that will be imported)
    const primaryCnaeMap = new Map<number, string>(); // rowIndex → cnaeId
    const secondaryCnaeMap = new Map<number, string[]>(); // rowIndex → cnaeId[]

    // Resolve each DISTINCT CNAE code only once. Rows in a batch frequently
    // share a code; resolving them concurrently raced on the unique(code)
    // constraint (P2002) because Prisma's upsert is a non-atomic
    // select-then-insert. Memoizing the promise per code means one upsert per
    // code, shared across every row that references it.
    const cnaeByCode = new Map<string, Promise<string>>();
    const resolveCnae = (entry: CnaeEntry): Promise<string> => {
      let pending = cnaeByCode.get(entry.code);
      if (!pending) {
        pending = this.repo.findOrCreateCnaeByCode(entry.code, entry.description);
        cnaeByCode.set(entry.code, pending);
      }
      return pending;
    };

    const cnaeResolutionTasks: Promise<void>[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      if (row.cnaePrincipal?.trim()) {
        const parsed = CnaeEntry.parse(row.cnaePrincipal);
        if (parsed) {
          const idx = i;
          cnaeResolutionTasks.push(
            resolveCnae(parsed).then(id => {
              primaryCnaeMap.set(idx, id);
            }),
          );
        }
      }

      if (row.cnaesSecundarios?.trim()) {
        const parts = row.cnaesSecundarios.split("|").map(s => s.trim()).filter(Boolean);
        const parsedParts = parts.map((s) => CnaeEntry.parse(s)).filter((p): p is CnaeEntry => p !== null);
        if (parsedParts.length > 0) {
          const idx = i;
          cnaeResolutionTasks.push(
            Promise.all(parsedParts.map(p => resolveCnae(p))).then(ids => {
              secondaryCnaeMap.set(idx, ids);
            }),
          );
        }
      }
    }
    await Promise.all(cnaeResolutionTasks);

    const toCreate: Lead[] = [];
    const toCreateRowIndices: number[] = []; // tracks original row index for each lead in toCreate

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const effectiveName = resolvedName(row);
      const normalizedName = effectiveName.toLowerCase();

      // Deduplication: CNPJ takes priority, then name
      if (!skipDuplicates && row.companyRegistrationID && existingCnpjs.has(row.companyRegistrationID)) {
        result.skipped++;
        result.skippedDetails.push({ rowIndex: i, businessName: effectiveName, reason: "cnpj", existingLeadId: existingCnpjs.get(row.companyRegistrationID) });
        continue;
      }
      if (!skipDuplicates && existingNames.has(normalizedName)) {
        result.skipped++;
        result.skippedDetails.push({ rowIndex: i, businessName: effectiveName, reason: "name", existingLeadId: existingNames.get(normalizedName) });
        continue;
      }

      if (!effectiveName) {
        result.errors.push({ row: i + 1, reason: "businessName não pode ser vazio" });
        continue;
      }

      const lead = Lead.create({
        businessName: effectiveName,
        registeredName: row.registeredName,
        companyRegistrationID: row.companyRegistrationID,
        foundationDate: row.foundationDate ? new Date(row.foundationDate) : undefined,
        businessStatus: row.businessStatus,
        legalNature: row.legalNature,
        branchType: row.branchType,
        simplesNacional: row.simplesNacional,
        isMei: row.isMei,
        email: row.email,
        phone: normalizePhoneE164(row.phone) ?? undefined,
        phone2: normalizePhoneE164(row.phone2) ?? undefined,
        whatsapp: normalizePhoneE164(row.whatsapp) ?? undefined,
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
        primaryCNAEId: primaryCnaeMap.get(i),
        sourceGroup: row.sourceGroup,
        ownerId,
      });

      toCreate.push(lead);
      toCreateRowIndices.push(i);
      existingNames.set(normalizedName, "");
    }

    if (toCreate.length > 0) {
      await this.repo.batchCreate(toCreate);
      result.imported = toCreate.length;

      // Create LeadContacts for leads that have a contactName, companyOwner, or additionalContactNames
      const contactItems: ImportContactData[] = [];
      for (let j = 0; j < toCreate.length; j++) {
        const row = rows[toCreateRowIndices[j]];
        const leadId = toCreate[j].id.toString();
        const primaryName = row.contactName?.trim() || row.companyOwner?.trim();
        const additionals = (row.additionalContactNames ?? []).filter(n => n.trim());

        const roles = row.additionalContactRoles ?? [];
        if (primaryName) {
          contactItems.push({
            leadId,
            name: primaryName,
            role: row.contactRole?.trim() || "Responsável",
            email: row.contactEmail?.trim() || undefined,
            phone: normalizePhoneE164(row.contactPhone) ?? undefined,
            whatsapp: normalizePhoneE164(row.contactWhatsapp) ?? undefined,
            linkedin: row.contactLinkedin?.trim() || undefined,
            instagram: row.contactInstagram?.trim() || undefined,
            isPrimary: true,
          });
          for (let k = 0; k < additionals.length; k++) {
            contactItems.push({ leadId, name: additionals[k].trim(), role: roles[k]?.trim() || undefined, isPrimary: false });
          }
        } else {
          for (let k = 0; k < additionals.length; k++) {
            contactItems.push({ leadId, name: additionals[k].trim(), role: roles[k]?.trim() || undefined, isPrimary: k === 0 });
          }
        }
      }
      if (contactItems.length > 0) {
        await this.repo.batchCreateContacts(contactItems);
      }

      // Build secondary CNAE items using the created lead IDs
      const secondaryItems: Array<{ leadId: string; cnaeId: string }> = [];
      for (let j = 0; j < toCreate.length; j++) {
        const rowIdx = toCreateRowIndices[j];
        const cnaeIds = secondaryCnaeMap.get(rowIdx);
        if (cnaeIds && cnaeIds.length > 0) {
          const leadId = toCreate[j].id.toString();
          for (const cnaeId of cnaeIds) {
            secondaryItems.push({ leadId, cnaeId });
          }
        }
      }
      if (secondaryItems.length > 0) {
        await this.repo.batchCreateSecondaryCNAEs(secondaryItems);
      }
    }

    return right(result);
  }
}
