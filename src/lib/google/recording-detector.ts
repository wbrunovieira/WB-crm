/**
 * Google Meet Recording Detector
 *
 * After a meeting ends, Google Workspace automatically saves recordings to
 * "Meet Recordings/" folder in the meeting organizer's Drive.
 *
 * This module searches Drive for recordings linked to a given Google Event ID,
 * moves them to "WB-CRM/Reuniões/[Lead]/", and returns the Drive file info.
 */

import { google } from "googleapis";
import { getAuthenticatedClient } from "./auth";
import { getOrCreateFolder } from "./drive";

const ROOT_FOLDER_NAME = "WB-CRM";
const MEETINGS_FOLDER_NAME = "Reuniões";

export interface RecordingFile {
  fileId: string;
  webViewLink: string;
}

export interface MeetingFiles {
  recording: RecordingFile | null;
  /** Google Meet transcription doc saved to Drive (if user enabled it in Meet) */
  nativeTranscript: RecordingFile | null;
}

/**
 * Searches Drive for recording (.mp4) and native transcript (Google Doc) for a meeting.
 * Google Meet names files as "[Title] (YYYY-MM-DD at HH:MM GMT±N).mp4"
 * and transcripts as "[Title] - Transcrição (YYYY-MM-DD ...)" or similar.
 * We search by title prefix (first 20 chars) to match both.
 */
export async function findMeetingFiles(
  meetingTitle: string,
  minCreatedTime: Date
): Promise<MeetingFiles> {
  const auth = await getAuthenticatedClient();
  const drive = google.drive({ version: "v3", auth });

  // Use the first 20 chars of the title to avoid punctuation issues in Drive query
  const titlePrefix = meetingTitle.slice(0, 20).replace(/'/g, "\\'");
  const minTime = minCreatedTime.toISOString();

  const res = await drive.files.list({
    q: `name contains '${titlePrefix}' and trashed = false and createdTime > '${minTime}'`,
    fields: "files(id, name, webViewLink, createdTime, mimeType)",
    orderBy: "createdTime desc",
    pageSize: 20,
  });

  const files = res.data.files ?? [];

  const recording = files.find((f) => f.mimeType === "video/mp4") ?? null;
  const nativeTranscript =
    files.find(
      (f) =>
        f.mimeType === "application/vnd.google-apps.document" ||
        f.mimeType === "text/plain"
    ) ?? null;

  return {
    recording: recording ? { fileId: recording.id!, webViewLink: recording.webViewLink! } : null,
    nativeTranscript: nativeTranscript
      ? { fileId: nativeTranscript.id!, webViewLink: nativeTranscript.webViewLink! }
      : null,
  };
}

/** @deprecated Use findMeetingFiles instead */
export async function findMeetingRecording(
  googleEventId: string
): Promise<{ fileId: string; webViewLink: string } | null> {
  const auth = await getAuthenticatedClient();
  const drive = google.drive({ version: "v3", auth });

  const shortCode = googleEventId.split("_").pop() ?? googleEventId;

  const res = await drive.files.list({
    q: `name contains '${shortCode}' and mimeType = 'video/mp4' and trashed = false`,
    fields: "files(id, name, webViewLink, createdTime)",
    orderBy: "createdTime desc",
    pageSize: 5,
  });

  const files = res.data.files ?? [];
  if (files.length === 0) return null;
  return { fileId: files[0].id!, webViewLink: files[0].webViewLink! };
}

/** Moves recording to WB-CRM/Reuniões/[folderName]/ and returns new location */
export async function moveRecordingToFolder(
  fileId: string,
  entityFolderName: string
): Promise<{ fileId: string; webViewLink: string }> {
  const auth = await getAuthenticatedClient();
  const drive = google.drive({ version: "v3", auth });

  // Ensure WB-CRM/Reuniões/[entity]/ folder exists
  const rootId = await getOrCreateFolder(ROOT_FOLDER_NAME);
  const reunioesId = await getOrCreateFolder(MEETINGS_FOLDER_NAME, rootId);
  const entityFolderId = await getOrCreateFolder(entityFolderName, reunioesId);

  // Get current parents of the file
  const meta = await drive.files.get({
    fileId,
    fields: "parents",
  });
  const currentParents = (meta.data.parents ?? []).join(",");

  // Move file
  const updated = await drive.files.update({
    fileId,
    addParents: entityFolderId,
    removeParents: currentParents,
    fields: "id,webViewLink",
  });

  return {
    fileId: updated.data.id!,
    webViewLink: updated.data.webViewLink!,
  };
}
