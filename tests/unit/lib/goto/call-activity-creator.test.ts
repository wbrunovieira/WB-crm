/**
 * GoTo Call Activity Creator Tests
 *
 * Tests for src/lib/goto/call-activity-creator.ts
 * - Cria Activity do tipo "call" a partir do CDR GoTo
 * - Calcula duração corretamente
 * - Vincula à entidade correta (contact/lead/partner)
 * - Previne duplicação via gotoCallId
 * - Não lança exceção se entidade não encontrada
 *
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCallActivity } from "@/lib/goto/call-activity-creator";
import { prismaMock } from "../../../setup";
import type { GoToCallReport } from "@/lib/goto/types";

// Mock do number-matcher
vi.mock("@/lib/goto/number-matcher", () => ({
  matchPhoneToEntity: vi.fn(),
}));

import { matchPhoneToEntity } from "@/lib/goto/number-matcher";
const mockMatchPhone = vi.mocked(matchPhoneToEntity);

const OWNER_ID = "user-owner-123";

const baseReport: GoToCallReport = {
  conversationSpaceId: "conv-abc-123",
  accountKey: "8583618328163306147",
  direction: "OUTBOUND",
  callCreated: "2026-04-10T14:00:00.000Z",
  callEnded: "2026-04-10T14:08:32.000Z", // 8m32s = 512s
  participants: [
    {
      participantId: "p1",
      legId: "leg1",
      type: "LINE",
      extensionNumber: "1042",
      lineId: "line-xyz",
    },
    {
      participantId: "p2",
      legId: "leg2",
      type: "PHONE_NUMBER",
      phoneNumber: "+557135997905",
      causeCode: 16, // atendida
    },
  ],
};

beforeEach(() => {
  mockMatchPhone.mockResolvedValue(null);
  prismaMock.activity.findFirst.mockResolvedValue(null);
  prismaMock.activity.create.mockResolvedValue({
    id: "activity-new-1",
  } as any);
  prismaMock.user.findFirst.mockResolvedValue({
    id: OWNER_ID,
  } as any);
});

describe("createCallActivity — criação básica", () => {
  it("deve criar Activity do tipo 'call'", async () => {
    mockMatchPhone.mockResolvedValue({
      entityType: "contact",
      entityId: "contact-1",
      contactId: "contact-1",
    });

    await createCallActivity(baseReport, OWNER_ID);

    expect(prismaMock.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "call" }),
      })
    );
  });

  it("deve marcar a activity como completed=true", async () => {
    mockMatchPhone.mockResolvedValue(null);

    await createCallActivity(baseReport, OWNER_ID);

    expect(prismaMock.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ completed: true }),
      })
    );
  });

  it("deve salvar o gotoCallId para idempotência", async () => {
    mockMatchPhone.mockResolvedValue(null);

    await createCallActivity(baseReport, OWNER_ID);

    expect(prismaMock.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          gotoCallId: "conv-abc-123",
        }),
      })
    );
  });
});

describe("createCallActivity — duração", () => {
  it("deve calcular duração correta em segundos (8m32s = 512s)", async () => {
    mockMatchPhone.mockResolvedValue(null);

    await createCallActivity(baseReport, OWNER_ID);

    expect(prismaMock.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subject: expect.stringContaining("8min 32s"),
        }),
      })
    );
  });

  it("deve incluir direção OUTBOUND no subject", async () => {
    mockMatchPhone.mockResolvedValue(null);

    await createCallActivity(baseReport, OWNER_ID);

    expect(prismaMock.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subject: expect.stringMatching(/realizada|sainte|OUTBOUND/i),
        }),
      })
    );
  });

  it("deve incluir direção INBOUND no subject para chamadas recebidas", async () => {
    const inboundReport = { ...baseReport, direction: "INBOUND" as const };
    mockMatchPhone.mockResolvedValue(null);

    await createCallActivity(inboundReport, OWNER_ID);

    expect(prismaMock.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subject: expect.stringMatching(/recebida|entrante|INBOUND/i),
        }),
      })
    );
  });
});

describe("createCallActivity — vinculação de entidade", () => {
  it("deve vincular ao Contact quando encontrado pelo número", async () => {
    mockMatchPhone.mockResolvedValue({
      entityType: "contact",
      entityId: "contact-1",
      contactId: "contact-1",
    });

    await createCallActivity(baseReport, OWNER_ID);

    expect(prismaMock.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ contactId: "contact-1" }),
      })
    );
  });

  it("deve vincular ao Lead quando encontrado pelo número", async () => {
    mockMatchPhone.mockResolvedValue({
      entityType: "lead",
      entityId: "lead-1",
      leadId: "lead-1",
    });

    await createCallActivity(baseReport, OWNER_ID);

    expect(prismaMock.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ leadId: "lead-1" }),
      })
    );
  });

  it("deve vincular ao Partner quando encontrado pelo número", async () => {
    mockMatchPhone.mockResolvedValue({
      entityType: "partner",
      entityId: "partner-1",
      partnerId: "partner-1",
    });

    await createCallActivity(baseReport, OWNER_ID);

    expect(prismaMock.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ partnerId: "partner-1" }),
      })
    );
  });

  it("deve criar Activity mesmo sem entidade vinculada (número desconhecido)", async () => {
    mockMatchPhone.mockResolvedValue(null);

    await createCallActivity(baseReport, OWNER_ID);

    expect(prismaMock.activity.create).toHaveBeenCalled();
  });
});

describe("createCallActivity — idempotência", () => {
  it("não deve criar Activity duplicada para o mesmo gotoCallId", async () => {
    prismaMock.activity.findFirst.mockResolvedValue({
      id: "activity-existing",
      gotoCallId: "conv-abc-123",
    } as any);

    await createCallActivity(baseReport, OWNER_ID);

    expect(prismaMock.activity.create).not.toHaveBeenCalled();
  });

  it("deve criar Activity se gotoCallId ainda não existe", async () => {
    prismaMock.activity.findFirst.mockResolvedValue(null);
    mockMatchPhone.mockResolvedValue(null);

    await createCallActivity(baseReport, OWNER_ID);

    expect(prismaMock.activity.create).toHaveBeenCalled();
  });
});

describe("createCallActivity — resiliência", () => {
  it("não deve lançar exceção se matchPhoneToEntity falhar", async () => {
    mockMatchPhone.mockRejectedValue(new Error("DB error"));

    await expect(
      createCallActivity(baseReport, OWNER_ID)
    ).resolves.not.toThrow();
  });
});
