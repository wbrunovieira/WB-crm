import { Injectable, Logger } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { GoogleDrivePort, DriveFile } from "../ports/google-drive.port";
import { GoogleCalendarPort } from "../ports/google-calendar.port";
import { MeetingsRepository, MeetingRecord, SaveRecordingData } from "../repositories/meetings.repository";
import { TranscriberPort } from "@/infra/shared/transcriber/transcriber.port";

export interface DetectMeetRecordingsOutput {
  pass0DriveDetected: number;
  pass1TimeBased: number;
  retriedRecording: number;
  results: Array<{ meetingId: string; action: string; error?: string }>;
}

interface MeetingFiles {
  recording: DriveFile | null;
  nativeTranscript: DriveFile | null;
}

@Injectable()
export class DetectMeetRecordingsUseCase {
  private readonly logger = new Logger(DetectMeetRecordingsUseCase.name);

  constructor(
    private readonly drive: GoogleDrivePort,
    private readonly calendar: GoogleCalendarPort,
    private readonly meetings: MeetingsRepository,
    private readonly transcriber: TranscriberPort,
  ) {}

  async execute(now = new Date()): Promise<Either<never, DetectMeetRecordingsOutput>> {
    const results: Array<{ meetingId: string; action: string; error?: string }> = [];
    const pass0Ids = new Set<string>();

    // ── Pass 0: Drive-first detection (catches early/late meetings) ──────────
    try {
      const folderId = await this.drive.findMeetRecordingsFolder();
      this.logger.log(`Pass 0: Drive folder ${folderId ? `found (${folderId})` : "NOT FOUND"}`);
      if (folderId) {
        const since6h = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
        const recentFiles = await this.drive.listFilesInFolder(folderId, since6h);
        this.logger.log(`Pass 0: ${recentFiles.length} file(s) in Drive folder since ${since6h}`);
        if (recentFiles.length > 0) {
          this.logger.log(`Pass 0: files = ${recentFiles.map((f) => f.name).join(", ")}`);
        }

        const titlesInDrive = new Set<string>();
        for (const f of recentFiles) {
          const match = f.name.match(/^(.+?) - \d{4}\/\d{2}\/\d{2}/);
          if (match) titlesInDrive.add(match[1].toLowerCase());
        }
        this.logger.log(`Pass 0: titles extracted = [${[...titlesInDrive].join(", ")}]`);

        if (titlesInDrive.size > 0) {
          const scheduled = await this.meetings.findScheduled();
          for (const meeting of scheduled) {
            if (!titlesInDrive.has(meeting.title.toLowerCase())) continue;

            pass0Ids.add(meeting.id);
            try {
              const attendeeEmails = await this.fetchAttendees(meeting.googleEventId);
              await this.meetings.markAsEnded(meeting.id, {
                actualStartAt: meeting.actualStartAt ?? now,
                actualEndAt: now,
                attendeeEmails,
              });
              if (meeting.activityId) {
                await this.meetings.completeActivity(meeting.activityId, now);
              }
              const found = await this.processRecording(meeting, now, now, results);
              if (!found) {
                results.push({ meetingId: meeting.id, action: "drive_detected_recording_pending" });
              }
            } catch (err) {
              this.logger.error(`Pass 0 error for meeting ${meeting.id}`, err);
              results.push({ meetingId: meeting.id, action: "error", error: String(err) });
            }
          }
        }
      }
    } catch (err) {
      this.logger.error("Pass 0 Drive scan error", err);
    }

    // ── Pass 1: time-based fallback ───────────────────────────────────────────
    const earlyEndCutoff = new Date(now.getTime() - 30 * 60 * 1000);
    const scheduled = await this.meetings.findScheduled();
    const pass1Meetings = scheduled.filter((m) => {
      if (pass0Ids.has(m.id)) return false;
      if (m.endAt && m.endAt < now) return true;
      if (!m.endAt && m.startAt < earlyEndCutoff) return true;
      if (m.endAt && m.endAt > now && m.startAt < earlyEndCutoff) return true;
      return false;
    });

    for (const meeting of pass1Meetings) {
      try {
        const attendeeEmails = await this.fetchAttendees(meeting.googleEventId);
        await this.meetings.markAsEnded(meeting.id, {
          actualEndAt: now,
          ...(meeting.actualStartAt ? {} : { actualStartAt: meeting.startAt }),
          attendeeEmails,
        });
        if (meeting.activityId) {
          await this.meetings.completeActivity(meeting.activityId, now);
        }
        if (!meeting.googleEventId) {
          results.push({ meetingId: meeting.id, action: "ended_no_event_id" });
          continue;
        }
        const found = await this.processRecording(meeting, meeting.startAt, now, results);
        if (!found) {
          results.push({ meetingId: meeting.id, action: "ended_recording_pending" });
        }
      } catch (err) {
        this.logger.error(`Pass 1 error for meeting ${meeting.id}`, err);
        results.push({ meetingId: meeting.id, action: "error", error: String(err) });
      }
    }

    // ── Pass 2: retry ended meetings still missing recording ─────────────────
    const since4h = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    const pendingRecording = await this.meetings.findEndedPendingRecording(since4h);

    for (const meeting of pendingRecording) {
      try {
        const searchRef = meeting.actualEndAt ?? meeting.startAt;
        const found = await this.processRecording(meeting, searchRef, now, results);
        if (!found) {
          results.push({ meetingId: meeting.id, action: "recording_still_pending" });
        }
      } catch (err) {
        this.logger.error(`Pass 2 error for meeting ${meeting.id}`, err);
        results.push({ meetingId: meeting.id, action: "error", error: String(err) });
      }
    }

    return right({
      pass0DriveDetected: pass0Ids.size,
      pass1TimeBased: pass1Meetings.length,
      retriedRecording: pendingRecording.length,
      results,
    });
  }

  private async fetchAttendees(googleEventId: string | null): Promise<string | undefined> {
    if (!googleEventId) return undefined;
    try {
      const event = await this.calendar.getMeetEvent(googleEventId);
      if (!event) return undefined;
      return JSON.stringify(event.attendees);
    } catch {
      return undefined;
    }
  }

  private async findMeetingFiles(meetingTitle: string, scheduledStartAt: Date): Promise<MeetingFiles> {
    const folderId = await this.drive.findMeetRecordingsFolder();
    if (!folderId) return { recording: null, nativeTranscript: null };

    const minTime = new Date(scheduledStartAt.getTime() - 2 * 60 * 60 * 1000).toISOString();
    const files = await this.drive.listFilesInFolder(folderId, minTime);

    const titleLower = meetingTitle.toLowerCase();
    const matches = files.filter((f) => f.name.toLowerCase().startsWith(titleLower));
    const candidates = matches.length > 0 ? matches : files;

    const recording = candidates.find((f) => f.mimeType === "video/mp4") ?? null;
    const nativeTranscript = candidates.find(
      (f) => f.mimeType === "application/vnd.google-apps.document" || f.mimeType === "text/plain",
    ) ?? null;

    return { recording, nativeTranscript };
  }

  private parseGoogleMeetDoc(text: string): { meetingSummary: string | null; transcriptText: string | null } {
    const idx = text.indexOf("📖");
    if (idx === -1) return { meetingSummary: text || null, transcriptText: null };
    return {
      meetingSummary: text.slice(0, idx).trim() || null,
      transcriptText: text.slice(idx).trim() || null,
    };
  }

  private async processRecording(
    meeting: MeetingRecord,
    scheduledStartAt: Date,
    now: Date,
    results: Array<{ meetingId: string; action: string; error?: string }>,
  ): Promise<boolean> {
    const { recording, nativeTranscript } = await this.findMeetingFiles(meeting.title, scheduledStartAt);

    // Strategy 1: Google native transcript doc
    if (nativeTranscript) {
      const update: SaveRecordingData = {
        nativeTranscriptUrl: nativeTranscript.webViewLink,
        ...(recording ? { recordingDriveId: recording.fileId, recordingUrl: recording.webViewLink, recordingMovedAt: now } : {}),
      };

      try {
        const rawText = await this.drive.exportDocText(nativeTranscript.fileId);
        const { meetingSummary, transcriptText } = this.parseGoogleMeetDoc(rawText);
        if (meetingSummary) update.meetingSummary = meetingSummary;
        if (transcriptText) {
          update.transcriptText = transcriptText;
          update.transcribedAt = now;
        }
      } catch (err) {
        this.logger.error(`Failed to export native transcript for meeting ${meeting.id}`, err);
      }

      await this.meetings.saveRecordingData(meeting.id, update);

      if (update.transcriptText) {
        results.push({ meetingId: meeting.id, action: "google_transcript_saved" });
        return true;
      }
      results.push({ meetingId: meeting.id, action: "google_summary_saved_no_transcript" });
    }

    // Strategy 2: custom video transcription
    if (!recording) return nativeTranscript !== null;

    const buffer = await this.drive.downloadFile(recording.fileId);
    const { jobId: transcriptionJobId } = await this.transcriber.submitVideo(
      buffer,
      `reuniao-${meeting.id}.mp4`,
    );

    await this.meetings.saveRecordingData(meeting.id, {
      recordingDriveId: recording.fileId,
      recordingUrl: recording.webViewLink,
      recordingMovedAt: now,
      transcriptionJobId,
    });

    results.push({ meetingId: meeting.id, action: "recording_saved_video_transcription_queued" });
    return true;
  }
}
