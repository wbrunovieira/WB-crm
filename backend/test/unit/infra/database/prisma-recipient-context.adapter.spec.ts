import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrismaRecipientContextAdapter } from "@/infra/database/prisma/adapters/prisma-recipient-context.adapter";

function makePrisma(overrides: Record<string, any> = {}) {
  return {
    lead: { findUnique: vi.fn().mockResolvedValue(null) },
    leadContact: { findUnique: vi.fn().mockResolvedValue(null) },
    contact: { findUnique: vi.fn().mockResolvedValue(null) },
    organization: { findUnique: vi.fn().mockResolvedValue(null) },
    partner: { findUnique: vi.fn().mockResolvedValue(null) },
    ...overrides,
  } as any;
}

describe("PrismaRecipientContextAdapter", () => {
  describe("LEAD type", () => {
    it("retorna leadId quando recipientId é um Lead existente", async () => {
      const prisma = makePrisma({ lead: { findUnique: vi.fn().mockResolvedValue({ id: "lead-1" }) } });
      const adapter = new PrismaRecipientContextAdapter(prisma);

      const ctx = await adapter.resolve("LEAD", "lead-1");

      expect(ctx).toEqual({ leadId: "lead-1" });
    });

    it("retorna leadId via LeadContact quando recipientId não é Lead direto", async () => {
      const prisma = makePrisma({
        lead: { findUnique: vi.fn().mockResolvedValue(null) },
        leadContact: { findUnique: vi.fn().mockResolvedValue({ leadId: "lead-2" }) },
      });
      const adapter = new PrismaRecipientContextAdapter(prisma);

      const ctx = await adapter.resolve("LEAD", "lc-1");

      expect(ctx).toEqual({ leadId: "lead-2" });
    });

    it("retorna {} quando recipientId não é encontrado", async () => {
      const adapter = new PrismaRecipientContextAdapter(makePrisma());

      const ctx = await adapter.resolve("LEAD", "unknown");

      expect(ctx).toEqual({});
    });
  });

  describe("CONTACT type", () => {
    it("retorna contactId + leadId quando recipientId é um Contact com lead", async () => {
      const prisma = makePrisma({
        contact: {
          findUnique: vi.fn().mockResolvedValue({
            id: "contact-1",
            leadId: "lead-3",
            organizationId: null,
            partnerId: null,
          }),
        },
      });
      const adapter = new PrismaRecipientContextAdapter(prisma);

      const ctx = await adapter.resolve("CONTACT", "contact-1");

      expect(ctx).toEqual({ contactId: "contact-1", leadId: "lead-3" });
    });

    it("retorna leadId via LeadContact quando recipientId é um lead_contact (email composto ou enroll manual)", async () => {
      const prisma = makePrisma({
        contact: { findUnique: vi.fn().mockResolvedValue(null) },
        leadContact: { findUnique: vi.fn().mockResolvedValue({ leadId: "lead-4" }) },
      });
      const adapter = new PrismaRecipientContextAdapter(prisma);

      const ctx = await adapter.resolve("CONTACT", "lc-2");

      expect(ctx).toEqual({ leadId: "lead-4" });
      expect(prisma.leadContact.findUnique).toHaveBeenCalledWith({ where: { id: "lc-2" }, select: { leadId: true } });
    });

    it("retorna organizationId quando recipientId é uma Organization", async () => {
      const prisma = makePrisma({
        contact: { findUnique: vi.fn().mockResolvedValue(null) },
        leadContact: { findUnique: vi.fn().mockResolvedValue(null) },
        organization: { findUnique: vi.fn().mockResolvedValue({ id: "org-1" }) },
      });
      const adapter = new PrismaRecipientContextAdapter(prisma);

      const ctx = await adapter.resolve("CONTACT", "org-1");

      expect(ctx).toEqual({ organizationId: "org-1" });
    });

    it("retorna partnerId quando recipientId é um Partner", async () => {
      const prisma = makePrisma({
        contact: { findUnique: vi.fn().mockResolvedValue(null) },
        leadContact: { findUnique: vi.fn().mockResolvedValue(null) },
        organization: { findUnique: vi.fn().mockResolvedValue(null) },
        partner: { findUnique: vi.fn().mockResolvedValue({ id: "partner-1" }) },
      });
      const adapter = new PrismaRecipientContextAdapter(prisma);

      const ctx = await adapter.resolve("CONTACT", "partner-1");

      expect(ctx).toEqual({ partnerId: "partner-1" });
    });

    it("retorna {} quando recipientId não é encontrado em nenhuma tabela", async () => {
      const adapter = new PrismaRecipientContextAdapter(makePrisma());

      const ctx = await adapter.resolve("CONTACT", "unknown");

      expect(ctx).toEqual({});
    });

    it("não consulta leadContact antes de tentar Contact direto", async () => {
      const prisma = makePrisma({
        contact: {
          findUnique: vi.fn().mockResolvedValue({
            id: "contact-5",
            leadId: null,
            organizationId: "org-5",
            partnerId: null,
          }),
        },
      });
      const adapter = new PrismaRecipientContextAdapter(prisma);

      await adapter.resolve("CONTACT", "contact-5");

      expect(prisma.leadContact.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("tipo desconhecido", () => {
    it("retorna {} para recipientType não reconhecido", async () => {
      const adapter = new PrismaRecipientContextAdapter(makePrisma());

      const ctx = await adapter.resolve("UNKNOWN", "any-id");

      expect(ctx).toEqual({});
    });
  });
});
