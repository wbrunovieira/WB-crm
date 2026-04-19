export interface SendTextResult {
  messageId: string;
  remoteJid: string;
  timestamp: number;
}

export interface SendMediaResult {
  messageId: string;
  remoteJid: string;
  timestamp: number;
}

export interface DownloadMediaResult {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

export interface CheckWhatsAppResult {
  exists: boolean;
  jid?: string;
  number?: string;
  name?: string;
}

export abstract class EvolutionApiPort {
  abstract sendText(to: string, text: string): Promise<SendTextResult>;
  abstract sendMedia(opts: {
    to: string;
    mediatype: string;
    media: string;
    caption?: string;
    fileName?: string;
    mimetype?: string;
  }): Promise<SendMediaResult>;
  abstract downloadMedia(payload: {
    key: { id: string; fromMe: boolean; remoteJid: string };
    message: Record<string, unknown> | null;
  }): Promise<DownloadMediaResult>;
  abstract checkNumber(phone: string): Promise<CheckWhatsAppResult>;
}
