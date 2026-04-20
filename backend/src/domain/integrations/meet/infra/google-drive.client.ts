import { Injectable, Logger } from "@nestjs/common";
import { google } from "googleapis";
import { PrismaService } from "@/infra/database/prisma.service";
import { GoogleDrivePort, DriveFile } from "../application/ports/google-drive.port";

@Injectable()
export class GoogleDriveClient extends GoogleDrivePort {
  private readonly logger = new Logger(GoogleDriveClient.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private async getDriveClient() {
    const token = await this.prisma.googleToken.findFirst();
    if (!token) throw new Error("Google token not configured — connect via /api/google/auth");

    const now = new Date();
    const expiresAt = new Date(token.expiresAt);
    let accessToken = token.accessToken;

    if (expiresAt <= new Date(now.getTime() + 5 * 60 * 1000)) {
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
        data: {
          accessToken,
          expiresAt: new Date(credentials.expiry_date!),
        },
      });
    }

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );
    auth.setCredentials({ access_token: accessToken });
    return google.drive({ version: "v3", auth });
  }

  async findMeetRecordingsFolder(): Promise<string | null> {
    const drive = await this.getDriveClient();
    const res = await drive.files.list({
      q: `name = 'Meet Recordings' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id)",
      pageSize: 1,
    });
    return res.data.files?.[0]?.id ?? null;
  }

  async listFilesInFolder(folderId: string, sinceIso: string): Promise<DriveFile[]> {
    const drive = await this.getDriveClient();
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false and createdTime > '${sinceIso}'`,
      fields: "files(id, name, mimeType, webViewLink, createdTime)",
      orderBy: "createdTime desc",
      pageSize: 50,
    });
    return (res.data.files ?? []).map((f) => ({
      fileId: f.id!,
      name: f.name!,
      mimeType: f.mimeType!,
      webViewLink: f.webViewLink!,
      createdAt: new Date(f.createdTime!),
    }));
  }

  async exportDocText(fileId: string): Promise<string> {
    const drive = await this.getDriveClient();
    const res = await drive.files.export(
      { fileId, mimeType: "text/plain" },
      { responseType: "arraybuffer" },
    );
    return Buffer.from(res.data as ArrayBuffer).toString("utf-8").trim();
  }

  async downloadFile(fileId: string): Promise<Buffer> {
    const drive = await this.getDriveClient();
    const res = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" },
    );
    return Buffer.from(res.data as ArrayBuffer);
  }
}
