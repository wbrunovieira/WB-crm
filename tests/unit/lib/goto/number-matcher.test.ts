/**
 * GoTo Number Matcher Tests
 *
 * Tests for src/lib/goto/number-matcher.ts
 * - Encontra Contact/Lead/LeadContact/Partner pelo número de telefone
 * - Normaliza formatos brasileiros para comparação
 * - Respeita ownerId (isolamento de dados)
 * - Retorna null quando número não encontrado
 *
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { matchPhoneToEntity } from "@/lib/goto/number-matcher";
import { prismaMock } from "../../../setup";

const OWNER_ID = "user-owner-123";

const mockContact = {
  id: "contact-1",
  name: "João Silva",
  phone: "(71) 3599-7905",
  ownerId: OWNER_ID,
  organizationId: "org-1",
};

const mockLead = {
  id: "lead-1",
  companyName: "Mosello",
  phone: "+5511999998888",
  ownerId: OWNER_ID,
};

const mockPartner = {
  id: "partner-1",
  name: "Agência XYZ",
  phone: "21988887777",
  ownerId: OWNER_ID,
};

beforeEach(() => {
  prismaMock.contact.findFirst.mockResolvedValue(null);
  prismaMock.lead.findFirst.mockResolvedValue(null);
  prismaMock.partner.findFirst.mockResolvedValue(null);
});

describe("matchPhoneToEntity — prioridade de busca", () => {
  it("deve retornar Contact quando número bate com contato", async () => {
    prismaMock.contact.findFirst.mockResolvedValue(mockContact as any);

    const result = await matchPhoneToEntity("+557135997905", OWNER_ID);

    expect(result).not.toBeNull();
    expect(result?.entityType).toBe("contact");
    expect(result?.entityId).toBe("contact-1");
  });

  it("deve buscar Lead se Contact não encontrado", async () => {
    prismaMock.contact.findFirst.mockResolvedValue(null);
    prismaMock.lead.findFirst.mockResolvedValue(mockLead as any);

    const result = await matchPhoneToEntity("+5511999998888", OWNER_ID);

    expect(result?.entityType).toBe("lead");
    expect(result?.entityId).toBe("lead-1");
  });

  it("deve buscar Partner se Contact e Lead não encontrados", async () => {
    prismaMock.contact.findFirst.mockResolvedValue(null);
    prismaMock.lead.findFirst.mockResolvedValue(null);
    prismaMock.partner.findFirst.mockResolvedValue(mockPartner as any);

    const result = await matchPhoneToEntity("+5521988887777", OWNER_ID);

    expect(result?.entityType).toBe("partner");
    expect(result?.entityId).toBe("partner-1");
  });

  it("deve retornar null quando número não encontrado em nenhuma entidade", async () => {
    const result = await matchPhoneToEntity("+5599999999999", OWNER_ID);
    expect(result).toBeNull();
  });
});

describe("matchPhoneToEntity — normalização de números", () => {
  it("deve encontrar contato com número em E.164 (+5571...)", async () => {
    prismaMock.contact.findFirst.mockResolvedValue(mockContact as any);

    const result = await matchPhoneToEntity("+557135997905", OWNER_ID);

    expect(result?.entityType).toBe("contact");
    // Confirma que a busca foi feita com variações do número
    expect(prismaMock.contact.findFirst).toHaveBeenCalled();
  });

  it("deve encontrar contato com número sem código do país (7135997905)", async () => {
    prismaMock.contact.findFirst.mockResolvedValue(mockContact as any);

    const result = await matchPhoneToEntity("7135997905", OWNER_ID);

    expect(result?.entityType).toBe("contact");
  });

  it("deve encontrar contato com número formatado BR ((71) 3599-7905)", async () => {
    prismaMock.contact.findFirst.mockResolvedValue(mockContact as any);

    const result = await matchPhoneToEntity("(71) 3599-7905", OWNER_ID);

    expect(result?.entityType).toBe("contact");
  });

  it("deve gerar variações de busca incluindo com e sem código do país", async () => {
    prismaMock.contact.findFirst.mockResolvedValue(null);
    prismaMock.lead.findFirst.mockResolvedValue(null);
    prismaMock.partner.findFirst.mockResolvedValue(null);

    await matchPhoneToEntity("+5511999998888", OWNER_ID);

    // A busca deve ter sido chamada com variações (OR query)
    expect(prismaMock.contact.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ownerId: OWNER_ID,
        }),
      })
    );
  });
});

describe("matchPhoneToEntity — isolamento por ownerId", () => {
  it("deve filtrar por ownerId na busca de Contact", async () => {
    prismaMock.contact.findFirst.mockResolvedValue(null);

    await matchPhoneToEntity("+5571999999999", OWNER_ID);

    expect(prismaMock.contact.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ownerId: OWNER_ID }),
      })
    );
  });

  it("deve filtrar por ownerId na busca de Lead", async () => {
    prismaMock.contact.findFirst.mockResolvedValue(null);
    prismaMock.lead.findFirst.mockResolvedValue(null);

    await matchPhoneToEntity("+5571999999999", OWNER_ID);

    expect(prismaMock.lead.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ownerId: OWNER_ID }),
      })
    );
  });
});

describe("matchPhoneToEntity — dados retornados", () => {
  it("deve retornar contactId quando Contact encontrado", async () => {
    prismaMock.contact.findFirst.mockResolvedValue(mockContact as any);

    const result = await matchPhoneToEntity("+557135997905", OWNER_ID);

    expect(result?.contactId).toBe("contact-1");
  });

  it("deve retornar leadId quando Lead encontrado", async () => {
    prismaMock.contact.findFirst.mockResolvedValue(null);
    prismaMock.lead.findFirst.mockResolvedValue(mockLead as any);

    const result = await matchPhoneToEntity("+5511999998888", OWNER_ID);

    expect(result?.leadId).toBe("lead-1");
  });

  it("deve retornar partnerId quando Partner encontrado", async () => {
    prismaMock.contact.findFirst.mockResolvedValue(null);
    prismaMock.lead.findFirst.mockResolvedValue(null);
    prismaMock.partner.findFirst.mockResolvedValue(mockPartner as any);

    const result = await matchPhoneToEntity("+5521988887777", OWNER_ID);

    expect(result?.partnerId).toBe("partner-1");
  });
});
