import { Injectable, Logger } from "@nestjs/common";
import {
  EvolutionApiPort,
  SendTextResult,
  SendMediaResult,
  DownloadMediaResult,
  CheckWhatsAppResult,
} from "../application/ports/evolution-api.port";

@Injectable()
export class EvolutionApiClient extends EvolutionApiPort {
  private readonly logger = new Logger(EvolutionApiClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly instance: string;

  constructor() {
    super();
    this.baseUrl = process.env.EVOLUTION_API_URL ?? "http://localhost:8080";
    this.apiKey = process.env.EVOLUTION_API_KEY ?? "";
    this.instance = process.env.EVOLUTION_INSTANCE ?? "wbdigital";
  }

  // --- Static helpers ---

  static extractPhoneFromJid(jid: string): string {
    const atIndex = jid.indexOf("@");
    if (atIndex === -1) return jid.replace(/\D/g, "");
    return jid.slice(0, atIndex).replace(/\D/g, "");
  }

  static isGroupJid(jid: string): boolean {
    return jid.endsWith("@g.us");
  }

  // --- Private helpers ---

  private async post<T = unknown>(path: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Evolution API error ${res.status} on ${path}: ${text}`);
    }

    return res.json() as Promise<T>;
  }

  // --- Port implementation ---

  async sendText(to: string, text: string): Promise<SendTextResult> {
    const data = await this.post<{
      key: { id: string; remoteJid: string };
      messageTimestamp: number;
    }>(`/message/sendText/${this.instance}`, { number: to, text });

    return {
      messageId: data.key.id,
      remoteJid: data.key.remoteJid,
      timestamp: data.messageTimestamp,
    };
  }

  async sendMedia(opts: {
    to: string;
    mediatype: string;
    media: string;
    caption?: string;
    fileName?: string;
    mimetype?: string;
  }): Promise<SendMediaResult> {
    const data = await this.post<{
      key: { id: string; remoteJid: string };
      messageTimestamp: number;
    }>(`/message/sendMedia/${this.instance}`, {
      number: opts.to,
      mediatype: opts.mediatype,
      media: opts.media,
      caption: opts.caption ?? "",
      fileName: opts.fileName,
      mimetype: opts.mimetype,
    });

    return {
      messageId: data.key.id,
      remoteJid: data.key.remoteJid,
      timestamp: data.messageTimestamp,
    };
  }

  async downloadMedia(payload: {
    key: { id: string; fromMe: boolean; remoteJid: string };
    message: Record<string, unknown> | null;
  }): Promise<DownloadMediaResult> {
    const data = await this.post<{
      base64: string;
      mimetype?: string;
      mimeType?: string;
      fileName?: string;
    }>(`/chat/getBase64FromMediaMessage/${this.instance}`, { message: payload });

    const base64 = data.base64;
    const mimeType = data.mimetype ?? data.mimeType ?? "application/octet-stream";
    const fileName = data.fileName ?? "media";

    // Strip optional data URI prefix
    const base64Data = base64.includes(",") ? base64.split(",")[1] : base64;
    const buffer = Buffer.from(base64Data, "base64");

    return { buffer, mimeType, fileName };
  }

  async checkNumber(phone: string): Promise<CheckWhatsAppResult> {
    const digits = phone.replace(/\D/g, "");
    const data = await this.post<Array<{
      exists: boolean;
      jid?: string;
      number?: string;
      name?: string;
    }>>(`/chat/whatsappNumbers/${this.instance}`, { numbers: [digits] });

    const result = Array.isArray(data) ? data[0] : (data as CheckWhatsAppResult);
    return {
      exists: result?.exists ?? false,
      jid: result?.jid,
      number: result?.number ?? digits,
      name: result?.name || undefined,
    };
  }
}
