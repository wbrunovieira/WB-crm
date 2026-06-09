import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryLeadImportRepository } from "../../fakes/in-memory-lead-import.repository";
import { ImportLeadsUseCase } from "@/domain/lead-import/application/use-cases/import-leads.use-case";

let repo: InMemoryLeadImportRepository;
let uc: ImportLeadsUseCase;

beforeEach(() => {
  repo = new InMemoryLeadImportRepository();
  uc = new ImportLeadsUseCase(repo);
});

const base = { ownerId: "u1" };

describe("ImportLeadsUseCase", () => {
  it("imports empty batch with no changes", async () => {
    const r = (await uc.execute({ rows: [], ...base })).unwrap();
    expect(r.total).toBe(0);
    expect(r.imported).toBe(0);
  });

  it("imports a single valid lead", async () => {
    const r = (await uc.execute({
      rows: [{ businessName: "Empresa Alpha", city: "SP", source: "manual" }],
      ...base,
    })).unwrap();
    expect(r.imported).toBe(1);
    expect(r.skipped).toBe(0);
    expect(r.errors).toHaveLength(0);
    expect(repo.leads).toHaveLength(1);
    expect(repo.leads[0].businessName).toBe("Empresa Alpha");
    expect(repo.leads[0].source).toBe("manual");
  });

  it("defaults source to 'import'", async () => {
    await uc.execute({ rows: [{ businessName: "Empresa Beta" }], ...base });
    expect(repo.leads[0].source).toBe("import");
  });

  it("imports multiple leads in batch", async () => {
    const r = (await uc.execute({
      rows: [
        { businessName: "A" },
        { businessName: "B" },
        { businessName: "C" },
      ],
      ...base,
    })).unwrap();
    expect(r.imported).toBe(3);
    expect(repo.leads).toHaveLength(3);
  });

  it("skips lead with same businessName (existing in DB)", async () => {
    await uc.execute({ rows: [{ businessName: "Duplicada" }], ...base });

    const r = (await uc.execute({
      rows: [{ businessName: "Duplicada" }],
      ...base,
    })).unwrap();
    expect(r.skipped).toBe(1);
    expect(r.imported).toBe(0);
    expect(repo.leads).toHaveLength(1);
  });

  it("deduplicates by name case-insensitively", async () => {
    await uc.execute({ rows: [{ businessName: "Empresa XYZ" }], ...base });

    const r = (await uc.execute({
      rows: [{ businessName: "EMPRESA XYZ" }],
      ...base,
    })).unwrap();
    expect(r.skipped).toBe(1);
  });

  it("skips lead with same CNPJ", async () => {
    await uc.execute({
      rows: [{ businessName: "A", companyRegistrationID: "12345" }],
      ...base,
    });
    const r = (await uc.execute({
      rows: [{ businessName: "Different Name", companyRegistrationID: "12345" }],
      ...base,
    })).unwrap();
    expect(r.skipped).toBe(1);
  });

  it("deduplicates intra-batch by name", async () => {
    const r = (await uc.execute({
      rows: [{ businessName: "Unica" }, { businessName: "Unica" }],
      ...base,
    })).unwrap();
    expect(r.imported).toBe(1);
    expect(r.skipped).toBe(1);
  });

  it("tracks error rows for invalid leads", async () => {
    const r = (await uc.execute({
      rows: [
        { businessName: "Valida" },
        { businessName: "" },
      ],
      ...base,
    })).unwrap();
    expect(r.imported).toBe(1);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].row).toBe(2);
  });

  it("mixes imports, skips and errors correctly", async () => {
    await uc.execute({ rows: [{ businessName: "Existente" }], ...base });

    const r = (await uc.execute({
      rows: [
        { businessName: "Nova" },
        { businessName: "Existente" },
        { businessName: "" },
      ],
      ...base,
    })).unwrap();
    expect(r.total).toBe(3);
    expect(r.imported).toBe(1);
    expect(r.skipped).toBe(1);
    expect(r.errors).toHaveLength(1);
  });

  it("populates skippedDetails with reason 'name' when name already exists", async () => {
    await uc.execute({ rows: [{ businessName: "Empresa Existente" }], ...base });

    const r = (await uc.execute({
      rows: [{ businessName: "Empresa Existente" }],
      ...base,
    })).unwrap();
    expect(r.skippedDetails).toHaveLength(1);
    expect(r.skippedDetails[0].reason).toBe("name");
    expect(r.skippedDetails[0].businessName).toBe("Empresa Existente");
  });

  it("populates skippedDetails with reason 'cnpj' when cnpj already exists", async () => {
    await uc.execute({
      rows: [{ businessName: "Original", companyRegistrationID: "99999" }],
      ...base,
    });

    const r = (await uc.execute({
      rows: [{ businessName: "Outro Nome", companyRegistrationID: "99999" }],
      ...base,
    })).unwrap();
    expect(r.skippedDetails).toHaveLength(1);
    expect(r.skippedDetails[0].reason).toBe("cnpj");
    expect(r.skippedDetails[0].businessName).toBe("Outro Nome");
  });

  it("does not skip when skipDuplicates is true", async () => {
    await uc.execute({ rows: [{ businessName: "Duplicada" }], ...base });

    const r = (await uc.execute({
      rows: [{ businessName: "Duplicada" }],
      ...base,
      skipDuplicates: true,
    })).unwrap();
    expect(r.imported).toBe(1);
    expect(r.skipped).toBe(0);
    expect(r.skippedDetails).toHaveLength(0);
  });

  it("uses registeredName as businessName when businessName is empty", async () => {
    const r = (await uc.execute({
      rows: [{ businessName: "", registeredName: "EMPRESA LTDA" }],
      ...base,
    })).unwrap();
    expect(r.imported).toBe(1);
    expect(r.errors).toHaveLength(0);
    expect(repo.leads[0].businessName).toBe("EMPRESA LTDA");
    expect(repo.leads[0].registeredName).toBe("EMPRESA LTDA");
  });

  it("deduplicates by registeredName fallback when businessName is empty", async () => {
    await uc.execute({ rows: [{ businessName: "", registeredName: "EMPRESA LTDA" }], ...base });

    const r = (await uc.execute({
      rows: [{ businessName: "", registeredName: "EMPRESA LTDA" }],
      ...base,
    })).unwrap();
    expect(r.skipped).toBe(1);
    expect(r.imported).toBe(0);
  });

  it("errors when both businessName and registeredName are empty", async () => {
    const r = (await uc.execute({
      rows: [{ businessName: "", registeredName: "" }],
      ...base,
    })).unwrap();
    expect(r.imported).toBe(0);
    expect(r.errors).toHaveLength(1);
  });

  it("skippedDetails rowIndex is 0-based index in input rows array", async () => {
    await uc.execute({ rows: [{ businessName: "Ja Existe" }], ...base });

    const r = (await uc.execute({
      rows: [
        { businessName: "Nova A" },
        { businessName: "Nova B" },
        { businessName: "Ja Existe" },
      ],
      ...base,
    })).unwrap();
    expect(r.skippedDetails).toHaveLength(1);
    expect(r.skippedDetails[0].rowIndex).toBe(2);
  });

  it("skippedDetails includes existingLeadId when lead already exists in DB", async () => {
    // First import creates a lead with a known ID
    await uc.execute({ rows: [{ businessName: "Empresa DB" }], ...base });
    const existingLead = repo.leads.find(l => l.businessName === "Empresa DB")!;
    expect(existingLead).toBeDefined();

    // Second import should skip with existingLeadId populated
    const r = (await uc.execute({
      rows: [{ businessName: "Empresa DB" }],
      ...base,
    })).unwrap();
    expect(r.skippedDetails).toHaveLength(1);
    expect(r.skippedDetails[0].existingLeadId).toBe(existingLead.id.toString());
  });

  it("skippedDetails existingLeadId is empty string for intra-batch duplicates", async () => {
    // No pre-existing leads — both rows are new in this batch
    const r = (await uc.execute({
      rows: [{ businessName: "Intra Batch" }, { businessName: "Intra Batch" }],
      ...base,
    })).unwrap();
    expect(r.imported).toBe(1);
    expect(r.skipped).toBe(1);
    expect(r.skippedDetails[0].existingLeadId).toBe("");
  });

  // companyOwner → LeadContact tests
  describe("companyOwner → LeadContact", () => {
    it("creates a primary LeadContact when companyOwner is present", async () => {
      await uc.execute({
        rows: [{ businessName: "Empresa A", companyOwner: "João Silva" }],
        ...base,
      });
      expect(repo.contacts).toHaveLength(1);
      expect(repo.contacts[0].name).toBe("João Silva");
      expect(repo.contacts[0].isPrimary).toBe(true);
      expect(repo.contacts[0].leadId).toBe(repo.leads[0].id.toString());
    });

    it("creates a LeadContact from contactName without saving to companyOwner", async () => {
      await uc.execute({
        rows: [{ businessName: "Empresa B", contactName: "Maria Costa" }],
        ...base,
      });
      expect(repo.contacts).toHaveLength(1);
      expect(repo.contacts[0].name).toBe("Maria Costa");
      expect(repo.leads[0].companyOwner).toBeUndefined();
    });

    it("prefers contactName over companyOwner for the contact name when both are present", async () => {
      await uc.execute({
        rows: [{ businessName: "Empresa C", contactName: "Nome Contato", companyOwner: "Dono Empresa" }],
        ...base,
      });
      expect(repo.contacts).toHaveLength(1);
      expect(repo.contacts[0].name).toBe("Nome Contato");
    });

    it("does not create a contact when contactName and companyOwner are both absent", async () => {
      await uc.execute({
        rows: [{ businessName: "Empresa D" }],
        ...base,
      });
      expect(repo.contacts).toHaveLength(0);
    });

    it("uses default role 'Responsável' when contactRole is not provided", async () => {
      await uc.execute({
        rows: [{ businessName: "Empresa A", companyOwner: "Maria" }],
        ...base,
      });
      expect(repo.contacts[0].role).toBe("Responsável");
    });

    it("uses contactRole when provided", async () => {
      await uc.execute({
        rows: [{ businessName: "Empresa A", companyOwner: "Maria", contactRole: "Sócia" }],
        ...base,
      });
      expect(repo.contacts[0].role).toBe("Sócia");
    });

    it("does not create a contact when companyOwner is absent", async () => {
      await uc.execute({
        rows: [{ businessName: "Empresa Sem Dono" }],
        ...base,
      });
      expect(repo.contacts).toHaveLength(0);
    });

    it("does not create a contact when companyOwner is empty string", async () => {
      await uc.execute({
        rows: [{ businessName: "Empresa Sem Dono", companyOwner: "  " }],
        ...base,
      });
      expect(repo.contacts).toHaveLength(0);
    });

    it("copies contactEmail to the LeadContact", async () => {
      await uc.execute({
        rows: [{ businessName: "Empresa A", companyOwner: "Ana", contactEmail: "ana@empresa.pt" }],
        ...base,
      });
      expect(repo.contacts[0].email).toBe("ana@empresa.pt");
    });

    it("copies contactPhone to the LeadContact", async () => {
      await uc.execute({
        rows: [{ businessName: "Empresa A", companyOwner: "Ana", contactPhone: "+351910000001" }],
        ...base,
      });
      expect(repo.contacts[0].phone).toBe("+351910000001");
    });

    it("copies contactWhatsapp to the LeadContact", async () => {
      await uc.execute({
        rows: [{ businessName: "Empresa A", companyOwner: "Ana", contactWhatsapp: "+351910000002" }],
        ...base,
      });
      expect(repo.contacts[0].whatsapp).toBe("+351910000002");
    });

    it("copies contactLinkedin to the LeadContact", async () => {
      await uc.execute({
        rows: [{ businessName: "Empresa A", companyOwner: "Ana", contactLinkedin: "https://linkedin.com/in/ana" }],
        ...base,
      });
      expect(repo.contacts[0].linkedin).toBe("https://linkedin.com/in/ana");
    });

    it("copies contactInstagram to the LeadContact", async () => {
      await uc.execute({
        rows: [{ businessName: "Empresa A", companyOwner: "Ana", contactInstagram: "@ana" }],
        ...base,
      });
      expect(repo.contacts[0].instagram).toBe("@ana");
    });

    it("creates contacts only for leads that have companyOwner", async () => {
      await uc.execute({
        rows: [
          { businessName: "Com Dono", companyOwner: "Dono" },
          { businessName: "Sem Dono" },
          { businessName: "Outro Com Dono", companyOwner: "Outro" },
        ],
        ...base,
      });
      expect(repo.leads).toHaveLength(3);
      expect(repo.contacts).toHaveLength(2);
      expect(repo.contacts.map(c => c.name)).toEqual(["Dono", "Outro"]);
    });

    it("does not create contact for skipped (duplicate) leads", async () => {
      await uc.execute({ rows: [{ businessName: "Existente", companyOwner: "Dono1" }], ...base });

      await uc.execute({ rows: [{ businessName: "Existente", companyOwner: "Dono2" }], ...base });

      expect(repo.contacts).toHaveLength(1);
      expect(repo.contacts[0].name).toBe("Dono1");
    });
  });

  // additionalContactNames — múltiplos sócios
  describe("additionalContactNames — múltiplos sócios", () => {
    it("creates one contact per name in additionalContactNames", async () => {
      await uc.execute({
        rows: [{ businessName: "Empresa Socios", contactName: "Socio 1", additionalContactNames: ["Socio 2", "Socio 3"] }],
        ...base,
      });
      expect(repo.contacts).toHaveLength(3);
      expect(repo.contacts.map(c => c.name)).toEqual(["Socio 1", "Socio 2", "Socio 3"]);
    });

    it("primary contact is isPrimary true, additional contacts are isPrimary false", async () => {
      await uc.execute({
        rows: [{ businessName: "Empresa Socios", contactName: "Socio 1", additionalContactNames: ["Socio 2", "Socio 3"] }],
        ...base,
      });
      expect(repo.contacts[0].isPrimary).toBe(true);
      expect(repo.contacts[1].isPrimary).toBe(false);
      expect(repo.contacts[2].isPrimary).toBe(false);
    });

    it("first additionalContactName becomes primary when contactName and companyOwner are absent", async () => {
      await uc.execute({
        rows: [{ businessName: "Empresa Socios", additionalContactNames: ["Socio 1", "Socio 2"] }],
        ...base,
      });
      expect(repo.contacts).toHaveLength(2);
      expect(repo.contacts[0].name).toBe("Socio 1");
      expect(repo.contacts[0].isPrimary).toBe(true);
      expect(repo.contacts[1].isPrimary).toBe(false);
    });

    it("filters empty strings from additionalContactNames", async () => {
      await uc.execute({
        rows: [{ businessName: "Empresa Socios", additionalContactNames: ["Socio 1", "", "  ", "Socio 2"] }],
        ...base,
      });
      expect(repo.contacts).toHaveLength(2);
      expect(repo.contacts.map(c => c.name)).toEqual(["Socio 1", "Socio 2"]);
    });

    it("leaves role undefined for additional contacts when additionalContactRoles not provided", async () => {
      await uc.execute({
        rows: [{ businessName: "Empresa", contactName: "Dono", additionalContactNames: ["Socio 2"] }],
        ...base,
      });
      expect(repo.contacts[1].role).toBeUndefined();
    });

    it("uses additionalContactRoles when provided (paired by position)", async () => {
      await uc.execute({
        rows: [{
          businessName: "Empresa",
          contactName: "Dono",
          additionalContactNames: ["Contato 2", "Contato 3"],
          additionalContactRoles: ["Diretor", "Gerente"],
        }],
        ...base,
      });
      expect(repo.contacts[1].role).toBe("Diretor");
      expect(repo.contacts[2].role).toBe("Gerente");
    });

    it("uses role from additionalContactRoles for contacts without primary when roles are provided", async () => {
      await uc.execute({
        rows: [{
          businessName: "Empresa",
          additionalContactNames: ["Socio 1", "Socio 2"],
          additionalContactRoles: ["Sócio", undefined],
        }],
        ...base,
      });
      expect(repo.contacts[0].role).toBe("Sócio");
      expect(repo.contacts[1].role).toBeUndefined();
    });

    it("does not create additional contacts for skipped (duplicate) leads", async () => {
      await uc.execute({
        rows: [{ businessName: "Existente", additionalContactNames: ["Socio 1"] }],
        ...base,
      });
      await uc.execute({
        rows: [{ businessName: "Existente", additionalContactNames: ["Socio 2"] }],
        ...base,
      });
      expect(repo.contacts).toHaveLength(1);
      expect(repo.contacts[0].name).toBe("Socio 1");
    });

    it("handles undefined additionalContactNames gracefully", async () => {
      await uc.execute({
        rows: [{ businessName: "Empresa Sem Adicionais", contactName: "Dono" }],
        ...base,
      });
      expect(repo.contacts).toHaveLength(1);
      expect(repo.contacts[0].name).toBe("Dono");
    });
  });

  // CNAE tests
  it("sets primaryCNAEId when cnaePrincipal is provided", async () => {
    const r = (await uc.execute({
      rows: [{ businessName: "Empresa CNAE", cnaePrincipal: "4744005 - Comércio varejista de materiais de construção" }],
      ...base,
    })).unwrap();
    expect(r.imported).toBe(1);
    expect(repo.leads[0].primaryCNAEId).toBe("cnae-4744005");
  });

  it("creates CNAE record via findOrCreateCnaeByCode when code is new", async () => {
    await uc.execute({
      rows: [{ businessName: "Empresa CNAE Nova", cnaePrincipal: "9999901 - Atividade nova" }],
      ...base,
    });
    const created = repo.cnaes.find(c => c.code === "9999901");
    expect(created).toBeDefined();
    expect(created?.description).toBe("Atividade nova");
  });

  it("creates secondary CNAEs when cnaesSecundarios is provided", async () => {
    const r = (await uc.execute({
      rows: [{ businessName: "Empresa Sec CNAE", cnaesSecundarios: "4742300 - Comércio varejista|4744001 - Outro ramo" }],
      ...base,
    })).unwrap();
    expect(r.imported).toBe(1);
    expect(repo.secondaryCnaes).toHaveLength(2);
    expect(repo.secondaryCnaes.map(s => s.cnaeId)).toContain("cnae-4742300");
    expect(repo.secondaryCnaes.map(s => s.cnaeId)).toContain("cnae-4744001");
  });

  it("parses CNAE code from 'CODE - description' format", async () => {
    await uc.execute({
      rows: [{ businessName: "Parse Test", cnaePrincipal: "1234567 - Descrição do CNAE" }],
      ...base,
    });
    expect(repo.cnaes.find(c => c.code === "1234567")).toBeDefined();
    expect(repo.cnaes.find(c => c.code === "1234567")?.description).toBe("Descrição do CNAE");
  });

  it("handles empty cnaePrincipal gracefully", async () => {
    const r = (await uc.execute({
      rows: [{ businessName: "Empresa Sem CNAE", cnaePrincipal: "" }],
      ...base,
    })).unwrap();
    expect(r.imported).toBe(1);
    expect(repo.leads[0].primaryCNAEId).toBeUndefined();
    expect(repo.cnaes).toHaveLength(0);
  });
});
