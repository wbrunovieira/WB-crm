import { GoogleDrivePort } from "@/domain/integrations/whatsapp/application/ports/google-drive.port";

export interface FakeUploadedFile {
  name: string;
  mimeType: string;
  content: Buffer;
  folderId?: string;
  id: string;
  webViewLink: string;
}

export class FakeGoogleDrivePort extends GoogleDrivePort {
  public uploadedFiles: FakeUploadedFile[] = [];
  public folders: Map<string, string> = new Map();
  private nextFileId = 1;

  async uploadFile(opts: {
    name: string;
    mimeType: string;
    content: Buffer;
    folderId?: string;
  }): Promise<{ id: string; webViewLink: string }> {
    const id = `drive-file-${this.nextFileId++}`;
    const webViewLink = `https://drive.google.com/file/d/${id}/view`;
    this.uploadedFiles.push({ ...opts, id, webViewLink });
    return { id, webViewLink };
  }

  async getOrCreateFolder(name: string, _parentId?: string): Promise<string> {
    if (!this.folders.has(name)) {
      this.folders.set(name, `folder-${name}`);
    }
    return this.folders.get(name)!;
  }
}
