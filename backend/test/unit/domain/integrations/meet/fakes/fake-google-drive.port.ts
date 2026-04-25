import { GoogleDrivePort, DriveFile } from "@/domain/integrations/meet/application/ports/google-drive.port";

export class FakeGoogleDrivePort extends GoogleDrivePort {
  public meetFolderId: string | null = "meet-folder-001";
  public files: DriveFile[] = [];
  public docTexts: Map<string, string> = new Map();
  public fileBuffers: Map<string, Buffer> = new Map();
  public deletedFileIds: string[] = [];
  public shouldFailDelete = false;

  async findMeetRecordingsFolder(): Promise<string | null> {
    return this.meetFolderId;
  }

  async listFilesInFolder(_folderId: string, _sinceIso: string): Promise<DriveFile[]> {
    return this.files;
  }

  async exportDocText(fileId: string): Promise<string> {
    return this.docTexts.get(fileId) ?? "";
  }

  async downloadFile(fileId: string): Promise<Buffer> {
    return this.fileBuffers.get(fileId) ?? Buffer.from("fake-video");
  }

  addFile(file: DriveFile): void {
    this.files.push(file);
  }

  async deleteFile(fileId: string): Promise<void> {
    if (this.shouldFailDelete) throw new Error("Drive delete failed (simulated)");
    this.deletedFileIds.push(fileId);
  }

  addDocText(fileId: string, text: string): void {
    this.docTexts.set(fileId, text);
  }
}
