import { parsePhoneNumber, isValidPhoneNumber } from "libphonenumber-js";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL ?? "http://localhost:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY ?? "";
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE ?? "wbdigital";

/** Converte qualquer formato de telefone para E.164 (+5511...).
 *  Default country: BR. Números com DDI explícito (+1, +351, etc.) são respeitados.
 *  Lança se o número for inválido mesmo com fallback.
 */
export function toE164(phone: string, defaultCountry = "BR"): string {
  try {
    const parsed = parsePhoneNumber(phone, defaultCountry as never);
    if (parsed?.isValid()) return parsed.number;
  } catch {
    // segue para o fallback
  }
  // Fallback: dígitos puros com DDI explícito (ex: "5511999998888")
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10) return `+${digits}`;
  throw new Error(`Número de telefone inválido: ${phone}`);
}

interface SendResponse {
  key: { id: string; fromMe: boolean; remoteJid: string };
  message: Record<string, unknown>;
  messageTimestamp: number;
  status: string;
}

async function evolutionPost<T = SendResponse>(path: string, body: unknown): Promise<T> {
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

  return res.json() as Promise<T>;
}

export interface CheckWhatsAppResult {
  exists: boolean;
  jid?: string;
  number?: string;
  name?: string;
}

/**
 * Verifica se um número de telefone tem WhatsApp ativo.
 * Aceita formato com ou sem DDI (ex: "11999998888" ou "+5511999998888").
 * Endpoint: POST /chat/whatsappNumbers/{instance}
 * Resposta: [{ jid, exists, number, name }]
 */
export async function checkWhatsAppNumber(phone: string): Promise<CheckWhatsAppResult> {
  // Normaliza para E.164 (ex: "(11) 3851-4000" → "+551138514000")
  const e164 = toE164(phone);
  // A Evolution API aceita o número sem o "+" inicial
  const digits = e164.replace(/^\+/, "");

  const data = await evolutionPost<Array<{ exists: boolean; jid?: string; number?: string; name?: string }>>(
    `/chat/whatsappNumbers/${EVOLUTION_INSTANCE}`,
    { numbers: [digits] }
  );

  // A API retorna um array, pegamos o primeiro resultado
  const result = Array.isArray(data) ? data[0] : (data as CheckWhatsAppResult);
  return {
    exists: result?.exists ?? false,
    jid: result?.jid,
    number: result?.number ?? digits,
    name: result?.name || undefined,
  };
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

export interface DownloadMediaResult {
  base64: string;
  mimeType: string;
  fileName: string;
}

/**
 * Baixa a mídia de uma mensagem via Evolution API.
 * Retorna base64 + mimeType + fileName.
 */
export async function downloadMediaMessage(payload: {
  key: { id: string; fromMe: boolean; remoteJid: string };
  message: Record<string, unknown> | null;
}): Promise<DownloadMediaResult> {
  const res = await fetch(
    `${EVOLUTION_API_URL}/chat/getBase64FromMediaMessage/${EVOLUTION_INSTANCE}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVOLUTION_API_KEY,
      },
      body: JSON.stringify({ message: payload }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Evolution media download error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return {
    base64: data.base64 as string,
    mimeType: (data.mimetype ?? data.mimeType ?? "application/octet-stream") as string,
    fileName: (data.fileName ?? "media") as string,
  };
}
