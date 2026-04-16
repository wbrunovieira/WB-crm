/**
 * WhatsApp Verification Persistence Tests
 *
 * Tests for saveWhatsAppVerification() in src/actions/whatsapp.ts
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../../setup";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { saveWhatsAppVerification } from "@/actions/whatsapp";
import { getServerSession } from "next-auth";

const mockGetSession = vi.mocked(getServerSession);
const SESSION = { user: { id: "user-123", name: "Bruno", email: "b@wb.com", role: "sdr" } };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue(SESSION as never);
});

// ---------------------------------------------------------------------------
describe("saveWhatsAppVerification — autenticação", () => {
  it("retorna erro se não autenticado", async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await saveWhatsAppVerification("lead", "lead-1", "+5511999998888");

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/não autorizado/i);
  });
});

// ---------------------------------------------------------------------------
describe("saveWhatsAppVerification — Lead", () => {
  beforeEach(() => {
    prismaMock.lead.findFirst.mockResolvedValue({ id: "lead-1" } as never);
    prismaMock.lead.update.mockResolvedValue({} as never);
  });

  it("verifica ownership antes de salvar", async () => {
    await saveWhatsAppVerification("lead", "lead-1", "+5511999998888");

    expect(prismaMock.lead.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "lead-1",
          ownerId: "user-123",
        }),
      })
    );
  });

  it("retorna erro se Lead não pertence ao owner", async () => {
    prismaMock.lead.findFirst.mockResolvedValue(null as never);

    const result = await saveWhatsAppVerification("lead", "lead-1", "+5511999998888");

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/não encontrado/i);
    expect(prismaMock.lead.update).not.toHaveBeenCalled();
  });

  it("salva whatsappVerified=true no Lead", async () => {
    await saveWhatsAppVerification("lead", "lead-1", "+5511999998888");

    const call = prismaMock.lead.update.mock.calls[0][0];
    expect(call.data.whatsappVerified).toBe(true);
  });

  it("salva whatsappVerifiedAt com timestamp atual no Lead", async () => {
    const before = new Date();
    await saveWhatsAppVerification("lead", "lead-1", "+5511999998888");
    const after = new Date();

    const call = prismaMock.lead.update.mock.calls[0][0];
    expect(call.data.whatsappVerifiedAt).toBeInstanceOf(Date);
    expect((call.data.whatsappVerifiedAt as Date).getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect((call.data.whatsappVerifiedAt as Date).getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it("salva whatsappVerifiedNumber com o número verificado no Lead", async () => {
    await saveWhatsAppVerification("lead", "lead-1", "+5511999998888");

    const call = prismaMock.lead.update.mock.calls[0][0];
    expect(call.data.whatsappVerifiedNumber).toBe("+5511999998888");
  });

  it("retorna success=true após salvar no Lead", async () => {
    const result = await saveWhatsAppVerification("lead", "lead-1", "+5511999998888");

    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe("saveWhatsAppVerification — Contact", () => {
  beforeEach(() => {
    prismaMock.contact.findFirst.mockResolvedValue({ id: "contact-1" } as never);
    prismaMock.contact.update.mockResolvedValue({} as never);
  });

  it("verifica ownership antes de salvar no Contact", async () => {
    await saveWhatsAppVerification("contact", "contact-1", "+351910155711");

    expect(prismaMock.contact.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "contact-1",
          ownerId: "user-123",
        }),
      })
    );
  });

  it("retorna erro se Contact não pertence ao owner", async () => {
    prismaMock.contact.findFirst.mockResolvedValue(null as never);

    const result = await saveWhatsAppVerification("contact", "contact-1", "+351910155711");

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/não encontrado/i);
    expect(prismaMock.contact.update).not.toHaveBeenCalled();
  });

  it("salva whatsappVerified=true no Contact", async () => {
    await saveWhatsAppVerification("contact", "contact-1", "+351910155711");

    const call = prismaMock.contact.update.mock.calls[0][0];
    expect(call.data.whatsappVerified).toBe(true);
  });

  it("salva whatsappVerifiedAt no Contact", async () => {
    await saveWhatsAppVerification("contact", "contact-1", "+351910155711");

    const call = prismaMock.contact.update.mock.calls[0][0];
    expect(call.data.whatsappVerifiedAt).toBeInstanceOf(Date);
  });

  it("salva whatsappVerifiedNumber no Contact", async () => {
    await saveWhatsAppVerification("contact", "contact-1", "+351910155711");

    const call = prismaMock.contact.update.mock.calls[0][0];
    expect(call.data.whatsappVerifiedNumber).toBe("+351910155711");
  });

  it("retorna success=true após salvar no Contact", async () => {
    const result = await saveWhatsAppVerification("contact", "contact-1", "+351910155711");

    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe("saveWhatsAppVerification — resultado negativo (sem WhatsApp)", () => {
  beforeEach(() => {
    prismaMock.lead.findFirst.mockResolvedValue({ id: "lead-1" } as never);
    prismaMock.lead.update.mockResolvedValue({} as never);
    prismaMock.contact.findFirst.mockResolvedValue({ id: "contact-1" } as never);
    prismaMock.contact.update.mockResolvedValue({} as never);
  });

  it("salva whatsappVerified=false quando exists=false no Lead", async () => {
    await saveWhatsAppVerification("lead", "lead-1", "+5511999998888", false);

    const call = prismaMock.lead.update.mock.calls[0][0];
    expect(call.data.whatsappVerified).toBe(false);
  });

  it("salva whatsappVerifiedAt mesmo quando exists=false no Lead", async () => {
    const before = new Date();
    await saveWhatsAppVerification("lead", "lead-1", "+5511999998888", false);
    const after = new Date();

    const call = prismaMock.lead.update.mock.calls[0][0];
    expect(call.data.whatsappVerifiedAt).toBeInstanceOf(Date);
    expect((call.data.whatsappVerifiedAt as Date).getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect((call.data.whatsappVerifiedAt as Date).getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it("salva whatsappVerifiedNumber mesmo quando exists=false no Lead", async () => {
    await saveWhatsAppVerification("lead", "lead-1", "+5511999998888", false);

    const call = prismaMock.lead.update.mock.calls[0][0];
    expect(call.data.whatsappVerifiedNumber).toBe("+5511999998888");
  });

  it("salva whatsappVerified=false quando exists=false no Contact", async () => {
    await saveWhatsAppVerification("contact", "contact-1", "+351910155711", false);

    const call = prismaMock.contact.update.mock.calls[0][0];
    expect(call.data.whatsappVerified).toBe(false);
  });

  it("salva whatsappVerifiedAt mesmo quando exists=false no Contact", async () => {
    await saveWhatsAppVerification("contact", "contact-1", "+351910155711", false);

    const call = prismaMock.contact.update.mock.calls[0][0];
    expect(call.data.whatsappVerifiedAt).toBeInstanceOf(Date);
  });

  it("exists=true é o padrão quando não informado", async () => {
    await saveWhatsAppVerification("lead", "lead-1", "+5511999998888");

    const call = prismaMock.lead.update.mock.calls[0][0];
    expect(call.data.whatsappVerified).toBe(true);
  });
});
