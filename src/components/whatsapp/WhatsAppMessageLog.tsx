"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Download, FileText, Play } from "lucide-react";
import { useSession } from "next-auth/react";
import { BACKEND_URL } from "@/lib/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WhatsAppMediaMessage {
  id: string;
  fromMe: boolean;
  pushName: string | null;
  timestamp: Date;
  messageType: string;
  mediaDriveId: string | null;
  mediaMimeType: string | null;
  mediaLabel: string | null;
  mediaTranscriptText: string | null;
}

interface WhatsAppMessageLogProps {
  description: string;
  /** Mensagens com mídia para enriquecer o log (opcional) */
  mediaMessages?: WhatsAppMediaMessage[];
  /** Número de linhas visíveis antes de expandir */
  previewCount?: number;
}

interface ParsedLine {
  time: string;
  sender: string;
  text: string;
  fromMe: boolean;
  /** Mensagem com mídia correspondente (matched por HH:MM + fromMe) */
  media?: WhatsAppMediaMessage;
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

function parseLine(raw: string): ParsedLine | null {
  const match = raw.match(/^\[(\d{2}:\d{2})\]\s+([^:]+):\s+(.+)$/);
  if (!match) return null;
  const [, time, sender, text] = match;
  return {
    time,
    sender: sender.trim(),
    text: text.trim(),
    fromMe: sender.trim() === "Você",
  };
}

/** Formato HH:MM em UTC — deve coincidir com o que o servidor grava na descrição */
function toHHMM(date: Date): string {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
}

/**
 * Tenta casar cada linha parseada com um WhatsAppMessage de mídia
 * baseando-se no HH:MM + fromMe. Tolerante a 1 minuto de diferença de relógio.
 */
function mergeWithMedia(
  lines: (ParsedLine | null)[],
  mediaMessages: WhatsAppMediaMessage[]
): (ParsedLine | null)[] {
  if (!mediaMessages.length) return lines;

  // Índice de mensagens de mídia por "HH:MM+fromMe"
  const mediaMap = new Map<string, WhatsAppMediaMessage>();
  for (const m of mediaMessages) {
    const key = `${toHHMM(new Date(m.timestamp))}_${m.fromMe}`;
    mediaMap.set(key, m);
  }

  return lines.map((line) => {
    if (!line) return line;
    const key = `${line.time}_${line.fromMe}`;
    const media = mediaMap.get(key);
    if (media) {
      mediaMap.delete(key); // consumir: cada media só casa com a primeira linha do mesmo minuto
      return { ...line, media };
    }
    return line;
  });
}

// ─── Media rendering ──────────────────────────────────────────────────────────

function AudioPlayer({ messageId, transcript, token }: { messageId: string; transcript: string | null; token: string }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const src = `${BACKEND_URL}/whatsapp/media/${messageId}?inline=true&token=${encodeURIComponent(token)}`;

  return (
    <div className="mt-2 space-y-2 min-w-[240px]">
      <audio
        controls
        preload="none"
        className="h-10 w-full"
        src={src}
        onClick={(e) => e.stopPropagation()}
      />
      {transcript && (
        <div>
          <button
            onClick={(e) => { e.stopPropagation(); setShowTranscript((v) => !v); }}
            className="flex items-center gap-1 text-xs font-medium text-[#128C7E] hover:text-[#075E54]"
          >
            {showTranscript ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showTranscript ? "Ocultar transcrição" : "Ver transcrição"}
          </button>
          {showTranscript && (
            <p className="mt-1 rounded-md bg-white/70 px-2.5 py-1.5 text-xs leading-snug text-gray-700 italic border border-gray-200">
              {transcript}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function VideoPlayer({ messageId, transcript, token }: { messageId: string; transcript: string | null; token: string }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const src = `${BACKEND_URL}/whatsapp/media/${messageId}?inline=true&token=${encodeURIComponent(token)}`;

  return (
    <div className="mt-1 space-y-1">
      <video
        controls
        preload="none"
        className="max-h-40 max-w-[220px] rounded"
        src={src}
        onClick={(e) => e.stopPropagation()}
      />
      {transcript && (
        <div>
          <button
            onClick={(e) => { e.stopPropagation(); setShowTranscript((v) => !v); }}
            className="flex items-center gap-1 text-[10px] text-[#128C7E] hover:text-[#075E54]"
          >
            {showTranscript ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showTranscript ? "Ocultar transcrição" : "Ver transcrição"}
          </button>
          {showTranscript && (
            <p className="mt-0.5 rounded bg-white/60 px-2 py-1 text-[10px] leading-snug text-gray-700 italic border border-gray-200">
              {transcript}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ImagePreview({ messageId, token }: { messageId: string; token: string }) {
  const [open, setOpen] = useState(false);
  const src = `${BACKEND_URL}/whatsapp/media/${messageId}?inline=true&token=${encodeURIComponent(token)}`;
  const downloadSrc = `${BACKEND_URL}/whatsapp/media/${messageId}?token=${encodeURIComponent(token)}`;

  return (
    <div className="mt-1">
      {/* Thumbnail */}
      <div className="relative inline-block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Imagem"
          className="max-h-32 max-w-[180px] cursor-pointer rounded object-cover"
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        />
        <a
          href={downloadSrc}
          download
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-1 right-1 rounded bg-black/50 p-0.5 text-white hover:bg-black/70"
          title="Baixar"
        >
          <Download className="h-3 w-3" />
        </a>
      </div>

      {/* Lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="Imagem ampliada"
            className="max-h-[90vh] max-w-[90vw] rounded object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function DocumentDownload({ messageId, label, token }: { messageId: string; label: string | null; token: string }) {
  const fileName = label?.replace("📄 ", "") ?? "documento";
  const inlineSrc = `${BACKEND_URL}/whatsapp/media/${messageId}?inline=true&token=${encodeURIComponent(token)}`;
  const downloadSrc = `${BACKEND_URL}/whatsapp/media/${messageId}?token=${encodeURIComponent(token)}`;

  return (
    <div className="mt-2 min-w-[220px] rounded border border-gray-200 bg-white/60 overflow-hidden">
      {/* Header clicável — abre em nova aba para preview */}
      <a
        href={inlineSrc}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors"
      >
        <FileText className="h-5 w-5 text-red-500 flex-shrink-0" />
        <span className="truncate text-xs font-medium text-gray-800 flex-1">{fileName}</span>
      </a>
      {/* Rodapé com botão de download explícito */}
      <div className="border-t border-gray-200 px-3 py-1.5 flex justify-end">
        <a
          href={downloadSrc}
          download={fileName}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-[10px] text-[#128C7E] hover:text-[#075E54]"
        >
          <Download className="h-3 w-3" />
          Baixar
        </a>
      </div>
    </div>
  );
}

function MediaContent({ media, token }: { media: WhatsAppMediaMessage; token: string }) {
  switch (media.messageType) {
    case "audioMessage":
      return <AudioPlayer messageId={media.id} transcript={media.mediaTranscriptText} token={token} />;
    case "videoMessage":
      return <VideoPlayer messageId={media.id} transcript={media.mediaTranscriptText} token={token} />;
    case "imageMessage":
      return <ImagePreview messageId={media.id} token={token} />;
    case "documentMessage":
      return <DocumentDownload messageId={media.id} label={media.mediaLabel} token={token} />;
    default:
      return null;
  }
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function Avatar({ name, fromMe }: { name: string; fromMe: boolean }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white ${
        fromMe ? "bg-[#128C7E]" : "bg-gray-400"
      }`}
    >
      {initials}
    </div>
  );
}

function MessageRow({ line, token }: { line: ParsedLine; token: string }) {
  return (
    <div className={`flex items-end gap-1.5 ${line.fromMe ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <Avatar name={line.sender} fromMe={line.fromMe} />

      {/* Bubble + meta */}
      <div className={`flex max-w-[85%] flex-col gap-0.5 ${line.fromMe ? "items-end" : "items-start"}`}>
        {/* Sender name */}
        <span className={`text-[10px] font-semibold ${line.fromMe ? "text-[#128C7E]" : "text-gray-500"}`}>
          {line.sender}
        </span>

        {/* Bubble */}
        <div
          className={`w-full rounded-lg px-3 py-2 text-xs leading-relaxed ${
            line.fromMe
              ? "rounded-tr-none bg-[#DCF8C6] text-gray-800"
              : "rounded-tl-none bg-white ring-1 ring-gray-200 text-gray-800"
          }`}
        >
          {/* Texto ou label da mídia */}
          <span className={line.media ? "text-gray-500 italic text-[10px]" : ""}>
            {line.text}
          </span>

          {/* Player / preview inline quando há mídia */}
          {line.media && <MediaContent media={line.media} token={token} />}
        </div>

        {/* Timestamp */}
        <span className="text-[9px] text-gray-400 tabular-nums">
          {line.time}
        </span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function WhatsAppMessageLog({
  description,
  mediaMessages = [],
  previewCount = 3,
}: WhatsAppMessageLogProps) {
  const [expanded, setExpanded] = useState(false);
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";

  const rawLines = description
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const parsedLines = rawLines.map(parseLine);
  const enrichedLines = mergeWithMedia(parsedLines, mediaMessages);

  const totalLines = enrichedLines.length;
  const hasMore = totalLines > previewCount;
  const visibleLines = expanded ? enrichedLines : enrichedLines.slice(0, previewCount);
  const hiddenCount = totalLines - previewCount;

  return (
    <div className="mt-2 space-y-1">
      {visibleLines.map((line, i) =>
        line ? (
          <MessageRow key={i} line={line} token={token} />
        ) : (
          <p key={i} className="text-xs text-gray-500 italic">
            {rawLines[i]}
          </p>
        )
      )}

      {hasMore && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 flex items-center gap-1 text-xs font-medium text-[#128C7E] hover:text-[#075E54] transition-colors"
        >
          {expanded ? (
            <><ChevronUp className="h-3.5 w-3.5" />Ver menos</>
          ) : (
            <><ChevronDown className="h-3.5 w-3.5" />Ver mais ({hiddenCount} {hiddenCount === 1 ? "mensagem" : "mensagens"})</>
          )}
        </button>
      )}
    </div>
  );
}
