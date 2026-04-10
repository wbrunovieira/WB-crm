"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface WhatsAppMessageLogProps {
  description: string;
  /** Número de linhas visíveis antes de expandir */
  previewCount?: number;
}

interface ParsedLine {
  time: string;
  sender: string;
  text: string;
  fromMe: boolean;
}

function parseLine(raw: string): ParsedLine | null {
  // Formato: [HH:MM] Sender: texto
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

export default function WhatsAppMessageLog({
  description,
  previewCount = 3,
}: WhatsAppMessageLogProps) {
  const [expanded, setExpanded] = useState(false);

  const rawLines = description
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const lines = rawLines.map(parseLine);
  const totalLines = lines.length;
  const hasMore = totalLines > previewCount;
  const visibleLines = expanded ? lines : lines.slice(0, previewCount);
  const hiddenCount = totalLines - previewCount;

  return (
    <div className="mt-2 space-y-1">
      {visibleLines.map((line, i) =>
        line ? (
          <MessageRow key={i} line={line} />
        ) : (
          // Linha não parseável: exibe como texto simples
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
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Ver menos
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Ver mais ({hiddenCount} {hiddenCount === 1 ? "mensagem" : "mensagens"})
            </>
          )}
        </button>
      )}
    </div>
  );
}

function MessageRow({ line }: { line: ParsedLine }) {
  return (
    <div
      className={`flex items-start gap-2 ${line.fromMe ? "flex-row-reverse" : "flex-row"}`}
    >
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
        <span>{line.text}</span>
      </div>
    </div>
  );
}
