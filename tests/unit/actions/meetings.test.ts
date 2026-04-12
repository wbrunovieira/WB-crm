/**
 * Meetings Actions Tests
 *
 * Tests for src/actions/meetings.ts
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    meeting: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    activity: {
      create: vi.fn(),
      update: vi.fn(),
    },
    lead: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/google/calendar", () => ({
  createMeetEvent: vi.fn(),
  cancelMeetEvent: vi.fn(),
  getMeetEvent: vi.fn(),
  updateMeetEvent: vi.fn(),
}));

import {
  getMeetings,
  scheduleMeeting,
  cancelMeeting,
  updateMeeting,
  checkMeetingTitleExists,
} from "@/actions/meetings";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { createMeetEvent, cancelMeetEvent, updateMeetEvent } from "@/lib/google/calendar";

const mockGetServerSession = vi.mocked(getServerSession);
const mockMeetingCreate = vi.mocked(prisma.meeting.create);
const mockMeetingFindMany = vi.mocked(prisma.meeting.findMany);
const mockMeetingFindFirst = vi.mocked(prisma.meeting.findFirst);
const mockMeetingUpdate = vi.mocked(prisma.meeting.update);
const mockMeetingFindUnique = vi.mocked(prisma.meeting.findUnique);
const mockActivityCreate = vi.mocked(prisma.activity.create);
const mockActivityUpdate = vi.mocked(prisma.activity.update);
const mockCreateMeetEvent = vi.mocked(createMeetEvent);
const mockCancelMeetEvent = vi.mocked(cancelMeetEvent);
const mockUpdateMeetEvent = vi.mocked(updateMeetEvent);

const SESSION = {
  user: { id: "user-1", email: "user@wb.com", role: "closer", name: "Bruno" },
};

const FUTURE_DATE = new Date(Date.now() + 2 * 60 * 60 * 1000); // +2h
const END_DATE = new Date(FUTURE_DATE.getTime() + 60 * 60 * 1000); // +1h after start

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue(SESSION as never);
});

// ---------------------------------------------------------------------------
describe("getMeetings", () => {
  it("retorna reuniões do lead", async () => {
    const meetings = [
      {
        id: "meeting-1",
        title: "Reunião Inicial",
        status: "scheduled",
        startAt: FUTURE_DATE,
        leadId: "lead-1",
        ownerId: "user-1",
      },
    ];
    mockMeetingFindMany.mockResolvedValue(meetings as never);

    const result = await getMeetings({ leadId: "lead-1" });

    expect(mockMeetingFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ leadId: "lead-1" }),
      })
    );
    expect(result).toEqual(meetings);
  });

  it("lança erro se não autenticado", async () => {
    mockGetServerSession.mockResolvedValue(null as never);

    await expect(getMeetings({ leadId: "lead-1" })).rejects.toThrow("Não autorizado");
  });
});

// ---------------------------------------------------------------------------
describe("scheduleMeeting", () => {
  it("cria reunião e Activity pendente vinculada ao lead", async () => {
    mockCreateMeetEvent.mockResolvedValue({
      googleEventId: "evt-abc123",
      meetLink: "https://meet.google.com/abc-xyz",
      attendees: [
        { email: "client@empresa.com", responseStatus: "needsAction" },
      ],
    });

    const activity = {
      id: "activity-1",
      type: "meeting",
      subject: "Reunião: Apresentação da proposta",
      completed: false,
      leadId: "lead-1",
      ownerId: "user-1",
    };
    mockActivityCreate.mockResolvedValue(activity as never);

    const meeting = {
      id: "meeting-1",
      title: "Apresentação da proposta",
      googleEventId: "evt-abc123",
      meetLink: "https://meet.google.com/abc-xyz",
      status: "scheduled",
      startAt: FUTURE_DATE,
      endAt: END_DATE,
      attendeeEmails: JSON.stringify(["client@empresa.com"]),
      activityId: "activity-1",
      leadId: "lead-1",
      ownerId: "user-1",
    };
    mockMeetingCreate.mockResolvedValue(meeting as never);

    const result = await scheduleMeeting({
      title: "Apresentação da proposta",
      startAt: FUTURE_DATE,
      endAt: END_DATE,
      attendeeEmails: ["client@empresa.com"],
      leadId: "lead-1",
    });

    // Should create Google Calendar event
    expect(mockCreateMeetEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Apresentação da proposta",
        attendeeEmails: ["client@empresa.com"],
      })
    );

    // Should create pending Activity
    expect(mockActivityCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "meeting",
          completed: false,
          leadId: "lead-1",
          ownerId: "user-1",
        }),
      })
    );

    // Should create Meeting record
    expect(mockMeetingCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          googleEventId: "evt-abc123",
          meetLink: "https://meet.google.com/abc-xyz",
          leadId: "lead-1",
          ownerId: "user-1",
        }),
      })
    );

    expect(result).toMatchObject({ id: "meeting-1", googleEventId: "evt-abc123" });
  });

  it("lança erro se não autenticado", async () => {
    mockGetServerSession.mockResolvedValue(null as never);

    await expect(
      scheduleMeeting({
        title: "Teste",
        startAt: FUTURE_DATE,
        endAt: END_DATE,
        attendeeEmails: [],
      })
    ).rejects.toThrow("Não autorizado");
  });

  it("lança erro se título estiver vazio", async () => {
    await expect(
      scheduleMeeting({
        title: "",
        startAt: FUTURE_DATE,
        endAt: END_DATE,
        attendeeEmails: [],
      })
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// checkMeetingTitleExists — validates uniqueness (called by the modal before submit)
// Note: scheduleMeeting itself no longer checks — Next.js 14 sanitizes Server Action
// error messages in production, so validation must surface from client code.
// ---------------------------------------------------------------------------
describe("checkMeetingTitleExists", () => {
  it("retorna o título conflitante se já existe reunião com mesmo nome (case-insensitive)", async () => {
    mockMeetingFindFirst.mockResolvedValue({
      title: "cliente abc - 2026-04-13 14:00",
    } as never);

    const result = await checkMeetingTitleExists("Cliente ABC - 2026-04-13 14:00");

    expect(result).toBe("cliente abc - 2026-04-13 14:00");
    expect(mockMeetingFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          title: expect.objectContaining({ equals: "Cliente ABC - 2026-04-13 14:00", mode: "insensitive" }),
          status: expect.objectContaining({ not: "cancelled" }),
        }),
        select: { title: true },
      })
    );
  });

  it("retorna null se não existe conflito (título disponível)", async () => {
    mockMeetingFindFirst.mockResolvedValue(null as never);

    const result = await checkMeetingTitleExists("Reunião Nova");

    expect(result).toBeNull();
  });

  it("ignora a própria reunião ao editar (excludeMeetingId)", async () => {
    mockMeetingFindFirst.mockResolvedValue(null as never);

    await checkMeetingTitleExists("Meu Título", "meeting-123");

    expect(mockMeetingFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { not: "meeting-123" },
        }),
      })
    );
  });

  it("lança erro se não autenticado", async () => {
    mockGetServerSession.mockResolvedValue(null as never);
    await expect(checkMeetingTitleExists("Qualquer Título")).rejects.toThrow("Não autorizado");
  });
});

// ---------------------------------------------------------------------------
describe("cancelMeeting", () => {
  it("cancela reunião no Google Calendar e marca como cancelled", async () => {
    const meeting = {
      id: "meeting-1",
      googleEventId: "evt-abc123",
      activityId: "activity-1",
      ownerId: "user-1",
      status: "scheduled",
    };
    mockMeetingFindUnique.mockResolvedValue(meeting as never);
    mockCancelMeetEvent.mockResolvedValue(undefined);
    mockMeetingUpdate.mockResolvedValue({ ...meeting, status: "cancelled" } as never);
    mockActivityUpdate.mockResolvedValue({} as never);

    await cancelMeeting("meeting-1");

    expect(mockCancelMeetEvent).toHaveBeenCalledWith("evt-abc123");
    expect(mockMeetingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "meeting-1" },
        data: expect.objectContaining({ status: "cancelled" }),
      })
    );
  });

  it("lança erro se reunião não pertence ao usuário", async () => {
    mockMeetingFindUnique.mockResolvedValue({
      id: "meeting-1",
      googleEventId: "evt-abc",
      activityId: null,
      ownerId: "other-user",
      status: "scheduled",
    } as never);

    await expect(cancelMeeting("meeting-1")).rejects.toThrow();
  });

  it("lança erro se não autenticado", async () => {
    mockGetServerSession.mockResolvedValue(null as never);
    await expect(cancelMeeting("meeting-1")).rejects.toThrow("Não autorizado");
  });
});

// ---------------------------------------------------------------------------
describe("updateMeeting", () => {
  const scheduledMeeting = {
    id: "meeting-1",
    googleEventId: "evt-abc123",
    activityId: "activity-1",
    ownerId: "user-1",
    status: "scheduled",
    title: "Reunião Original",
    attendeeEmails: JSON.stringify([{ email: "old@empresa.com", responseStatus: "needsAction" }]),
    leadId: "lead-1",
    dealId: null,
    contactId: null,
  };

  it("atualiza título, horário e convidados no Calendar e no banco", async () => {
    mockMeetingFindUnique.mockResolvedValue(scheduledMeeting as never);
    mockUpdateMeetEvent.mockResolvedValue({
      attendees: [{ email: "novo@empresa.com", responseStatus: "needsAction" }],
    });
    mockActivityUpdate.mockResolvedValue({} as never);
    mockMeetingUpdate.mockResolvedValue({ ...scheduledMeeting, title: "Reunião Atualizada" } as never);

    const result = await updateMeeting("meeting-1", {
      title: "Reunião Atualizada",
      startAt: FUTURE_DATE,
      endAt: END_DATE,
      attendeeEmails: ["novo@empresa.com"],
    });

    expect(mockUpdateMeetEvent).toHaveBeenCalledWith(
      "evt-abc123",
      expect.objectContaining({
        title: "Reunião Atualizada",
        attendeeEmails: ["novo@empresa.com"],
      })
    );

    expect(mockMeetingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "meeting-1" },
        data: expect.objectContaining({
          title: "Reunião Atualizada",
          attendeeEmails: JSON.stringify([{ email: "novo@empresa.com", responseStatus: "needsAction" }]),
        }),
      })
    );

    expect(result).toMatchObject({ title: "Reunião Atualizada" });
  });

  it("lança erro se reunião não pertence ao usuário", async () => {
    mockMeetingFindUnique.mockResolvedValue({ ...scheduledMeeting, ownerId: "other-user" } as never);

    await expect(updateMeeting("meeting-1", { title: "Novo título" })).rejects.toThrow();
  });

  it("lança erro se reunião não está agendada", async () => {
    mockMeetingFindUnique.mockResolvedValue({ ...scheduledMeeting, status: "cancelled" } as never);

    await expect(updateMeeting("meeting-1", { title: "Novo título" })).rejects.toThrow(
      "Somente reuniões agendadas podem ser editadas"
    );
  });

  it("lança erro se não autenticado", async () => {
    mockGetServerSession.mockResolvedValue(null as never);
    await expect(updateMeeting("meeting-1", { title: "Teste" })).rejects.toThrow("Não autorizado");
  });
});
