/**
 * GoTo Drive Uploader
 *
 * Uploads GoTo call recordings to Google Drive under WB-CRM/GoTo/Gravações/.
 * Reuses the existing drive.ts utilities (getOrCreateFolder, uploadFile).
 */

import { getOrCreateFolder, uploadFile } from "./drive";

const ROOT = "WB-CRM";
const GOTO_FOLDER = "GoTo";
const RECORDINGS_FOLDER = "Gravações";

// getOrCreateFolder already deduplicates by querying Drive before creating,
// so we rely on Drive-side idempotency rather than module-level caching.
async function getRecordingsFolder(): Promise<string> {
  const rootId = await getOrCreateFolder(ROOT, undefined);
  const gotoId = await getOrCreateFolder(GOTO_FOLDER, rootId);
  return getOrCreateFolder(RECORDINGS_FOLDER, gotoId);
}

export interface UploadResult {
  fileId: string;
  webViewLink: string;
}

/**
 * Uploads a call recording buffer to Google Drive.
 * Creates WB-CRM/GoTo/Gravações/ hierarchy if it doesn't exist.
 * Returns { fileId, webViewLink }.
 */
export async function uploadCallRecordingToDrive(
  buffer: Buffer,
  fileName: string,
  contentType: string
): Promise<UploadResult> {
  const folderId = await getRecordingsFolder();

  const result = await uploadFile({
    name: fileName,
    mimeType: contentType,
    content: buffer,
    folderId,
  });

  return { fileId: result.id, webViewLink: result.webViewLink };
}
