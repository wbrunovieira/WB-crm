const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL ?? "http://localhost:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY ?? "";
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE ?? "wbdigital";

interface SendResponse {
  key: { id: string; fromMe: boolean; remoteJid: string };
  message: Record<string, unknown>;
  messageTimestamp: number;
  status: string;
}

async function evolutionPost(path: string, body: unknown): Promise<SendResponse> {
  const res = await fetch(
    `${EVOLUTION_API_URL}${path}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVOLUTION_API_KEY,
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Evolution API error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function sendTextMessage(
  to: string,
  text: string
): Promise<SendResponse> {
  return evolutionPost(`/message/sendText/${EVOLUTION_INSTANCE}`, { number: to, text });
}

export type MediaType = "image" | "video" | "document" | "audio";

export interface SendMediaOptions {
  to: string;
  mediatype: MediaType;
  /** Base64 string (com prefixo data:... ou sem) ou URL pública */
  media: string;
  caption?: string;
  /** Nome do arquivo — obrigatório para documentos */
  fileName?: string;
  mimetype?: string;
}

export async function sendMediaMessage(opts: SendMediaOptions): Promise<SendResponse> {
  return evolutionPost(`/message/sendMedia/${EVOLUTION_INSTANCE}`, {
    number: opts.to,
    mediatype: opts.mediatype,
    media: opts.media,
    caption: opts.caption ?? "",
    fileName: opts.fileName,
    mimetype: opts.mimetype,
  });
}
