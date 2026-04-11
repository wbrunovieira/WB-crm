/**
 * Email Activity Creator Tests
 *
 * Tests for src/lib/google/email-activity-creator.ts
 * - Idempotência: mesmo emailMessageId não cria Activity duplicada
 * - Vincula Activity ao Contact/Lead/Organization correto pelo e-mail
 * - E-mail de remetente desconhecido cria Activity sem vínculo (não gera erro)
 * - Campos obrigatórios preenchidos corretamente
 *
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    activity: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    contact: { findFirst: vi.fn() },
    leadContact: { findFirst: vi.fn() },
    lead: { findFirst: vi.fn() },
    organization: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() }) },
}));

import { processIncomingEmail } from "@/lib/google/email-activity-creator";
import { prisma } from "@/lib/prisma";

const mockActivityFindUnique = vi.mocked(prisma.activity.findUnique);
const mockActivityCreate = vi.mocked(prisma.activity.create);
const mockContactFindFirst = vi.mocked(prisma.contact.findFirst);
const mockLeadContactFindFirst = vi.mocked(prisma.leadContact.findFirst);
const mockLeadFindFirst = vi.mocked(prisma.lead.findFirst);
const mockOrgFindFirst = vi.mocked(prisma.organization.findFirst);

const OWNER_ID = "user-owner-123";

const BASE_EMAIL = {
  messageId: "gmail-msg-abc123",
  from: "cliente@empresa.com",
  fromName: "João Silva",
  subject: "Preciso de um orçamento",
  body: "Olá! Gostaria de saber o valor dos serviços.",
  receivedAt: new Date("2026-04-11T10:00:00Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockActivityFindUnique.mockResolvedValue(null);
  mockActivityCreate.mockResolvedValue({ id: "activity-new" } as never);
  mockContactFindFirst.mockResolvedValue(null);
  mockLeadContactFindFirst.mockResolvedValue(null);
  mockLeadFindFirst.mockResolvedValue(null);
  mockOrgFindFirst.mockResolvedValue(null);
});

// ---------------------------------------------------------------------------
describe("processIncomingEmail — idempotência", () => {
  it("não cria Activity quando messageId já foi processado", async () => {
    mockActivityFindUnique.mockResolvedValue({ id: "activity-existing" } as never);

    await processIncomingEmail(BASE_EMAIL, OWNER_ID);

    expect(mockActivityCreate).not.toHaveBeenCalled();
  });

  it("cria Activity quando messageId ainda não existe", async () => {
    mockActivityFindUnique.mockResolvedValue(null);

    await processIncomingEmail(BASE_EMAIL, OWNER_ID);

    expect(mockActivityCreate).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
describe("processIncomingEmail — campos da Activity", () => {
  it("cria Activity do tipo email", async () => {
    await processIncomingEmail(BASE_EMAIL, OWNER_ID);

    const call = mockActivityCreate.mock.calls[0][0];
    expect(call.data.type).toBe("email");
  });

  it("subject contém o assunto do e-mail", async () => {
    await processIncomingEmail(BASE_EMAIL, OWNER_ID);

    const call = mockActivityCreate.mock.calls[0][0];
    expect(call.data.subject).toContain("Preciso de um orçamento");
  });

  it("emailMessageId armazenado para idempotência futura", async () => {
    await processIncomingEmail(BASE_EMAIL, OWNER_ID);

    const call = mockActivityCreate.mock.calls[0][0];
    expect(call.data.emailMessageId).toBe("gmail-msg-abc123");
  });

  it("emailSubject armazenado para exibição", async () => {
    await processIncomingEmail(BASE_EMAIL, OWNER_ID);

    const call = mockActivityCreate.mock.calls[0][0];
    expect(call.data.emailSubject).toBe("Preciso de um orçamento");
  });

  it("description contém preview do corpo do e-mail", async () => {
    await processIncomingEmail(BASE_EMAIL, OWNER_ID);

    const call = mockActivityCreate.mock.calls[0][0];
    expect(call.data.description).toContain("Gostaria de saber");
  });

  it("Activity marcada como completed (e-mail já recebido)", async () => {
    await processIncomingEmail(BASE_EMAIL, OWNER_ID);

    const call = mockActivityCreate.mock.calls[0][0];
    expect(call.data.completed).toBe(true);
  });

  it("ownerId correto na Activity", async () => {
    await processIncomingEmail(BASE_EMAIL, OWNER_ID);

    const call = mockActivityCreate.mock.calls[0][0];
    expect(call.data.ownerId).toBe(OWNER_ID);
  });
});

// ---------------------------------------------------------------------------
describe("processIncomingEmail — vínculo por e-mail do remetente", () => {
  it("vincula ao Contact quando e-mail do remetente encontrado", async () => {
    mockContactFindFirst.mockResolvedValue({ id: "contact-1" } as never);

    await processIncomingEmail(BASE_EMAIL, OWNER_ID);

    const call = mockActivityCreate.mock.calls[0][0];
    expect(call.data.contactId).toBe("contact-1");
    expect(call.data.leadId).toBeUndefined();
  });

  it("vincula ao Lead quando e-mail encontrado em Lead (sem Contact)", async () => {
    mockContactFindFirst.mockResolvedValue(null);
    mockLeadFindFirst.mockResolvedValue({ id: "lead-1" } as never);

    await processIncomingEmail(BASE_EMAIL, OWNER_ID);

    const call = mockActivityCreate.mock.calls[0][0];
    expect(call.data.leadId).toBe("lead-1");
    expect(call.data.contactId).toBeUndefined();
  });

  it("vincula ao Lead quando e-mail encontrado em LeadContact (sem Contact)", async () => {
    mockContactFindFirst.mockResolvedValue(null);
    mockLeadContactFindFirst.mockResolvedValue({ leadId: "lead-via-contact" } as never);

    await processIncomingEmail(BASE_EMAIL, OWNER_ID);

    const call = mockActivityCreate.mock.calls[0][0];
    expect(call.data.leadId).toBe("lead-via-contact");
    expect(call.data.contactId).toBeUndefined();
  });

  it("prioriza Contact sobre LeadContact", async () => {
    mockContactFindFirst.mockResolvedValue({ id: "contact-1" } as never);
    mockLeadContactFindFirst.mockResolvedValue({ leadId: "lead-via-contact" } as never);

    await processIncomingEmail(BASE_EMAIL, OWNER_ID);

    const call = mockActivityCreate.mock.calls[0][0];
    expect(call.data.contactId).toBe("contact-1");
    expect(call.data.leadId).toBeUndefined();
  });

  it("prioriza LeadContact sobre e-mail geral do Lead", async () => {
    mockContactFindFirst.mockResolvedValue(null);
    mockLeadContactFindFirst.mockResolvedValue({ leadId: "lead-via-contact" } as never);
    mockLeadFindFirst.mockResolvedValue({ id: "lead-direct" } as never);

    await processIncomingEmail(BASE_EMAIL, OWNER_ID);

    const call = mockActivityCreate.mock.calls[0][0];
    expect(call.data.leadId).toBe("lead-via-contact");
  });

  it("prioriza Contact sobre Lead quando ambos têm o e-mail", async () => {
    mockContactFindFirst.mockResolvedValue({ id: "contact-1" } as never);
    mockLeadFindFirst.mockResolvedValue({ id: "lead-1" } as never);

    await processIncomingEmail(BASE_EMAIL, OWNER_ID);

    const call = mockActivityCreate.mock.calls[0][0];
    expect(call.data.contactId).toBe("contact-1");
    expect(call.data.leadId).toBeUndefined();
  });

  it("cria Activity sem vínculo quando e-mail é desconhecido", async () => {
    // todos os mocks já retornam null no beforeEach

    await processIncomingEmail(BASE_EMAIL, OWNER_ID);

    const call = mockActivityCreate.mock.calls[0][0];
    expect(call.data.contactId).toBeUndefined();
    expect(call.data.leadId).toBeUndefined();
    expect(call.data.organizationId).toBeUndefined();
  });

  it("não lança erro quando e-mail do remetente é desconhecido", async () => {
    await expect(processIncomingEmail(BASE_EMAIL, OWNER_ID)).resolves.not.toThrow();
  });
});
