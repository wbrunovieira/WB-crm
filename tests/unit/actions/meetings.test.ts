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
}));

import {
  getMeetings,
  scheduleMeeting,
  cancelMeeting,
} from "@/actions/meetings";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { createMeetEvent, cancelMeetEvent } from "@/lib/google/calendar";

const mockGetServerSession = vi.mocked(getServerSession);
const mockMeetingCreate = vi.mocked(prisma.meeting.create);
const mockMeetingFindMany = vi.mocked(prisma.meeting.findMany);
const mockMeetingUpdate = vi.mocked(prisma.meeting.update);
const mockMeetingFindUnique = vi.mocked(prisma.meeting.findUnique);
const mockActivityCreate = vi.mocked(prisma.activity.create);
const mockActivityUpdate = vi.mocked(prisma.activity.update);
const mockCreateMeetEvent = vi.mocked(createMeetEvent);
const mockCancelMeetEvent = vi.mocked(cancelMeetEvent);

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
