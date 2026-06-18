"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { X, Send, Loader2, Smile, Paperclip, FileText, ChevronDown, ChevronUp, Mic, Square, Maximize2, Minimize2 } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { apiFetch, BACKEND_URL } from "@/lib/api-client";

// ---------------------------------------------------------------------------
// Emoji picker (curado — sem dependência externa)
// ---------------------------------------------------------------------------

const EMOJI_CATEGORIES = [
  {
    label: "Recentes",
    emojis: ["😊", "👍", "🙏", "❤️", "🎉", "✅", "👋", "🔥", "💪", "😄"],
  },
  {
    label: "Rostos",
    emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🫡", "🤐", "🤨", "😐", "😑", "😶", "🫥", "😏", "😒", "🙄", "😬", "🤥", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "🥸", "😎", "🤓", "🧐"],
  },
  {
    label: "Gestos",
    emojis: ["👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🫰", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "🫵", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "🫶", "🤝", "🙏", "✍️", "💅", "🤳"],
  },
  {
    label: "Símbolos",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "❤️‍🔥", "✅", "❌", "⭐", "🌟", "💫", "⚡", "🔥", "🎉", "🎊", "🎯", "🏆", "💯", "🆗", "🆙", "🆕", "🔔", "📢", "💬", "💭", "🗓️", "📅", "⏰", "🔑", "💡", "🔍", "📊", "📈", "📉", "💰", "💳", "🏷️"],
  },
  {
    label: "Negócios",
    emojis: ["💼", "📋", "📌", "📎", "✏️", "📝", "📄", "📃", "📑", "📊", "📈", "📉", "🗃️", "📬", "📭", "📮", "📯", "📞", "📟", "📠", "💻", "🖥️", "🖨️", "⌨️", "🖱️", "🖲️", "💾", "💿", "📀", "📷", "📸", "📹", "🎥"],
  },
];

function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-lg">
      <div className="flex gap-1 border-b border-gray-100 px-2 pt-2">
        {EMOJI_CATEGORIES.map((cat, i) => (
          <button
            key={cat.label}
            onClick={() => setActiveCategory(i)}
            className={`rounded-t px-2 py-1 text-xs font-medium transition-colors ${
              activeCategory === i
                ? "border-b-2 border-[#25D366] text-[#25D366]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-8 gap-0.5 p-2 max-h-36 overflow-y-auto">
        {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSelect(emoji)}
            className="flex h-8 w-8 items-center justify-center rounded text-lg hover:bg-gray-100 transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMediatype(mime: string): "image" | "video" | "document" | "audio" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "document";
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function pickMimeType(): string {
  const candidates = [
    "audio/ogg;codecs=opus",
    "audio/webm;codecs=opus",
    "audio/webm",
  ];
  for (const mime of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return "";
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RecordingState = "idle" | "requesting" | "recording" | "preview";

type Template = {
  id: string;
  name: string;
  text: string;
  category: string | null;
};

interface WhatsAppSendModalProps {
  to: string;
  name: string;
  onClose: () => void;
  leadId?: string;
  contactId?: string;
  organizationId?: string;
}

// ---------------------------------------------------------------------------
// Modal principal
// ---------------------------------------------------------------------------

export default function WhatsAppSendModal({ to, name, onClose, leadId, contactId, organizationId }: WhatsAppSendModalProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Emoji
  const [showEmoji, setShowEmoji] = useState(false);

  // Anexo de arquivo
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachPreview, setAttachPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gravação de áudio PTT
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioMime, setAudioMime] = useState("audio/ogg");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Templates
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ESC fecha tudo
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showEmoji) { setShowEmoji(false); return; }
        if (showTemplates) { setShowTemplates(false); return; }
        if (recordingState === "recording") { stopRecording(); return; }
        if (recordingState === "preview") { discardRecording(); return; }
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, showEmoji, showTemplates, recordingState]);

  // Carregar templates ao abrir o painel (lazy)
  const handleOpenTemplates = useCallback(async () => {
    setShowTemplates((v) => !v);
    if (!templatesLoaded) {
      const data = await apiFetch<{ id: string; name: string; text: string; category: string | null; active: boolean; createdAt: Date }[]>("/whatsapp/templates?onlyActive=true", token);
      setTemplates(data);
      setTemplatesLoaded(true);
    }
  }, [templatesLoaded, token]);

  // Inserir emoji no cursor
  function insertEmoji(emoji: string) {
    const ta = textareaRef.current;
    if (!ta) { setText((t) => t + emoji); return; }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newText = text.slice(0, start) + emoji + text.slice(end);
    setText(newText);
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + emoji.length;
    }, 0);
    setShowEmoji(false);
  }

  function applyTemplate(t: Template) {
    setText(t.text);
    setShowTemplates(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  // Selecionar arquivo
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachment(file);
    if (file.type.startsWith("image/")) {
      setAttachPreview(URL.createObjectURL(file));
    } else {
      setAttachPreview(null);
    }
    e.target.value = "";
  }

  function removeAttachment() {
    setAttachment(null);
    setAttachPreview(null);
  }

  // ---------------------------------------------------------------------------
  // Gravação de áudio
  // ---------------------------------------------------------------------------

  async function startRecording() {
    if (recordingState !== "idle") return;
    setRecordingState("requesting");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setRecordingState("idle");
      toast.error("Não foi possível acessar o microfone");
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    const mimeType = pickMimeType();
    setAudioMime(mimeType || "audio/ogg");

    const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    mediaRecorderRef.current = mr;

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mr.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/ogg" });
      const url = URL.createObjectURL(blob);
      setAudioBlob(blob);
      setAudioUrl(url);
      setAudioMime(mr.mimeType || "audio/ogg");
      setRecordingState("preview");
    };

    mr.start(250);
    setRecordingState("recording");
    setRecordingSeconds(0);
    timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
  }

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    mediaRecorderRef.current?.stop();
  }

  function discardRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingState("idle");
    setRecordingSeconds(0);
  }

  // ---------------------------------------------------------------------------
  // Enviar
  // ---------------------------------------------------------------------------

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed && !attachment && !audioBlob) return;

    setSending(true);
    try {
      let result: { success: boolean; error?: string };

      if (audioBlob) {
        const ext = audioMime.includes("ogg") ? "ogg" : "webm";
        const file = new File([audioBlob], `audio_${Date.now()}.${ext}`, { type: audioMime });
        const formData = new FormData();
        formData.append("file", file);
        formData.append("to", to);
        formData.append("entityName", name);
        console.log("[WhatsAppSendModal] audio send — leadId:", leadId, "contactId:", contactId);
        if (leadId) formData.append("leadId", leadId);
        if (contactId) formData.append("contactId", contactId);
        const res = await fetch(`${BACKEND_URL}/whatsapp/send-audio`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const nestResult = await res.json().catch(() => ({ ok: false, error: res.statusText }));
        result = { success: nestResult.ok as boolean, error: nestResult.error as string | undefined };
      } else if (attachment) {
        const mediaBase64 = await fileToBase64(attachment);
        const nestResult = await apiFetch<{ ok: boolean; error?: string }>(
          "/whatsapp/send-media",
          token,
          {
            method: "POST",
            body: JSON.stringify({
              to,
              mediatype: getMediatype(attachment.type),
              mediaBase64,
              fileName: attachment.name,
              mimetype: attachment.type,
              caption: trimmed || undefined,
              contactName: name,
              leadId: leadId ?? undefined,
              contactId: contactId ?? undefined,
            }),
          },
        );
        result = { success: nestResult.ok, error: nestResult.error };
      } else {
        const nestResult = await apiFetch<{ ok: boolean; error?: string }>(
          "/whatsapp/send",
          token,
          { method: "POST", body: JSON.stringify({ to, text: trimmed, contactName: name, leadId, contactId, organizationId }) },
        );
        result = { success: nestResult.ok, error: nestResult.error };
      }

      if (result.success) {
        toast.success("Mensagem enviada!", { description: `WhatsApp para ${name}` });
        router.refresh();
        onClose();
      } else {
        toast.error("Erro ao enviar mensagem", { description: result.error });
      }
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  }

  // Agrupar templates por categoria
  const groupedTemplates: Record<string, Template[]> = {};
  for (const t of templates) {
    const key = t.category ?? "Geral";
    if (!groupedTemplates[key]) groupedTemplates[key] = [];
    groupedTemplates[key].push(t);
  }

  const isRecordingActive = recordingState === "recording" || recordingState === "requesting";
  const canSend = !sending && (!!text.trim() || !!attachment || !!audioBlob);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && !isRecordingActive && onClose()}
    >
      <div className={`bg-white shadow-2xl flex flex-col rounded-2xl ${expanded ? "w-[92vw] max-w-2xl h-[90vh]" : "w-full max-w-md max-h-[90vh]"}`}>

        {/* Header */}
        <div className="flex items-center gap-3 rounded-t-2xl bg-[#25D366] px-5 py-4 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
            <WhatsAppIcon className="h-5 w-5 fill-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate">{name}</p>
            <p className="text-xs text-white/80 font-mono">{to}</p>
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Recolher" : "Expandir"}
            className="rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
          >
            {expanded ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </button>
          <button onClick={onClose} className="rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className={`flex-1 overflow-y-auto ${expanded ? "flex flex-col" : ""}`}>

          {/* Templates panel */}
          {showTemplates && (
            <div className="border-b border-gray-100 bg-gray-50 p-3 max-h-52 overflow-y-auto">
              {!templatesLoaded ? (
                <p className="text-center text-xs text-gray-400 py-4">Carregando...</p>
              ) : templates.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-4">
                  Nenhum template cadastrado.{" "}
                  <a href="/admin/whatsapp-templates" target="_blank" className="text-[#128C7E] underline">
                    Criar agora
                  </a>
                </p>
              ) : (
                Object.entries(groupedTemplates).map(([cat, items]) => (
                  <div key={cat} className="mb-3">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">{cat}</p>
                    <div className="space-y-1.5">
                      {items.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => applyTemplate(t)}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-left hover:border-[#25D366] hover:bg-[#f0fdf4] transition-colors"
                        >
                          <p className="text-xs font-semibold text-gray-700">{t.name}</p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{t.text}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Emoji picker */}
          {showEmoji && (
            <div className="border-b border-gray-100 p-2">
              <EmojiPicker onSelect={insertEmoji} />
            </div>
          )}

          {/* Attachment preview */}
          {attachment && (
            <div className="mx-5 mt-3 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
              {attachPreview ? (
                <Image src={attachPreview} alt="preview" width={48} height={48} unoptimized className="rounded object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded bg-gray-200">
                  <FileText className="h-6 w-6 text-gray-500" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-gray-700">{attachment.name}</p>
                <p className="text-xs text-gray-400">{(attachment.size / 1024).toFixed(0)} KB</p>
              </div>
              <button onClick={removeAttachment} className="rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Gravando — indicador em tempo real */}
          {isRecordingActive && (
            <div className="mx-5 mt-3 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
              </span>
              <p className="flex-1 text-sm font-medium text-red-600">
                {recordingState === "requesting" ? "Aguardando permissão..." : `Gravando  ${formatSeconds(recordingSeconds)}`}
              </p>
              {recordingState === "recording" && (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 transition-colors"
                >
                  <Square className="h-3 w-3 fill-white" />
                  Parar
                </button>
              )}
            </div>
          )}

          {/* Preview do áudio gravado */}
          {recordingState === "preview" && audioUrl && (
            <div className="mx-5 mt-3 rounded-xl border border-[#25D366]/40 bg-[#f0fdf4] p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15">
                  <Mic className="h-4 w-4 text-[#25D366]" />
                </div>
                <p className="text-xs font-medium text-gray-700">Áudio de voz • {formatSeconds(recordingSeconds)}</p>
                <button
                  onClick={discardRecording}
                  className="ml-auto rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                  title="Descartar gravação"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <audio src={audioUrl} controls className="w-full h-8" />
            </div>
          )}

          {/* Textarea — oculto durante gravação */}
          {!isRecordingActive && recordingState !== "preview" && (
            <div className={`p-5 ${expanded ? "flex-1 flex flex-col min-h-0" : ""}`}>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={4}
                placeholder={attachment ? "Legenda (opcional)..." : "Digite sua mensagem..."}
                className={`w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-[#25D366] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/20 transition-colors ${expanded ? "flex-1 min-h-0 resize-none" : "resize-y"}`}
                disabled={sending}
              />
              <p className="mt-1.5 text-xs text-gray-400 shrink-0">Ctrl+Enter para enviar</p>
            </div>
          )}
        </div>

        {/* Toolbar + Footer */}
        <div className="shrink-0 border-t border-gray-100 px-5 py-3 space-y-3">
          {/* Toolbar de ações */}
          {!isRecordingActive && recordingState !== "preview" && (
            <div className="flex items-center gap-1">
              {/* Emoji */}
              <button
                type="button"
                onClick={() => { setShowEmoji((v) => !v); setShowTemplates(false); }}
                disabled={sending}
                title="Emoji"
                className={`rounded-lg p-2 transition-colors disabled:opacity-50 ${showEmoji ? "bg-[#25D366]/15 text-[#25D366]" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"}`}
              >
                <Smile className="h-5 w-5" />
              </button>

              {/* Anexo */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
                title="Anexar arquivo"
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-50"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Gravar áudio PTT */}
              <button
                type="button"
                onClick={startRecording}
                disabled={sending || !!(typeof window !== "undefined" && !navigator.mediaDevices)}
                title="Gravar áudio de voz"
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-50"
              >
                <Mic className="h-5 w-5" />
              </button>

              {/* Templates */}
              <button
                type="button"
                onClick={handleOpenTemplates}
                disabled={sending}
                title="Templates"
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${showTemplates ? "bg-[#25D366]/15 text-[#25D366]" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"}`}
              >
                <FileText className="h-4 w-4" />
                Templates
                {showTemplates ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>
          )}

          {/* Cancel + Send */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={isRecordingActive ? stopRecording : onClose}
              disabled={sending}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {isRecordingActive ? "Parar" : "Cancelar"}
            </button>
            <button
              onClick={handleSend}
              disabled={!canSend}
              className="flex items-center gap-2 rounded-lg bg-[#25D366] px-5 py-2 text-sm font-semibold text-white hover:bg-[#20b958] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}
