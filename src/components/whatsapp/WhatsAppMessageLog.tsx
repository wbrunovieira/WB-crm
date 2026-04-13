"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Download, FileText, Play } from "lucide-react";

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

/** Formato HH:MM de um Date no timezone local */
function toHHMM(date: Date): string {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
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
    return media ? { ...line, media } : line;
  });
}

// ─── Media rendering ──────────────────────────────────────────────────────────

function AudioPlayer({ messageId, transcript }: { messageId: string; transcript: string | null }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const src = `/api/evolution/media/${messageId}?inline=true`;

  return (
    <div className="mt-1 space-y-1">
      <audio
        controls
        preload="none"
        className="h-8 w-full max-w-[220px]"
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

function VideoPlayer({ messageId, transcript }: { messageId: string; transcript: string | null }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const src = `/api/evolution/media/${messageId}?inline=true`;

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

function ImagePreview({ messageId }: { messageId: string }) {
  const [open, setOpen] = useState(false);
  const src = `/api/evolution/media/${messageId}?inline=true`;
  const downloadSrc = `/api/evolution/media/${messageId}`;

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

function DocumentDownload({ messageId, label }: { messageId: string; label: string | null }) {
  const fileName = label?.replace("📄 ", "") ?? "documento";
  return (
    <a
      href={`/api/evolution/media/${messageId}`}
      download={fileName}
      onClick={(e) => e.stopPropagation()}
      className="mt-1 flex items-center gap-1.5 rounded border border-gray-200 bg-white/60 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
    >
      <FileText className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
      <span className="truncate max-w-[160px]">{fileName}</span>
      <Download className="h-3 w-3 text-gray-400 flex-shrink-0 ml-auto" />
    </a>
  );
}

function MediaContent({ media }: { media: WhatsAppMediaMessage }) {
  switch (media.messageType) {
    case "audioMessage":
      return <AudioPlayer messageId={media.id} transcript={media.mediaTranscriptText} />;
    case "videoMessage":
      return <VideoPlayer messageId={media.id} transcript={media.mediaTranscriptText} />;
    case "imageMessage":
      return <ImagePreview messageId={media.id} />;
    case "documentMessage":
      return <DocumentDownload messageId={media.id} label={media.mediaLabel} />;
    default:
      return null;
  }
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageRow({ line }: { line: ParsedLine }) {
  return (
    <div className={`flex items-start gap-2 ${line.fromMe ? "flex-row-reverse" : "flex-row"}`}>
      {/* Timestamp */}
      <span className="mt-0.5 shrink-0 text-[10px] text-gray-400 tabular-nums">
        {line.time}
      </span>

      {/* Bubble */}
      <div
        className={`max-w-[80%] rounded-lg px-3 py-1.5 text-xs leading-relaxed ${
          line.fromMe
            ? "rounded-tr-none bg-[#DCF8C6] text-gray-800"
            : "rounded-tl-none bg-white ring-1 ring-gray-200 text-gray-800"
        }`}
      >
        {!line.fromMe && (
          <span className="mb-0.5 block text-[10px] font-semibold text-[#128C7E]">
            {line.sender}
          </span>
        )}

        {/* Texto ou label da mídia */}
        <span className={line.media ? "text-gray-400 italic text-[10px]" : ""}>
          {line.text}
        </span>

        {/* Player / preview inline quando há mídia */}
        {line.media && <MediaContent media={line.media} />}
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
          <MessageRow key={i} line={line} />
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
