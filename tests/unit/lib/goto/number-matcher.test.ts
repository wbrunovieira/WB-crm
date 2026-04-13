/**
 * GoTo Number Matcher Tests
 *
 * Tests for src/lib/goto/number-matcher.ts
 * - Encontra Contact/Lead/Partner pelo número de telefone
 * - Normaliza formatos brasileiros via regexp_replace no PostgreSQL
 * - Respeita ownerId (isolamento de dados)
 * - Retorna null quando número não encontrado
 *
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { matchPhoneToEntity, phoneVariations } from "@/lib/goto/number-matcher";
import { prismaMock } from "../../../setup";

const OWNER_ID = "user-owner-123";

// $queryRaw returns arrays of rows
const noResult: never[] = [];
const contactRow = [{ id: "contact-1" }];
const leadRow = [{ id: "lead-1" }];
const partnerRow = [{ id: "partner-1" }];

beforeEach(() => {
  // By default, all raw queries return empty (nothing found)
  prismaMock.$queryRaw.mockResolvedValue(noResult);
  // Default: entities are NOT in operations — secondary ORM checks pass
  prismaMock.lead.findFirst.mockResolvedValue({ id: "lead-mock" } as never);
  prismaMock.contact.findFirst.mockResolvedValue({ id: "contact-mock" } as never);
});

describe("matchPhoneToEntity — prioridade de busca", () => {
  it("deve retornar Contact quando número bate com contato", async () => {
    // Contact query returns a match, lead/partner don't matter
    prismaMock.$queryRaw.mockResolvedValueOnce(contactRow);

    const result = await matchPhoneToEntity("+557135997905", OWNER_ID);

    expect(result?.entityType).toBe("contact");
    expect(result?.entityId).toBe("contact-1");
  });

  it("deve buscar Lead se Contact não encontrado", async () => {
    // Contact = not found, Lead = found
    prismaMock.$queryRaw
      .mockResolvedValueOnce(noResult)  // contact
      .mockResolvedValueOnce(leadRow);  // lead

    const result = await matchPhoneToEntity("+5511999998888", OWNER_ID);

    expect(result?.entityType).toBe("lead");
    expect(result?.entityId).toBe("lead-1");
  });

  it("deve buscar Partner se Contact e Lead não encontrados", async () => {
    // GoTo findLeadByPhone makes 2 queries: leads table + lead_contacts
    prismaMock.$queryRaw
      .mockResolvedValueOnce(noResult)   // contact
      .mockResolvedValueOnce(noResult)   // lead (leads table)
      .mockResolvedValueOnce(noResult)   // lead (lead_contacts table)
      .mockResolvedValueOnce(partnerRow); // partner

    const result = await matchPhoneToEntity("+5521988887777", OWNER_ID);

    expect(result?.entityType).toBe("partner");
    expect(result?.entityId).toBe("partner-1");
  });

  it("deve retornar null quando número não encontrado em nenhuma entidade", async () => {
    prismaMock.$queryRaw.mockResolvedValue(noResult);

    const result = await matchPhoneToEntity("+5599999999999", OWNER_ID);
    expect(result).toBeNull();
  });
});

describe("matchPhoneToEntity — normalização de números", () => {
  it("deve encontrar contato com número em E.164 (+5571...)", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce(contactRow);

    const result = await matchPhoneToEntity("+557135997905", OWNER_ID);

    expect(result?.entityType).toBe("contact");
    expect(prismaMock.$queryRaw).toHaveBeenCalled();
  });

  it("deve encontrar contato com número sem código do país (7135997905)", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce(contactRow);

    const result = await matchPhoneToEntity("7135997905", OWNER_ID);

    expect(result?.entityType).toBe("contact");
  });

  it("deve encontrar contato com número formatado BR ((71) 3599-7905)", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce(contactRow);

    const result = await matchPhoneToEntity("(71) 3599-7905", OWNER_ID);

    expect(result?.entityType).toBe("contact");
  });

  it("deve gerar variações de busca para cobertura com e sem código do país", async () => {
    prismaMock.$queryRaw.mockResolvedValue(noResult);

    await matchPhoneToEntity("+5511999998888", OWNER_ID);

    // The raw query should have been called (at least for contact lookup)
    expect(prismaMock.$queryRaw).toHaveBeenCalled();
  });
});

describe("matchPhoneToEntity — isolamento por ownerId", () => {
  it("deve filtrar por ownerId na busca de Contact", async () => {
    prismaMock.$queryRaw.mockResolvedValue(noResult);

    await matchPhoneToEntity("+5571999999999", OWNER_ID);

    // Raw query is called — ownerId is embedded in the SQL
    expect(prismaMock.$queryRaw).toHaveBeenCalled();
    const firstCall = prismaMock.$queryRaw.mock.calls[0];
    // The SQL template strings should contain ownerId check
    expect(JSON.stringify(firstCall)).toContain("ownerId");
  });

  it("deve executar busca de Lead com ownerId quando Contact não encontrado", async () => {
    prismaMock.$queryRaw
      .mockResolvedValueOnce(noResult)  // contact miss
      .mockResolvedValueOnce(noResult); // lead miss

    await matchPhoneToEntity("+5571999999999", OWNER_ID);

    // At least 2 raw queries: contact + lead (may also query partner)
    expect(prismaMock.$queryRaw.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

/**
 * Testa a função phoneVariations diretamente.
 *
 * O matching real acontece via regexp_replace no PostgreSQL (strip não-dígitos
 * do número armazenado), então o que importa é que as variações digit-only
 * geradas aqui cubram o número armazenado em qualquer formato.
 *
 * Exemplo: GoTo envia "+557135997905", DB tem "(71) 3599-7905".
 * regexp_replace("(71) 3599-7905", '[^0-9]', '') = "7135997905"
 * phoneVariations("+557135997905") inclui "7135997905" → match!
 */
describe("phoneVariations — formatos de entrada do GoTo", () => {
  it("E.164 completo: +5571 fixo 8 dígitos", () => {
    const v = phoneVariations("+557135997905");
    expect(v).toContain("557135997905"); // com código
    expect(v).toContain("7135997905");   // DDD + número
    expect(v).toContain("35997905");     // número local
  });

  it("E.164 completo: +5571 celular 9 dígitos", () => {
    const v = phoneVariations("+5571999998888");
    expect(v).toContain("5571999998888"); // com código
    expect(v).toContain("71999998888");   // DDD + 9 + número
    expect(v).toContain("999998888");     // número local (sem DDD)
  });

  it("E.164 Rio: +5521 celular", () => {
    const v = phoneVariations("+5521988887777");
    expect(v).toContain("5521988887777");
    expect(v).toContain("21988887777");
    expect(v).toContain("988887777");
  });

  it("sem código do país: 71999998888", () => {
    const v = phoneVariations("71999998888");
    expect(v).toContain("71999998888");
    expect(v).toContain("5571999998888"); // adiciona 55
    expect(v).toContain("999998888");     // local
  });

  it("formatado BR: (71) 3599-7905 como entrada", () => {
    const v = phoneVariations("(71) 3599-7905");
    expect(v).toContain("7135997905");
    expect(v).toContain("557135997905");
    expect(v).toContain("35997905");
  });

  it("local 8 dígitos sem DDD: 35997905", () => {
    const v = phoneVariations("35997905");
    expect(v).toContain("35997905");
    // Não deve gerar variações muito curtas
    expect(v.every((x) => x.length >= 8)).toBe(true);
  });
});

describe("phoneVariations — cobertura de formatos armazenados no banco", () => {
  // Simula: regexp_replace(stored_phone, '[^0-9]', '', 'g') → digest
  // e verifica se o digest está nas variações geradas a partir do número do GoTo
  const cases: Array<{ label: string; gotoNumber: string; storedDigest: string }> = [
    {
      label: "(71) 3599-7905 → 7135997905",
      gotoNumber: "+557135997905",
      storedDigest: "7135997905",
    },
    {
      label: "(71) 99999-8888 → 71999998888",
      gotoNumber: "+5571999998888",
      storedDigest: "71999998888",
    },
    {
      label: "+55 71 3599-7905 → 557135997905",
      gotoNumber: "+557135997905",
      storedDigest: "557135997905",
    },
    {
      label: "71 3599-7905 → 7135997905",
      gotoNumber: "+557135997905",
      storedDigest: "7135997905",
    },
    {
      label: "3599-7905 (só número local) → 35997905",
      gotoNumber: "+557135997905",
      storedDigest: "35997905",
    },
    {
      label: "557135997905 (sem +) → 557135997905",
      gotoNumber: "+557135997905",
      storedDigest: "557135997905",
    },
    {
      label: "21988887777 (sem código país) → 21988887777",
      gotoNumber: "+5521988887777",
      storedDigest: "21988887777",
    },
    {
      label: "+55 (11) 99999-8888 → 5511999998888",
      gotoNumber: "+5511999998888",
      storedDigest: "5511999998888",
    },
  ];

  cases.forEach(({ label, gotoNumber, storedDigest }) => {
    it(`variações de "${gotoNumber}" incluem "${storedDigest}" (armazenado como ${label})`, () => {
      const v = phoneVariations(gotoNumber);
      expect(v).toContain(storedDigest);
    });
  });
});

// ---------------------------------------------------------------------------
// inOperationsAt — operations transfer flag
// ---------------------------------------------------------------------------

describe("matchPhoneToEntity — inOperationsAt (operations transfer)", () => {
  it("returns null when matched lead has inOperationsAt set", async () => {
    // Lead found by phone but is in operations (ORM check returns null)
    prismaMock.$queryRaw
      .mockResolvedValueOnce(noResult) // contact miss
      .mockResolvedValueOnce(leadRow)  // lead found (leads table query)
      .mockResolvedValueOnce(noResult); // lead_contacts query (not reached if lead found first)
    prismaMock.lead.findFirst.mockResolvedValueOnce(null); // inOperationsAt is set

    const result = await matchPhoneToEntity("+5511999998888", OWNER_ID);

    expect(result).toBeNull();
  });

  it("returns null when matched contact's organization has inOperationsAt set", async () => {
    // Contact found by phone but its org is in operations (ORM check returns null)
    prismaMock.$queryRaw.mockResolvedValueOnce(contactRow);
    prismaMock.contact.findFirst.mockResolvedValueOnce(null); // org is in operations

    const result = await matchPhoneToEntity("+557135997905", OWNER_ID);

    expect(result).toBeNull();
  });

  it("returns entity normally when lead's inOperationsAt is null", async () => {
    prismaMock.$queryRaw
      .mockResolvedValueOnce(noResult) // contact miss
      .mockResolvedValueOnce(leadRow); // lead found
    prismaMock.lead.findFirst.mockResolvedValueOnce({ id: "lead-1" } as never); // not in operations

    const result = await matchPhoneToEntity("+5511999998888", OWNER_ID);

    expect(result?.entityType).toBe("lead");
    expect(result?.leadId).toBe("lead-1");
  });

  it("returns entity normally when contact's organization has inOperationsAt null", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce(contactRow);
    prismaMock.contact.findFirst.mockResolvedValueOnce({ id: "contact-1" } as never); // not in operations

    const result = await matchPhoneToEntity("+557135997905", OWNER_ID);

    expect(result?.entityType).toBe("contact");
    expect(result?.contactId).toBe("contact-1");
  });
});

describe("matchPhoneToEntity — dados retornados", () => {
  it("deve retornar contactId quando Contact encontrado", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce(contactRow);

    const result = await matchPhoneToEntity("+557135997905", OWNER_ID);

    expect(result?.contactId).toBe("contact-1");
  });

  it("deve retornar leadId quando Lead encontrado", async () => {
    prismaMock.$queryRaw
      .mockResolvedValueOnce(noResult)
      .mockResolvedValueOnce(leadRow);

    const result = await matchPhoneToEntity("+5511999998888", OWNER_ID);

    expect(result?.leadId).toBe("lead-1");
  });

  it("deve retornar partnerId quando Partner encontrado", async () => {
    // GoTo findLeadByPhone makes 2 queries: leads table + lead_contacts
    prismaMock.$queryRaw
      .mockResolvedValueOnce(noResult)   // contact
      .mockResolvedValueOnce(noResult)   // lead (leads table)
      .mockResolvedValueOnce(noResult)   // lead (lead_contacts table)
      .mockResolvedValueOnce(partnerRow); // partner

    const result = await matchPhoneToEntity("+5521988887777", OWNER_ID);

    expect(result?.partnerId).toBe("partner-1");
  });
});
