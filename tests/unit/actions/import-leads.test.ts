/**
 * Import Leads Action — Unit Tests
 *
 * Tests for src/actions/import-leads.ts
 * Covers row mapping, validation, duplicate detection, and result summary.
 *
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../../setup";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { getServerSession } from "next-auth";
import {
  mapRowToLeadData,
  importLeads,
  type ColumnMapping,
  type ImportResult,
} from "@/actions/import-leads";
import type { ParsedRow } from "@/lib/import/parse-file";

const mockGetSession = vi.mocked(getServerSession);
const SESSION = { user: { id: "user-1", name: "Bruno", email: "b@wb.com", role: "sdr" } };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue(SESSION as never);
  // checkLeadDuplicates usa findMany — sem duplicatas por padrão
  prismaMock.lead.findMany.mockResolvedValue([]);
  // $transaction executa o callback
  prismaMock.$transaction.mockImplementation(async (cb: (tx: typeof prismaMock) => Promise<unknown>) => cb(prismaMock));
});

// ---------------------------------------------------------------------------
describe("mapRowToLeadData — mapeamento de colunas", () => {
  it("mapeia coluna para businessName", () => {
    const row = { "Nome da Empresa": "Tech Corp" };
    const mapping: ColumnMapping = { "Nome da Empresa": "businessName" };
    const result = mapRowToLeadData(row, mapping);
    expect(result.businessName).toBe("Tech Corp");
  });

  it("mapeia múltiplos campos corretamente", () => {
    const row = { Nome: "Empresa X", Email: "x@x.com", Telefone: "11999998888" };
    const mapping: ColumnMapping = {
      Nome: "businessName",
      Email: "email",
      Telefone: "phone",
    };
    const result = mapRowToLeadData(row, mapping);
    expect(result.businessName).toBe("Empresa X");
    expect(result.email).toBe("x@x.com");
    expect(result.phone).toBe("11999998888");
  });

  it("ignora colunas mapeadas como 'ignore'", () => {
    const row = { Nome: "Empresa X", Coluna: "valor irrelevante" };
    const mapping: ColumnMapping = { Nome: "businessName", Coluna: "ignore" };
    const result = mapRowToLeadData(row, mapping);
    expect(result).not.toHaveProperty("Coluna");
    expect(Object.keys(result)).not.toContain("ignore");
  });

  it("ignora colunas sem mapeamento definido", () => {
    const row = { Nome: "Empresa X", SemMapeamento: "algo" };
    const mapping: ColumnMapping = { Nome: "businessName" };
    const result = mapRowToLeadData(row, mapping);
    expect(Object.keys(result)).toHaveLength(1);
  });

  it("converte valores vazios para undefined", () => {
    const row = { Nome: "Empresa X", Email: "" };
    const mapping: ColumnMapping = { Nome: "businessName", Email: "email" };
    const result = mapRowToLeadData(row, mapping);
    expect(result.email).toBeUndefined();
  });

  it("mapeia fonte (source) e termo de busca (searchTerm)", () => {
    const row = { Fonte: "B2BLeads", Busca: "clínica odontológica" };
    const mapping: ColumnMapping = { Fonte: "source", Busca: "searchTerm" };
    const result = mapRowToLeadData(row, mapping);
    expect(result.source).toBe("B2BLeads");
    expect(result.searchTerm).toBe("clínica odontológica");
  });

  it("mapeia cidade, estado e país", () => {
    const row = { Cidade: "São Paulo", Estado: "SP", País: "BR" };
    const mapping: ColumnMapping = { Cidade: "city", Estado: "state", País: "country" };
    const result = mapRowToLeadData(row, mapping);
    expect(result.city).toBe("São Paulo");
    expect(result.state).toBe("SP");
    expect(result.country).toBe("BR");
  });

  it("mapeia CNPJ", () => {
    const row = { CNPJ: "14.380.200/0001-89" };
    const mapping: ColumnMapping = { CNPJ: "companyRegistrationID" };
    const result = mapRowToLeadData(row, mapping);
    expect(result.companyRegistrationID).toBe("14.380.200/0001-89");
  });
});

// ---------------------------------------------------------------------------
describe("importLeads — autenticação", () => {
  it("retorna erro se não autenticado", async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await importLeads({ rows: [], mapping: {} });

    expect(result.error).toMatch(/não autorizado/i);
  });
});

// ---------------------------------------------------------------------------
describe("importLeads — criação de leads", () => {
  beforeEach(() => {
    prismaMock.lead.create.mockResolvedValue({
      id: "lead-new",
      businessName: "Empresa X",
      ownerId: "user-1",
    } as never);
    prismaMock.leadContact.create.mockResolvedValue({ id: "contact-1" } as never);
  });

  it("cria um lead para cada linha válida", async () => {
    const rows = [
      { Nome: "Empresa A" },
      { Nome: "Empresa B" },
    ];
    const mapping: ColumnMapping = { Nome: "businessName" };

    const result = await importLeads({ rows, mapping });

    expect(result.created).toBe(2);
    expect(prismaMock.lead.create).toHaveBeenCalledTimes(2);
  });

  it("passa ownerId da sessão ao criar o lead", async () => {
    const rows = [{ Nome: "Empresa X" }];
    const mapping: ColumnMapping = { Nome: "businessName" };

    await importLeads({ rows, mapping });

    expect(prismaMock.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ownerId: "user-1" }),
      })
    );
  });

  it("retorna summary com created, duplicates e errors", async () => {
    const rows = [{ Nome: "Empresa A" }];
    const mapping: ColumnMapping = { Nome: "businessName" };

    const result: ImportResult = await importLeads({ rows, mapping });

    expect(result).toHaveProperty("created");
    expect(result).toHaveProperty("duplicates");
    expect(result).toHaveProperty("errors");
    expect(result).toHaveProperty("total");
  });

  it("total é igual ao número de linhas enviadas", async () => {
    const rows = [{ Nome: "A" }, { Nome: "B" }, { Nome: "C" }];
    const mapping: ColumnMapping = { Nome: "businessName" };

    const result = await importLeads({ rows, mapping });

    expect(result.total).toBe(3);
  });
});

// ---------------------------------------------------------------------------
describe("importLeads — detecção de duplicidades", () => {
  it("conta linha como duplicata quando checkLeadDuplicates retorna matches", async () => {
    const existingLead = {
      id: "lead-existing",
      businessName: "Empresa X",
      companyRegistrationID: null,
      phone: null,
      email: null,
      address: null,
      city: null,
      state: null,
      isArchived: false,
      status: "new",
    };
    // findMany retorna duplicata para a primeira chamada (nome similar)
    prismaMock.lead.findMany.mockResolvedValue([existingLead] as never);

    const rows = [{ Nome: "Empresa X" }];
    const mapping: ColumnMapping = { Nome: "businessName" };

    const result = await importLeads({ rows, mapping });

    expect(result.duplicates).toBe(1);
    expect(result.created).toBe(0);
    expect(prismaMock.lead.create).not.toHaveBeenCalled();
  });

  it("inclui detalhes das duplicatas no resultado", async () => {
    const existingLead = {
      id: "lead-existing",
      businessName: "Empresa X",
      companyRegistrationID: null,
      phone: null,
      email: null,
      address: null,
      city: null,
      state: null,
      isArchived: false,
      status: "new",
    };
    prismaMock.lead.findMany.mockResolvedValue([existingLead] as never);

    const rows = [{ Nome: "Empresa X" }];
    const mapping: ColumnMapping = { Nome: "businessName" };

    const result = await importLeads({ rows, mapping });

    expect(result.duplicateDetails).toHaveLength(1);
    expect(result.duplicateDetails[0].row).toEqual({ Nome: "Empresa X" });
    expect(result.duplicateDetails[0].matches).toBeDefined();
  });

  it("com skipDuplicateCheck=true cria o lead mesmo com duplicatas", async () => {
    prismaMock.lead.findMany.mockResolvedValue([{
      id: "existing", businessName: "Empresa X",
      companyRegistrationID: null, phone: null, email: null,
      address: null, city: null, state: null, isArchived: false, status: "new",
    }] as never);
    prismaMock.lead.create.mockResolvedValue({ id: "new-lead", businessName: "Empresa X", ownerId: "user-1" } as never);

    const rows = [{ Nome: "Empresa X" }];
    const mapping: ColumnMapping = { Nome: "businessName" };

    const result = await importLeads({ rows, mapping, skipDuplicateCheck: true });

    expect(result.created).toBe(1);
    expect(result.duplicates).toBe(0);
  });
});

// ---------------------------------------------------------------------------
describe("importLeads — erros e validação", () => {
  it("conta linha como erro se businessName está ausente", async () => {
    const rows = [{ Email: "a@a.com" }]; // sem Nome mapeado
    const mapping: ColumnMapping = { Email: "email" };

    const result = await importLeads({ rows, mapping });

    expect(result.errors).toBe(1);
    expect(result.created).toBe(0);
  });

  it("continua processando as demais linhas após erro em uma linha", async () => {
    prismaMock.lead.create.mockResolvedValue({ id: "lead-new", businessName: "Empresa B", ownerId: "user-1" } as never);

    const rows: ParsedRow[] = [
      { Email: "a@a.com" },   // erro: sem businessName
      { Nome: "Empresa B" },  // ok
    ];
    const mapping: ColumnMapping = { Email: "email", Nome: "businessName" };

    const result = await importLeads({ rows, mapping });

    expect(result.errors).toBe(1);
    expect(result.created).toBe(1);
  });

  it("inclui detalhes dos erros no resultado", async () => {
    const rows = [{ Email: "a@a.com" }];
    const mapping: ColumnMapping = { Email: "email" };

    const result = await importLeads({ rows, mapping });

    expect(result.errorDetails).toHaveLength(1);
    expect(result.errorDetails[0].row).toEqual({ Email: "a@a.com" });
    expect(result.errorDetails[0].message).toBeDefined();
  });

  it("conta linha como erro se CNPJ inválido", async () => {
    const rows = [{ Nome: "Empresa X", CNPJ: "00000000000000" }];
    const mapping: ColumnMapping = { Nome: "businessName", CNPJ: "companyRegistrationID" };

    const result = await importLeads({ rows, mapping });

    expect(result.errors).toBe(1);
    expect(result.created).toBe(0);
  });
});

// ---------------------------------------------------------------------------
describe("importLeads — linhas vazias", () => {
  it("ignora linhas onde todos os campos mapeados estão vazios", async () => {
    const rows = [{ Nome: "", Email: "" }];
    const mapping: ColumnMapping = { Nome: "businessName", Email: "email" };

    const result = await importLeads({ rows, mapping });

    // linha ignorada não conta como erro nem como criado
    expect(result.total).toBe(1);
    expect(result.created).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.skipped).toBe(1);
  });
});
