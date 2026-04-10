export type EvolutionMessageType =
  | "conversation"
  | "extendedTextMessage"
  | "imageMessage"
  | "audioMessage"
  | "videoMessage"
  | "documentMessage"
  | "stickerMessage"
  | "locationMessage"
  | "reactionMessage"
  | (string & {});

export interface EvolutionMessageKey {
  id: string;
  fromMe: boolean;
  remoteJid: string;
}

export interface EvolutionMessage {
  conversation?: string;
  extendedTextMessage?: { text: string };
  imageMessage?: { caption?: string; mimetype?: string };
  audioMessage?: { seconds?: number; mimetype?: string };
  videoMessage?: { seconds?: number; caption?: string; mimetype?: string };
  documentMessage?: { fileName?: string; caption?: string; mimetype?: string };
  stickerMessage?: Record<string, unknown>;
  locationMessage?: {
    degreesLatitude?: number;
    degreesLongitude?: number;
    name?: string;
    address?: string;
  };
  reactionMessage?: { text?: string };
}

export interface EvolutionWebhookData {
  key: EvolutionMessageKey;
  pushName?: string;
  messageType: EvolutionMessageType;
  message: EvolutionMessage | null;
  messageTimestamp: number;
  instanceId?: string;
  source?: string;
}

export interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data: EvolutionWebhookData;
  destination?: string;
  date_time?: string;
  server_url?: string;
  apikey?: string;
}
