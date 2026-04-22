import { Injectable, Logger } from "@nestjs/common";
import { google } from "googleapis";
import { PrismaService } from "@/infra/database/prisma.service";

export interface DriveFileDownload {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

@Injectable()
export class GoogleDriveDownloadService {
  private readonly logger = new Logger(GoogleDriveDownloadService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async getDriveClient() {
    const token = await this.prisma.googleToken.findFirst();
    if (!token) throw new Error("Google token not configured — connect via /api/google/auth");

    const now = new Date();
    let accessToken = token.accessToken;

    if (new Date(token.expiresAt) <= new Date(now.getTime() + 5 * 60 * 1000)) {
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

  async downloadFileWithMeta(fileId: string): Promise<DriveFileDownload> {
    const drive = await this.getDriveClient();

    const [metaRes, fileRes] = await Promise.all([
      drive.files.get({ fileId, fields: "mimeType,name" }),
      drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" }),
    ]);

    return {
      buffer: Buffer.from(fileRes.data as ArrayBuffer),
      mimeType: metaRes.data.mimeType ?? "application/octet-stream",
      fileName: metaRes.data.name ?? "arquivo",
    };
  }
}
