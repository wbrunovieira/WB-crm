"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { parseConversa } from "./parse-conversa";
import {
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Mic,
  Pause,
  Play,
  Video,
} from "lucide-react";
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

/**
 * HH:MM possíveis para um mesmo instante, porque a descrição tem DUAS ERAS de carimbo.
 *
 * Até 14/09/2026 o container do backend rodava em UTC e escrevia "[15:13]"; depois da correção
 * do fuso passou a escrever "[12:13]" para o mesmo instante. O timestamp da mídia no banco é
 * sempre UTC. Comparar com um fuso só conserta uma era e quebra a outra — e conversas antigas
 * ficariam sem áudio para sempre.
 */
function horasPossiveis(date: Date): string[] {
  const fmt = (tz: string) =>
    date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: tz });
  const brasilia = fmt("America/Sao_Paulo");
  const utc = fmt("UTC");
  return brasilia === utc ? [brasilia] : [brasilia, utc];
}

/**
 * Tenta casar cada linha parseada com um WhatsAppMessage de mídia
 * baseando-se no HH:MM + fromMe. Tolerante a 1 minuto de diferença de relógio.
 */
function mergeWithMedia(
  lines: ParsedLine[],
  mediaMessages: WhatsAppMediaMessage[]
): ParsedLine[] {
  if (!mediaMessages.length) return lines;

  // Uma entrada por leitura de fuso: a linha casa com qualquer uma das duas.
  const mediaMap = new Map<string, WhatsAppMediaMessage>();
  for (const m of mediaMessages) {
    for (const hora of horasPossiveis(new Date(m.timestamp))) {
      mediaMap.set(`${hora}_${m.fromMe}`, m);
    }
  }

  return lines.map((line) => {
    if (!line) return line;
    const key = `${line.time}_${line.fromMe}`;
    const media = mediaMap.get(key);
    if (media) {
      // Remove TODAS as chaves daquela mídia, senão a segunda leitura de fuso casaria de novo
      // com outra linha e o mesmo áudio apareceria duas vezes.
      for (const hora of horasPossiveis(new Date(media.timestamp))) {
        mediaMap.delete(`${hora}_${media.fromMe}`);
      }
      return { ...line, media };
    }
    return line;
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (!isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Transcript block ─────────────────────────────────────────────────────────

function TranscriptToggle({
  transcript,
  fromMe,
}: {
  transcript: string;
  fromMe: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="mt-2">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShow((v) => !v);
        }}
        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
          fromMe
            ? "bg-[#25D366]/20 text-[#075E54] hover:bg-[#25D366]/30"
            : "bg-[#128C7E]/10 text-[#128C7E] hover:bg-[#128C7E]/20"
        }`}
      >
        <FileText className="h-3 w-3" />
        {show ? "Ocultar transcrição" : "Ver transcrição"}
        {show ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>
      {show && (
        <p className="mt-1.5 rounded-lg border border-[#25D366]/30 bg-white/80 px-3 py-2 text-[11px] leading-relaxed text-gray-700 italic">
          {transcript}
        </p>
      )}
    </div>
  );
}

// ─── AudioPlayer ──────────────────────────────────────────────────────────────

function AudioPlayer({
  messageId,
  transcript,
  token,
  fromMe,
}: {
  messageId: string;
  transcript: string | null;
  token: string;
  fromMe: boolean;
}) {
  const src = `${BACKEND_URL}/whatsapp/media/${messageId}?inline=true&token=${encodeURIComponent(token)}`;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const el = audioRef.current;
      if (!el) return;
      if (playing) {
        el.pause();
      } else {
        el.play();
      }
    },
    [playing]
  );

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => { setPlaying(false); setCurrent(0); };
    const onTimeUpdate = () => setCurrent(el.currentTime);
    const onLoadedMetadata = () => setDuration(el.duration);

    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("loadedmetadata", onLoadedMetadata);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, []);

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const el = audioRef.current;
    if (!el || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    el.currentTime = ratio * duration;
  };

  return (
    <div className="mt-2 min-w-[220px]">
      {/* hidden real audio element */}
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Player row */}
      <div className="flex items-center gap-2">
        {/* Play/Pause button */}
        <button
          onClick={toggle}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm transition-colors hover:bg-[#128C7E] active:scale-95"
        >
          {playing ? (
            <Pause className="h-3.5 w-3.5 fill-white" />
          ) : (
            <Play className="h-3.5 w-3.5 translate-x-px fill-white" />
          )}
        </button>

        {/* Progress + time */}
        <div className="flex flex-1 flex-col gap-1">
          {/* Progress bar */}
          <div
            className="relative h-1.5 w-full cursor-pointer rounded-full bg-black/10"
            onClick={seek}
          >
            <div
              className="h-full rounded-full bg-[#25D366] transition-[width] duration-100"
              style={{ width: `${progress}%` }}
            />
            {/* Scrubber dot */}
            <div
              className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-[#25D366] shadow -translate-x-1/2 transition-[left] duration-100"
              style={{ left: `${progress}%` }}
            />
          </div>

          {/* Duration */}
          <div className="flex justify-between text-[9px] tabular-nums text-gray-500">
            <span>{formatDuration(current)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Mic icon */}
        <Mic className="h-4 w-4 shrink-0 text-[#25D366]" />
      </div>

      {/* Transcript */}
      {transcript && <TranscriptToggle transcript={transcript} fromMe={fromMe} />}
    </div>
  );
}

// ─── VideoPlayer ──────────────────────────────────────────────────────────────

function VideoPlayer({
  messageId,
  transcript,
  token,
  fromMe,
}: {
  messageId: string;
  transcript: string | null;
  token: string;
  fromMe: boolean;
}) {
  const src = `${BACKEND_URL}/whatsapp/media/${messageId}?inline=true&token=${encodeURIComponent(token)}`;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showNative, setShowNative] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => { setPlaying(false); setCurrent(0); };
    const onTimeUpdate = () => setCurrent(el.currentTime);
    const onLoadedMetadata = () => setDuration(el.duration);

    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("loadedmetadata", onLoadedMetadata);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, []);

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const el = videoRef.current;
    if (!el || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    el.currentTime = ratio * duration;
  };

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const el = videoRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      setShowNative(true);
      el.play();
    }
  };

  return (
    <div className="mt-2 min-w-[220px] space-y-2">
      {/* Video element — hidden until playing */}
      <video
        ref={videoRef}
        src={src}
        preload="metadata"
        className={`max-h-44 w-full rounded-lg object-cover transition-all duration-200 ${
          showNative ? "block" : "hidden"
        }`}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Custom controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggle}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm transition-colors hover:bg-[#128C7E] active:scale-95"
        >
          {playing ? (
            <Pause className="h-3.5 w-3.5 fill-white" />
          ) : (
            <Play className="h-3.5 w-3.5 translate-x-px fill-white" />
          )}
        </button>

        <div className="flex flex-1 flex-col gap-1">
          <div
            className="relative h-1.5 w-full cursor-pointer rounded-full bg-black/10"
            onClick={seek}
          >
            <div
              className="h-full rounded-full bg-[#25D366] transition-[width] duration-100"
              style={{ width: `${progress}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-[#25D366] shadow -translate-x-1/2 transition-[left] duration-100"
              style={{ left: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] tabular-nums text-gray-500">
            <span>{formatDuration(current)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        <Video className="h-4 w-4 shrink-0 text-[#25D366]" />
      </div>

      {transcript && <TranscriptToggle transcript={transcript} fromMe={fromMe} />}
    </div>
  );
}

// ─── ImagePreview ─────────────────────────────────────────────────────────────

function ImagePreview({ messageId, token }: { messageId: string; token: string }) {
  const [open, setOpen] = useState(false);
  const src = `${BACKEND_URL}/whatsapp/media/${messageId}?inline=true&token=${encodeURIComponent(token)}`;
  const downloadSrc = `${BACKEND_URL}/whatsapp/media/${messageId}?token=${encodeURIComponent(token)}`;

  return (
    <div className="mt-1.5">
      <div className="relative inline-block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Imagem"
          className="max-h-36 max-w-[200px] cursor-pointer rounded-lg object-cover shadow-sm transition-opacity hover:opacity-90"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
        />
        <a
          href={downloadSrc}
          download
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-1.5 right-1.5 rounded-full bg-black/50 p-1 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
          title="Baixar"
        >
          <Download className="h-3 w-3" />
        </a>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="Imagem ampliada"
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

// ─── DocumentDownload ─────────────────────────────────────────────────────────

function DocumentDownload({
  messageId,
  label,
  token,
}: {
  messageId: string;
  label: string | null;
  token: string;
}) {
  const fileName = label?.replace("📄 ", "") ?? "documento";
  const inlineSrc = `${BACKEND_URL}/whatsapp/media/${messageId}?inline=true&token=${encodeURIComponent(token)}`;
  const downloadSrc = `${BACKEND_URL}/whatsapp/media/${messageId}?token=${encodeURIComponent(token)}`;

  return (
    <div className="mt-2 min-w-[220px] overflow-hidden rounded-xl border border-gray-200 bg-white/70 shadow-sm">
      <a
        href={inlineSrc}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-gray-50"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50">
          <FileText className="h-4 w-4 text-red-500" />
        </div>
        <span className="flex-1 truncate text-xs font-medium text-gray-800">
          {fileName}
        </span>
      </a>
      <div className="border-t border-gray-100 px-3 py-1.5 flex justify-end">
        <a
          href={downloadSrc}
          download={fileName}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-[10px] font-medium text-[#128C7E] transition-colors hover:text-[#075E54]"
        >
          <Download className="h-3 w-3" />
          Baixar
        </a>
      </div>
    </div>
  );
}

// ─── MediaContent ─────────────────────────────────────────────────────────────

function MediaContent({
  media,
  token,
  fromMe,
}: {
  media: WhatsAppMediaMessage;
  token: string;
  fromMe: boolean;
}) {
  switch (media.messageType) {
    case "audioMessage":
      return (
        <AudioPlayer
          messageId={media.id}
          transcript={media.mediaTranscriptText}
          token={token}
          fromMe={fromMe}
        />
      );
    case "videoMessage":
      return (
        <VideoPlayer
          messageId={media.id}
          transcript={media.mediaTranscriptText}
          token={token}
          fromMe={fromMe}
        />
      );
    case "imageMessage":
      return <ImagePreview messageId={media.id} token={token} />;
    case "documentMessage":
      return (
        <DocumentDownload
          messageId={media.id}
          label={media.mediaLabel}
          token={token}
        />
      );
    default:
      return null;
  }
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, fromMe }: { name: string; fromMe: boolean }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white shadow-sm ring-2 ring-white/60 ${
        fromMe ? "bg-[#128C7E]" : "bg-gray-400"
      }`}
    >
      {initials}
    </div>
  );
}

// ─── AudioIndicator — ícone no label da bubble ────────────────────────────────

function AudioBubbleLabel({ fromMe }: { fromMe: boolean }) {
  return (
    <span
      className={`flex items-center gap-1 text-[11px] font-medium ${
        fromMe ? "text-[#075E54]" : "text-gray-500"
      }`}
    >
      <Mic className="h-3.5 w-3.5" />
      Áudio
    </span>
  );
}

// ─── MessageRow ───────────────────────────────────────────────────────────────

/** Returns true when the text is meaningless and should be hidden */
function isMeaninglessText(text: string): boolean {
  const t = text.toLowerCase().trim();
  return (
    t === "(mensagem sem texto)" ||
    t === "(audio)" ||
    t === "(vídeo)" ||
    t === "(video)" ||
    t === "(imagem)" ||
    t === "(documento)"
  );
}

function MessageRow({ line, token }: { line: ParsedLine; token: string }) {
  const isAudio = line.media?.messageType === "audioMessage";
  const isVideo = line.media?.messageType === "videoMessage";
  const hasMedia = !!line.media;
  const hideText = hasMedia && isMeaninglessText(line.text);

  return (
    <div
      className={`flex items-end gap-2 ${line.fromMe ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <Avatar name={line.sender} fromMe={line.fromMe} />

      {/* Bubble column */}
      <div
        className={`flex max-w-[82%] flex-col gap-0.5 ${
          line.fromMe ? "items-end" : "items-start"
        }`}
      >
        {/* Sender name */}
        <span
          className={`px-1 text-[10px] font-semibold ${
            line.fromMe ? "text-[#128C7E]" : "text-gray-500"
          }`}
        >
          {line.sender}
        </span>

        {/* Bubble */}
        <div
          // Cor no style, nao em classe: o globals.css força `.text-gray-*` para cinza CLARO com
          // !important (tema escuro global), e o balao tem fundo claro — texto claro sobre fundo
          // claro ficava ILEGÍVEL. style inline vence !important de classe.
          style={{ color: "#111827" }}
          className={`relative w-full whitespace-pre-wrap rounded-2xl px-3 pb-5 pt-2.5 text-xs leading-relaxed shadow-sm ${
            line.fromMe
              ? "rounded-tr-sm bg-[#DCF8C6]"
              : "rounded-tl-sm bg-white ring-1 ring-gray-200"
          }`}
        >
          {/* Text content */}
          {isAudio ? (
            <AudioBubbleLabel fromMe={line.fromMe} />
          ) : isVideo ? (
            <span
              className={`flex items-center gap-1 text-[11px] font-medium ${
                line.fromMe ? "text-[#075E54]" : "text-gray-500"
              }`}
            >
              <Video className="h-3.5 w-3.5" />
              Vídeo
            </span>
          ) : !hideText ? (
            <span>{line.text}</span>
          ) : null}

          {/* Media player / preview */}
          {hasMedia && (
            <MediaContent
              media={line.media!}
              token={token}
              fromMe={line.fromMe}
            />
          )}

          {/* Timestamp — WhatsApp style: bottom-right inside bubble */}
          <span className="absolute bottom-1.5 right-2.5 text-[9px] tabular-nums text-gray-400 select-none">
            {line.time}
          </span>
        </div>
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

  // parseConversa junta linhas de continuacao ao balao anterior: transcricao de audio vem com
  // quebras, e o parser antigo devolvia null para elas — a continuacao aparecia solta na tela.
  const parsedLines = parseConversa(description);
  const enrichedLines = mergeWithMedia(parsedLines, mediaMessages);

  const totalLines = enrichedLines.length;
  const hasMore = totalLines > previewCount;
  const visibleLines = expanded ? enrichedLines : enrichedLines.slice(0, previewCount);
  const hiddenCount = totalLines - previewCount;

  return (
    <div className="mt-2 space-y-2">
      {/* Nao ha mais linha nula: parseConversa junta continuacao ao balao anterior. Este ramo
          era o que renderizava a segunda linha de uma transcricao SOLTA, fora do balao. */}
      {visibleLines.map((line, i) => (
        <MessageRow key={i} line={line} token={token} />
      ))}

      {hasMore && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 flex items-center gap-1 text-xs font-semibold text-[#128C7E] transition-colors hover:text-[#075E54]"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Ver menos
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Ver mais ({hiddenCount}{" "}
              {hiddenCount === 1 ? "mensagem" : "mensagens"})
            </>
          )}
        </button>
      )}
    </div>
  );
}
