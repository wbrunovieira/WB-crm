import { describe, it, expect, beforeEach } from "vitest";
import { DetectMeetRecordingsUseCase } from "@/domain/integrations/meet/application/use-cases/detect-meet-recordings.use-case";
import { FakeGoogleDrivePort } from "../../fakes/fake-google-drive.port";
import { FakeGoogleCalendarPort } from "../../fakes/fake-google-calendar.port";
import { FakeMeetingsRepository } from "../../fakes/fake-meetings.repository";
import { FakeTranscriberPort } from "../../fakes/fake-transcriber.port";
import type { DriveFile } from "@/domain/integrations/meet/application/ports/google-drive.port";

const NOW = new Date("2026-04-20T14:00:00Z");

function makeFile(overrides: Partial<DriveFile> = {}): DriveFile {
  return {
    fileId: "file-001",
    name: "Reunião WB - 2026/04/20 14:00 GMT-3 - Recording",
    mimeType: "video/mp4",
    webViewLink: "https://drive.google.com/file/001",
    createdAt: new Date("2026-04-20T13:55:00Z"),
    ...overrides,
  };
}

let drive: FakeGoogleDrivePort;
let calendar: FakeGoogleCalendarPort;
let meetings: FakeMeetingsRepository;
let transcriber: FakeTranscriberPort;
let useCase: DetectMeetRecordingsUseCase;

beforeEach(() => {
  drive = new FakeGoogleDrivePort();
  calendar = new FakeGoogleCalendarPort();
  meetings = new FakeMeetingsRepository();
  transcriber = new FakeTranscriberPort();
  useCase = new DetectMeetRecordingsUseCase(drive, calendar, meetings, transcriber);
});

describe("DetectMeetRecordingsUseCase", () => {
  describe("Pass 0 — Drive-first detection", () => {
    it("marks meeting as ended when Drive file title matches scheduled meeting", async () => {
      meetings.addMeeting({
        id: "meet-001",
        title: "Reunião WB",
        startAt: new Date("2026-04-20T13:00:00Z"),
        status: "scheduled",
        googleEventId: "gcal-001",
      });
      drive.addFile(makeFile());

      const result = await useCase.execute(NOW);

      expect(result.isRight()).toBe(true);
      expect(result.value.pass0DriveDetected).toBe(1);
      const meeting = meetings.items[0];
      expect(meeting.status).toBe("ended");
      expect(meeting.actualEndAt).toEqual(NOW);
    });

    it("does not match meeting with different title", async () => {
      meetings.addMeeting({
        id: "meet-001",
        title: "Outra Reunião",
        startAt: new Date(NOW.getTime() + 2 * 60 * 60 * 1000),
        endAt: new Date(NOW.getTime() + 3 * 60 * 60 * 1000),
        status: "scheduled",
      });
      drive.addFile(makeFile());

      const result = await useCase.execute(NOW);

      expect(result.value.pass0DriveDetected).toBe(0);
      expect(meetings.items[0].status).toBe("scheduled");
    });

    it("completes associated activity when meeting is ended", async () => {
      meetings.addMeeting({
        id: "meet-001",
        title: "Reunião WB",
        startAt: new Date("2026-04-20T13:00:00Z"),
        status: "scheduled",
        activityId: "activity-001",
      });
      drive.addFile(makeFile());

      await useCase.execute(NOW);

      expect(meetings.completedActivities).toHaveLength(1);
      expect(meetings.completedActivities[0].activityId).toBe("activity-001");
    });

    it("saves mp4 recording and queues video transcription (no native doc)", async () => {
      meetings.addMeeting({
        id: "meet-001",
        title: "Reunião WB",
        startAt: new Date("2026-04-20T13:00:00Z"),
        status: "scheduled",
        googleEventId: "gcal-001",
      });
      drive.addFile(makeFile({ fileId: "mp4-001", mimeType: "video/mp4" }));

      await useCase.execute(NOW);

      const meeting = meetings.items[0];
      expect(meeting.recordingDriveId).toBe("mp4-001");
      expect(meeting.transcriptionJobId).toBeDefined();
      expect(transcriber.submittedJobs).toHaveLength(1);
      expect(transcriber.submittedJobs[0].fileName).toContain("meet-001");
    });

    it("saves native Google Meet doc (summary + transcript)", async () => {
      meetings.addMeeting({
        id: "meet-001",
        title: "Reunião WB",
        startAt: new Date("2026-04-20T13:00:00Z"),
        status: "scheduled",
      });
      drive.addFile(makeFile({
        fileId: "doc-001",
        mimeType: "application/vnd.google-apps.document",
        name: "Reunião WB - 2026/04/20 14:00 GMT-3 - Transcript",
      }));
      drive.addDocText("doc-001", "📝 Observações\nResumo da reunião.\n📖 Transcrição\nJoão: Olá!\nMaria: Oi!");

      await useCase.execute(NOW);

      const meeting = meetings.items[0];
      expect(meeting.nativeTranscriptUrl).toBeDefined();
      expect(meeting.transcriptText).toContain("Transcrição");
      expect(meeting.meetingSummary).toContain("Observações");
      expect(transcriber.submittedJobs).toHaveLength(0);
    });

    it("saves summary but falls through to video transcription when no raw transcript section", async () => {
      meetings.addMeeting({
        id: "meet-001",
        title: "Reunião WB",
        startAt: new Date("2026-04-20T13:00:00Z"),
        status: "scheduled",
      });
      drive.addFile(makeFile({
        fileId: "doc-001",
        mimeType: "application/vnd.google-apps.document",
        name: "Reunião WB - 2026/04/20 14:00 GMT-3",
      }));
      drive.addFile(makeFile({ fileId: "mp4-001", mimeType: "video/mp4" }));
      drive.addDocText("doc-001", "📝 Observações\nSomente notas do Gemini aqui. Sem transcrição bruta.");

      await useCase.execute(NOW);

      const meeting = meetings.items[0];
      expect(meeting.meetingSummary).toBeDefined();
      expect(meeting.transcriptText).toBeFalsy();
      expect(meeting.transcriptionJobId).toBeDefined();
    });

    it("returns pass0DriveDetected=0 when Meet Recordings folder not found", async () => {
      drive.meetFolderId = null;
      meetings.addMeeting({ id: "meet-001", title: "Reunião WB", startAt: NOW, status: "scheduled" });

      const result = await useCase.execute(NOW);

      expect(result.value.pass0DriveDetected).toBe(0);
    });
  });

  describe("Pass 1 — time-based fallback", () => {
    it("marks as ended when endAt has passed", async () => {
      const pastEnd = new Date(NOW.getTime() - 10 * 60 * 1000);
      meetings.addMeeting({
        id: "meet-002",
        title: "Reunião Atrasada",
        startAt: new Date(NOW.getTime() - 60 * 60 * 1000),
        endAt: pastEnd,
        status: "scheduled",
        googleEventId: "gcal-002",
      });

      const result = await useCase.execute(NOW);

      expect(result.value.pass1TimeBased).toBe(1);
      expect(meetings.items[0].status).toBe("ended");
    });

    it("marks as ended when no endAt and startAt is 30+ min ago", async () => {
      meetings.addMeeting({
        id: "meet-003",
        title: "Sem Fim",
        startAt: new Date(NOW.getTime() - 35 * 60 * 1000),
        status: "scheduled",
      });

      const result = await useCase.execute(NOW);

      expect(result.value.pass1TimeBased).toBe(1);
    });

    it("does not move to ended if meeting just started", async () => {
      meetings.addMeeting({
        id: "meet-004",
        title: "Recente",
        startAt: new Date(NOW.getTime() - 10 * 60 * 1000),
        endAt: new Date(NOW.getTime() + 50 * 60 * 1000),
        status: "scheduled",
      });

      const result = await useCase.execute(NOW);

      expect(result.value.pass1TimeBased).toBe(0);
    });

    it("skips pass0-handled meetings", async () => {
      const pastEnd = new Date(NOW.getTime() - 10 * 60 * 1000);
      meetings.addMeeting({
        id: "meet-001",
        title: "Reunião WB",
        startAt: new Date(NOW.getTime() - 60 * 60 * 1000),
        endAt: pastEnd,
        status: "scheduled",
      });
      drive.addFile(makeFile()); // pass0 will detect this

      const result = await useCase.execute(NOW);

      // pass0 handles it, pass1 should skip
      expect(result.value.pass0DriveDetected).toBe(1);
      expect(result.value.pass1TimeBased).toBe(0);
    });
  });

  describe("Pass 2 — retry ended meetings without recording", () => {
    it("retries recording search for ended meeting within 4h", async () => {
      const endedRecently = new Date(NOW.getTime() - 30 * 60 * 1000);
      meetings.addMeeting({
        id: "meet-005",
        title: "Reunião Sem Gravação",
        startAt: new Date(NOW.getTime() - 90 * 60 * 1000),
        status: "ended",
        actualEndAt: endedRecently,
        googleEventId: "gcal-005",
      });
      drive.addFile(makeFile({ name: "Reunião Sem Gravação - 2026/04/20 13:30 GMT-3 - Recording" }));

      const result = await useCase.execute(NOW);

      expect(result.value.retriedRecording).toBe(1);
    });

    it("does not retry meetings ended more than 4h ago", async () => {
      const endedLongAgo = new Date(NOW.getTime() - 5 * 60 * 60 * 1000);
      meetings.addMeeting({
        id: "meet-006",
        title: "Reunião Antiga",
        startAt: new Date(NOW.getTime() - 6 * 60 * 60 * 1000),
        status: "ended",
        actualEndAt: endedLongAgo,
        googleEventId: "gcal-006",
      });

      const result = await useCase.execute(NOW);

      expect(result.value.retriedRecording).toBe(0);
    });
  });

  describe("resilience", () => {
    it("returns right even when calendar.getMeetEvent throws", async () => {
      meetings.addMeeting({
        id: "meet-001",
        title: "Reunião WB",
        startAt: NOW,
        status: "scheduled",
        googleEventId: "invalid-id",
      });
      drive.addFile(makeFile());
      // calendar has no event for invalid-id — returns null (non-fatal)

      const result = await useCase.execute(NOW);

      expect(result.isRight()).toBe(true);
    });

    it("continues processing other meetings when one fails", async () => {
      meetings.addMeeting({ id: "meet-001", title: "Reunião WB", startAt: NOW, status: "scheduled" });
      meetings.addMeeting({
        id: "meet-002",
        title: "Reunião WB",
        startAt: NOW,
        endAt: new Date(NOW.getTime() - 1),
        status: "scheduled",
        googleEventId: "gcal-002",
      });
      drive.addFile(makeFile());

      const result = await useCase.execute(NOW);

      expect(result.isRight()).toBe(true);
    });
  });
});
