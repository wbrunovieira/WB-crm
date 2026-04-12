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

/** Returns Drive file metadata for the recording if found, null otherwise */
export async function findMeetingRecording(
  googleEventId: string
): Promise<{ fileId: string; webViewLink: string } | null> {
  const auth = await getAuthenticatedClient();
  const drive = google.drive({ version: "v3", auth });

  // Google Meet recordings are named after the meeting title and contain the event short code
  // The description/properties of the file sometimes contains the meeting ID
  // Best strategy: search in "Meet Recordings" folder by name containing the event short code
  // The event ID suffix (last segment) often appears in the file name
  const shortCode = googleEventId.split("_").pop() ?? googleEventId;

  const res = await drive.files.list({
    q: `name contains '${shortCode}' and mimeType = 'video/mp4' and trashed = false`,
    fields: "files(id, name, webViewLink, createdTime)",
    orderBy: "createdTime desc",
    pageSize: 5,
  });

  const files = res.data.files ?? [];
  if (files.length === 0) return null;

  const file = files[0];
  return { fileId: file.id!, webViewLink: file.webViewLink! };
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
