import { Injectable, Logger } from "@nestjs/common";
import { google } from "googleapis";
import { Readable } from "stream";
import { PrismaService } from "@/infra/database/prisma.service";
import { GoogleDrivePort } from "@/domain/integrations/whatsapp/application/ports/google-drive.port";

@Injectable()
export class GoogleDriveService extends GoogleDrivePort {
  private readonly logger = new Logger(GoogleDriveService.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private async getDriveClient() {
    const token = await this.prisma.googleToken.findFirst();
    if (!token) throw new Error("Google token not configured — connect via /api/google/auth");

    const now = new Date();
    let accessToken = token.accessToken;

    if (new Date(token.expiresAt) <= new Date(now.getTime() + 5 * 60 * 1000)) {
      this.logger.log("GoogleDriveService: refreshing token");
      const oauth2 = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI,
      );
      oauth2.setCredentials({ refresh_token: token.refreshToken });
      const { credentials } = await oauth2.refreshAccessToken();
      accessToken = credentials.access_token!;
      await this.prisma.googleToken.update({
        where: { id: token.id },
        data: { accessToken, expiresAt: new Date(credentials.expiry_date!) },
      });
    }

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );
    auth.setCredentials({ access_token: accessToken });
    return google.drive({ version: "v3", auth });
  }

  async uploadFile(opts: {
    name: string;
    mimeType: string;
    content: Buffer;
    folderId?: string;
  }): Promise<{ id: string; webViewLink: string }> {
    const drive = await this.getDriveClient();

    const requestBody: { name: string; parents?: string[] } = { name: opts.name };
    if (opts.folderId) requestBody.parents = [opts.folderId];

    const res = await drive.files.create({
      requestBody,
      media: { mimeType: opts.mimeType, body: Readable.from(opts.content) },
      fields: "id,webViewLink",
    });

    return { id: res.data.id!, webViewLink: res.data.webViewLink! };
  }

  async deleteFile(fileId: string): Promise<void> {
    const drive = await this.getDriveClient();
    await drive.files.delete({ fileId });
  }

  async getOrCreateFolder(name: string, parentId?: string): Promise<string> {
    const drive = await this.getDriveClient();

    const parentClause = parentId ? ` and '${parentId}' in parents` : "";
    const q = `mimeType='application/vnd.google-apps.folder' and name='${name}' and trashed=false${parentClause}`;

    const list = await drive.files.list({ q, fields: "files(id)", pageSize: 1 });
    if (list.data.files?.length) return list.data.files[0].id!;

    const requestBody: { name: string; mimeType: string; parents?: string[] } = {
      name,
      mimeType: "application/vnd.google-apps.folder",
    };
    if (parentId) requestBody.parents = [parentId];

    const folder = await drive.files.create({ requestBody, fields: "id" });
    return folder.data.id!;
  }
}
