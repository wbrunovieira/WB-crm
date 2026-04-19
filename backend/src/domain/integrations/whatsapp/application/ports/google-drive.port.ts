export abstract class GoogleDrivePort {
  abstract uploadFile(opts: {
    name: string;
    mimeType: string;
    content: Buffer;
    folderId?: string;
  }): Promise<{ id: string; webViewLink: string }>;

  abstract getOrCreateFolder(name: string, parentId?: string): Promise<string>;
}
