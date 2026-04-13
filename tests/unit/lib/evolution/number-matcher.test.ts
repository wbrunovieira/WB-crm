/**
 * Evolution Number Matcher Tests
 *
 * Tests for src/lib/evolution/number-matcher.ts
 * - Extrai número de remoteJid do WhatsApp
 * - Identifica grupos (@g.us)
 * - Busca Contact/Lead/Partner por phone E whatsapp
 * - Normaliza formatos via regexp_replace no PostgreSQL
 * - Respeita ownerId (isolamento de dados)
 *
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  matchPhoneToEntity,
  phoneVariations,
  extractPhoneFromJid,
  isGroupJid,
} from "@/lib/evolution/number-matcher";
import { prismaMock } from "../../../setup";

const OWNER_ID = "user-owner-123";

const noResult: never[] = [];
const contactRow = [{ id: "contact-1" }];
const leadRow = [{ id: "lead-1" }];
const partnerRow = [{ id: "partner-1" }];

beforeEach(() => {
  prismaMock.$queryRaw.mockResolvedValue(noResult);
  // Default: entities are NOT in operations — secondary ORM checks pass
  prismaMock.lead.findFirst.mockResolvedValue({ id: "lead-mock" } as never);
  prismaMock.contact.findFirst.mockResolvedValue({ id: "contact-mock" } as never);
});

// ---------------------------------------------------------------------------
// extractPhoneFromJid
// ---------------------------------------------------------------------------

describe("extractPhoneFromJid", () => {
  it("extrai número de JID individual", () => {
    expect(extractPhoneFromJid("5511999998888@s.whatsapp.net")).toBe("5511999998888");
  });

  it("extrai número de JID de grupo (sem @g.us)", () => {
    expect(extractPhoneFromJid("5512991088254-1569719810@g.us")).toBe("5512991088254-1569719810");
  });

  it("retorna string vazia se remoteJid vazio", () => {
    expect(extractPhoneFromJid("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// isGroupJid
// ---------------------------------------------------------------------------

describe("isGroupJid", () => {
  it("retorna true para JID de grupo (@g.us)", () => {
    expect(isGroupJid("5512991088254-1569719810@g.us")).toBe(true);
  });

  it("retorna false para JID individual (@s.whatsapp.net)", () => {
    expect(isGroupJid("5511999998888@s.whatsapp.net")).toBe(false);
  });

  it("retorna false para string vazia", () => {
    expect(isGroupJid("")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// phoneVariations
// ---------------------------------------------------------------------------

describe("phoneVariations — formatos de número WhatsApp", () => {
  it("número E.164 com código do Brasil: +5511999998888", () => {
    const v = phoneVariations("+5511999998888");
    expect(v).toContain("5511999998888");
    expect(v).toContain("11999998888");
    expect(v).toContain("999998888");
  });

  it("número sem + prefix: 5511999998888", () => {
    const v = phoneVariations("5511999998888");
    expect(v).toContain("5511999998888");
    expect(v).toContain("11999998888");
  });

  it("número sem código do país: 11999998888", () => {
    const v = phoneVariations("11999998888");
    expect(v).toContain("11999998888");
    expect(v).toContain("5511999998888"); // adiciona 55
    expect(v).toContain("999998888");
  });

  it("número fixo com DDD: 7135997905", () => {
    const v = phoneVariations("7135997905");
    expect(v).toContain("7135997905");
    expect(v).toContain("557135997905");
    expect(v).toContain("35997905");
  });

  it("não deve incluir variações com menos de 8 dígitos", () => {
    const v = phoneVariations("5511999998888");
    expect(v.every((x) => x.length >= 8)).toBe(true);
  });
});

describe("phoneVariations — cobertura de formatos armazenados no banco", () => {
  const cases: Array<{ label: string; incoming: string; storedDigest: string }> = [
    {
      label: "(11) 99999-8888 → 11999998888",
      incoming: "5511999998888",
      storedDigest: "11999998888",
    },
    {
      label: "+55 (11) 99999-8888 → 5511999998888",
      incoming: "5511999998888",
      storedDigest: "5511999998888",
    },
    {
      label: "99999-8888 (local) → 999998888",
      incoming: "5511999998888",
      storedDigest: "999998888",
    },
    {
      label: "(71) 3599-7905 → 7135997905",
      incoming: "557135997905",
      storedDigest: "7135997905",
    },
    {
      label: "3599-7905 (local) → 35997905",
      incoming: "557135997905",
      storedDigest: "35997905",
    },
    {
      label: "21988887777 (sem código país) → 21988887777",
      incoming: "5521988887777",
      storedDigest: "21988887777",
    },
  ];

  cases.forEach(({ label, incoming, storedDigest }) => {
    it(`"${incoming}" inclui "${storedDigest}" (armazenado como ${label})`, () => {
      const v = phoneVariations(incoming);
      expect(v).toContain(storedDigest);
    });
  });
});

// ---------------------------------------------------------------------------
// matchPhoneToEntity — prioridade de busca
// ---------------------------------------------------------------------------

describe("matchPhoneToEntity — prioridade de busca", () => {
  it("retorna Contact quando número bate (Contact tem prioridade)", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce(contactRow);

    const result = await matchPhoneToEntity("5511999998888", OWNER_ID);

    expect(result?.entityType).toBe("contact");
    expect(result?.entityId).toBe("contact-1");
    expect(result?.contactId).toBe("contact-1");
  });

  it("busca Lead se Contact não encontrado", async () => {
    prismaMock.$queryRaw
      .mockResolvedValueOnce(noResult)
      .mockResolvedValueOnce(leadRow);

    const result = await matchPhoneToEntity("5511999998888", OWNER_ID);

    expect(result?.entityType).toBe("lead");
    expect(result?.leadId).toBe("lead-1");
  });

  it("busca Partner se Contact e Lead não encontrados", async () => {
    prismaMock.$queryRaw
      .mockResolvedValueOnce(noResult)
      .mockResolvedValueOnce(noResult)
      .mockResolvedValueOnce(partnerRow);

    const result = await matchPhoneToEntity("5511999998888", OWNER_ID);

    expect(result?.entityType).toBe("partner");
    expect(result?.partnerId).toBe("partner-1");
  });

  it("retorna null quando não encontrado em nenhuma entidade", async () => {
    prismaMock.$queryRaw.mockResolvedValue(noResult);

    const result = await matchPhoneToEntity("5500000000000", OWNER_ID);

    expect(result).toBeNull();
  });
});

describe("matchPhoneToEntity — busca em campo whatsapp do Lead", () => {
  it("deve buscar no campo whatsapp do Lead (diferença do GoTo matcher)", async () => {
    prismaMock.$queryRaw
      .mockResolvedValueOnce(noResult) // contact miss
      .mockResolvedValueOnce(leadRow); // lead found via whatsapp field

    const result = await matchPhoneToEntity("5511999998888", OWNER_ID);

    expect(result?.entityType).toBe("lead");
    // A segunda query ($queryRaw) deve incluir campo whatsapp do lead
    const secondCall = prismaMock.$queryRaw.mock.calls[1];
    expect(JSON.stringify(secondCall)).toContain("whatsapp");
  });
});

describe("matchPhoneToEntity — isolamento por ownerId", () => {
  it("embute ownerId na query SQL de Contact", async () => {
    prismaMock.$queryRaw.mockResolvedValue(noResult);

    await matchPhoneToEntity("5511999998888", OWNER_ID);

    const firstCall = prismaMock.$queryRaw.mock.calls[0];
    expect(JSON.stringify(firstCall)).toContain("ownerId");
  });

  it("executa ao menos 2 queries quando Contact não encontrado (Contact + Lead)", async () => {
    prismaMock.$queryRaw.mockResolvedValue(noResult);

    await matchPhoneToEntity("5511999998888", OWNER_ID);

    expect(prismaMock.$queryRaw.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

describe("matchPhoneToEntity — aceita número no formato remoteJid extraído", () => {
  it("aceita número puro (já extraído do remoteJid)", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce(contactRow);

    // Número como vem do extractPhoneFromJid("5511999998888@s.whatsapp.net")
    const result = await matchPhoneToEntity("5511999998888", OWNER_ID);

    expect(result).not.toBeNull();
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
      .mockResolvedValueOnce(leadRow); // lead found
    prismaMock.lead.findFirst.mockResolvedValueOnce(null); // inOperationsAt is set

    const result = await matchPhoneToEntity("5511999998888", OWNER_ID);

    expect(result).toBeNull();
  });

  it("returns null when matched contact's organization has inOperationsAt set", async () => {
    // Contact found by phone but its org is in operations (ORM check returns null)
    prismaMock.$queryRaw.mockResolvedValueOnce(contactRow);
    prismaMock.contact.findFirst.mockResolvedValueOnce(null); // org is in operations

    const result = await matchPhoneToEntity("5511999998888", OWNER_ID);

    expect(result).toBeNull();
  });

  it("returns entity normally when lead's inOperationsAt is null", async () => {
    prismaMock.$queryRaw
      .mockResolvedValueOnce(noResult)
      .mockResolvedValueOnce(leadRow);
    prismaMock.lead.findFirst.mockResolvedValueOnce({ id: "lead-1" } as never); // not in operations

    const result = await matchPhoneToEntity("5511999998888", OWNER_ID);

    expect(result?.entityType).toBe("lead");
    expect(result?.leadId).toBe("lead-1");
  });

  it("returns entity normally when contact's organization has inOperationsAt null", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce(contactRow);
    prismaMock.contact.findFirst.mockResolvedValueOnce({ id: "contact-1" } as never); // not in operations

    const result = await matchPhoneToEntity("5511999998888", OWNER_ID);

    expect(result?.entityType).toBe("contact");
    expect(result?.contactId).toBe("contact-1");
  });
});
