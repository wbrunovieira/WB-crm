export interface DriveFile {
  fileId: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  createdAt: Date;
}

export abstract class GoogleDrivePort {
  /** Returns the Drive folder ID for "Meet Recordings", or null if not found. */
  abstract findMeetRecordingsFolder(): Promise<string | null>;

  /** Lists files in a given folder created after sinceIso. */
  abstract listFilesInFolder(folderId: string, sinceIso: string): Promise<DriveFile[]>;

  /** Exports a Google Workspace document as plain text. */
  abstract exportDocText(fileId: string): Promise<string>;

  /** Downloads a file and returns its Buffer. */
  abstract downloadFile(fileId: string): Promise<Buffer>;
}
