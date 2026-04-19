import { Injectable, Logger } from "@nestjs/common";
import { GoogleDrivePort } from "@/domain/integrations/whatsapp/application/ports/google-drive.port";

/**
 * Stub Google Drive service — not yet implemented.
 * Actual implementation deferred to M10.3.
 */
@Injectable()
export class GoogleDriveService extends GoogleDrivePort {
  private readonly logger = new Logger(GoogleDriveService.name);

  async uploadFile(_opts: {
    name: string;
    mimeType: string;
    content: Buffer;
    folderId?: string;
  }): Promise<{ id: string; webViewLink: string }> {
    this.logger.warn("GoogleDriveService: not configured — implement in M10.3");
    throw new Error("Google Drive not configured — implement in M10.3");
  }

  async getOrCreateFolder(_name: string, _parentId?: string): Promise<string> {
    this.logger.warn("GoogleDriveService: not configured — implement in M10.3");
    throw new Error("Google Drive not configured — implement in M10.3");
  }
}
