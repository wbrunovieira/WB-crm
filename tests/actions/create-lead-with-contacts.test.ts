import { describe, it, expect, vi, beforeEach } from "vitest";

// Setup mocks before imports
vi.mock("@/lib/prisma", () => {
  const mockTransaction = vi.fn();
  const mockLeadCreate = vi.fn();
  const mockLeadContactCreate = vi.fn();
  const mockLeadContactUpdateMany = vi.fn();

  return {
    prisma: {
      $transaction: mockTransaction,
      lead: {
        create: mockLeadCreate,
      },
      leadContact: {
        create: mockLeadContactCreate,
        updateMany: mockLeadContactUpdateMany,
      },
    },
  };
});

const mockGetAuthenticatedSession = vi.fn();

vi.mock("@/lib/permissions", () => ({
  getAuthenticatedSession: () => mockGetAuthenticatedSession(),
  getOwnerOrSharedFilter: vi.fn().mockResolvedValue({}),
  canAccessEntity: vi.fn().mockResolvedValue(true),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Import after mocks
import { createLeadWithContacts } from "@/actions/leads";
import { prisma } from "@/lib/prisma";

describe("createLeadWithContacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup session mock
    mockGetAuthenticatedSession.mockResolvedValue({
      user: { id: "user-123", email: "test@test.com", name: "Test User" },
    });

    // Setup transaction mock to execute the callback with prisma as tx
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      return callback(prisma);
    });
  });

  describe("Lead creation", () => {
    it("should create a lead without contacts", async () => {
      const leadData = {
        businessName: "Empresa Teste",
        city: "São Paulo",
        state: "SP",
      };

      const mockLead = {
        id: "lead-123",
        ...leadData,
        ownerId: "user-123",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.lead.create).mockResolvedValue(mockLead as never);

      const result = await createLeadWithContacts(leadData, []);

      expect(prisma.lead.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          businessName: "Empresa Teste",
          city: "São Paulo",
          state: "SP",
          ownerId: "user-123",
        }),
      });
      expect(result.lead).toEqual(mockLead);
      expect(result.contacts).toEqual([]);
    });

    it("should validate lead data with Zod schema", async () => {
      const invalidLeadData = {
        businessName: "A", // Too short, min 2 chars
      };

      await expect(createLeadWithContacts(invalidLeadData, [])).rejects.toThrow();
    });

    it("should include optional fields when provided", async () => {
      const leadData = {
        businessName: "Empresa Completa",
        registeredName: "Empresa Completa LTDA",
        email: "contato@empresa.com",
        phone: "11999999999",
        website: "www.empresa.com",
        city: "São Paulo",
        state: "SP",
        country: "BR",
        quality: "hot" as const,
        status: "new" as const,
      };

      const mockLead = {
        id: "lead-456",
        ...leadData,
        ownerId: "user-123",
      };

      vi.mocked(prisma.lead.create).mockResolvedValue(mockLead as never);

      const result = await createLeadWithContacts(leadData, []);

      expect(prisma.lead.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          businessName: "Empresa Completa",
          registeredName: "Empresa Completa LTDA",
          email: "contato@empresa.com",
          quality: "hot",
          status: "new",
          ownerId: "user-123",
        }),
      });
      expect(result.lead.id).toBe("lead-456");
    });
  });

  describe("Contact creation", () => {
    it("should create a lead with one contact", async () => {
      const leadData = {
        businessName: "Empresa com Contato",
      };

      const contacts = [
        {
          name: "João Silva",
          email: "joao@empresa.com",
          phone: "11999999999",
          role: "CEO",
          isPrimary: true,
        },
      ];

      const mockLead = {
        id: "lead-789",
        businessName: "Empresa com Contato",
        ownerId: "user-123",
      };

      const mockContact = {
        id: "contact-1",
        ...contacts[0],
        leadId: "lead-789",
      };

      vi.mocked(prisma.lead.create).mockResolvedValue(mockLead as never);
      vi.mocked(prisma.leadContact.create).mockResolvedValue(mockContact as never);

      const result = await createLeadWithContacts(leadData, contacts);

      expect(prisma.lead.create).toHaveBeenCalled();
      expect(prisma.leadContact.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "João Silva",
          email: "joao@empresa.com",
          phone: "11999999999",
          role: "CEO",
          isPrimary: true,
          leadId: "lead-789",
        }),
      });
      expect(result.lead.id).toBe("lead-789");
      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].name).toBe("João Silva");
    });

    it("should create a lead with multiple contacts", async () => {
      const leadData = {
        businessName: "Empresa com Múltiplos Contatos",
      };

      const contacts = [
        {
          name: "Maria Santos",
          email: "maria@empresa.com",
          role: "Diretora",
          isPrimary: true,
        },
        {
          name: "Pedro Oliveira",
          email: "pedro@empresa.com",
          role: "Gerente",
          isPrimary: false,
        },
        {
          name: "Ana Costa",
          phone: "11988888888",
          role: "Assistente",
        },
      ];

      const mockLead = {
        id: "lead-multi",
        businessName: "Empresa com Múltiplos Contatos",
        ownerId: "user-123",
      };

      vi.mocked(prisma.lead.create).mockResolvedValue(mockLead as never);
      vi.mocked(prisma.leadContact.create)
        .mockResolvedValueOnce({ id: "contact-1", ...contacts[0], leadId: "lead-multi" } as never)
        .mockResolvedValueOnce({ id: "contact-2", ...contacts[1], leadId: "lead-multi" } as never)
        .mockResolvedValueOnce({ id: "contact-3", ...contacts[2], leadId: "lead-multi", isPrimary: false } as never);

      const result = await createLeadWithContacts(leadData, contacts);

      expect(prisma.leadContact.create).toHaveBeenCalledTimes(3);
      expect(result.contacts).toHaveLength(3);
    });

    it("should validate contact data with Zod schema", async () => {
      const leadData = {
        businessName: "Empresa Válida",
      };

      const invalidContacts = [
        {
          name: "A", // Too short, min 2 chars
          email: "joao@empresa.com",
        },
      ];

      await expect(createLeadWithContacts(leadData, invalidContacts)).rejects.toThrow();
    });

    it("should validate contact email format", async () => {
      const leadData = {
        businessName: "Empresa Válida",
      };

      const invalidContacts = [
        {
          name: "João Silva",
          email: "email-invalido", // Invalid email
        },
      ];

      await expect(createLeadWithContacts(leadData, invalidContacts)).rejects.toThrow();
    });
  });

  describe("Primary contact handling", () => {
    it("should set first contact as primary if none specified", async () => {
      const leadData = {
        businessName: "Empresa Teste",
      };

      const contacts = [
        {
          name: "Contato Sem Primary",
          email: "contato@empresa.com",
          // isPrimary not specified
        },
      ];

      const mockLead = { id: "lead-primary", ownerId: "user-123" };
      vi.mocked(prisma.lead.create).mockResolvedValue(mockLead as never);
      vi.mocked(prisma.leadContact.create).mockResolvedValue({
        id: "contact-1",
        ...contacts[0],
        isPrimary: true,
        leadId: "lead-primary",
      } as never);

      const result = await createLeadWithContacts(leadData, contacts);

      expect(prisma.leadContact.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Contato Sem Primary",
          isPrimary: true,
        }),
      });
      expect(result.contacts[0].isPrimary).toBe(true);
    });

    it("should ensure only one primary contact when multiple have isPrimary true", async () => {
      const leadData = {
        businessName: "Empresa Teste",
      };

      const contacts = [
        {
          name: "Contato 1",
          isPrimary: true,
        },
        {
          name: "Contato 2",
          isPrimary: true, // Both set as primary
        },
      ];

      const mockLead = { id: "lead-dup-primary", ownerId: "user-123" };
      vi.mocked(prisma.lead.create).mockResolvedValue(mockLead as never);
      vi.mocked(prisma.leadContact.create)
        .mockResolvedValueOnce({ id: "c1", name: "Contato 1", isPrimary: true, leadId: "lead-dup-primary" } as never)
        .mockResolvedValueOnce({ id: "c2", name: "Contato 2", isPrimary: false, leadId: "lead-dup-primary" } as never);

      const result = await createLeadWithContacts(leadData, contacts);

      // First contact should be primary, second should not
      expect(result.contacts[0].isPrimary).toBe(true);
      expect(result.contacts[1].isPrimary).toBe(false);
    });
  });

  describe("Transaction behavior", () => {
    it("should use a database transaction", async () => {
      const leadData = { businessName: "Empresa Transação" };
      const contacts = [{ name: "Contato Teste" }];

      vi.mocked(prisma.lead.create).mockResolvedValue({ id: "lead-tx", ownerId: "user-123" } as never);
      vi.mocked(prisma.leadContact.create).mockResolvedValue({ id: "contact-tx", name: "Contato Teste", leadId: "lead-tx", isPrimary: true } as never);

      await createLeadWithContacts(leadData, contacts);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("should rollback if lead creation fails", async () => {
      const leadData = { businessName: "Empresa Falha" };
      const contacts = [{ name: "Contato Teste" }];

      vi.mocked(prisma.lead.create).mockRejectedValue(new Error("Database error"));

      await expect(createLeadWithContacts(leadData, contacts)).rejects.toThrow("Database error");
      expect(prisma.leadContact.create).not.toHaveBeenCalled();
    });

    it("should rollback if contact creation fails", async () => {
      const leadData = { businessName: "Empresa OK" };
      const contacts = [
        { name: "Contato OK" },
        { name: "Contato Falha" },
      ];

      vi.mocked(prisma.lead.create).mockResolvedValue({ id: "lead-ok", ownerId: "user-123" } as never);
      vi.mocked(prisma.leadContact.create)
        .mockResolvedValueOnce({ id: "c1", name: "Contato OK", leadId: "lead-ok", isPrimary: true } as never)
        .mockRejectedValueOnce(new Error("Contact creation failed"));

      await expect(createLeadWithContacts(leadData, contacts)).rejects.toThrow("Contact creation failed");
    });
  });

  describe("Return value", () => {
    it("should return lead and contacts in the result", async () => {
      const leadData = { businessName: "Empresa Retorno" };
      const contacts = [
        { name: "Contato 1", email: "c1@test.com" },
        { name: "Contato 2", email: "c2@test.com" },
      ];

      const mockLead = {
        id: "lead-ret",
        businessName: "Empresa Retorno",
        ownerId: "user-123",
        createdAt: new Date(),
      };

      vi.mocked(prisma.lead.create).mockResolvedValue(mockLead as never);
      vi.mocked(prisma.leadContact.create)
        .mockResolvedValueOnce({ id: "c1", name: "Contato 1", email: "c1@test.com", leadId: "lead-ret", isPrimary: true } as never)
        .mockResolvedValueOnce({ id: "c2", name: "Contato 2", email: "c2@test.com", leadId: "lead-ret", isPrimary: false } as never);

      const result = await createLeadWithContacts(leadData, contacts);

      expect(result).toHaveProperty("lead");
      expect(result).toHaveProperty("contacts");
      expect(result.lead.id).toBe("lead-ret");
      expect(result.contacts).toHaveLength(2);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty contact array", async () => {
      const leadData = { businessName: "Empresa Sem Contatos" };

      vi.mocked(prisma.lead.create).mockResolvedValue({ id: "lead-empty", ownerId: "user-123" } as never);

      const result = await createLeadWithContacts(leadData, []);

      expect(result.lead.id).toBe("lead-empty");
      expect(result.contacts).toEqual([]);
      expect(prisma.leadContact.create).not.toHaveBeenCalled();
    });

    it("should handle contact with only required fields", async () => {
      const leadData = { businessName: "Empresa Minimal" };
      const contacts = [{ name: "Apenas Nome" }]; // Only name, no email/phone

      vi.mocked(prisma.lead.create).mockResolvedValue({ id: "lead-min", ownerId: "user-123" } as never);
      vi.mocked(prisma.leadContact.create).mockResolvedValue({
        id: "c-min",
        name: "Apenas Nome",
        leadId: "lead-min",
        isPrimary: true,
      } as never);

      const result = await createLeadWithContacts(leadData, contacts);

      expect(result.contacts[0].name).toBe("Apenas Nome");
    });

    it("should handle contact with empty string email", async () => {
      const leadData = { businessName: "Empresa Email Vazio" };
      const contacts = [{ name: "Contato", email: "" }]; // Empty email should be allowed

      vi.mocked(prisma.lead.create).mockResolvedValue({ id: "lead-ee", ownerId: "user-123" } as never);
      vi.mocked(prisma.leadContact.create).mockResolvedValue({
        id: "c-ee",
        name: "Contato",
        email: "",
        leadId: "lead-ee",
        isPrimary: true,
      } as never);

      const result = await createLeadWithContacts(leadData, contacts);

      expect(result.contacts[0].email).toBe("");
    });
  });
});
