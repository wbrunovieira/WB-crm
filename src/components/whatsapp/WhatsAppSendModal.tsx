"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { X, Send, Loader2, Smile, Paperclip, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { sendWhatsAppMedia } from "@/actions/whatsapp";
import { getWhatsAppTemplates } from "@/actions/whatsapp-templates";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";

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
      {/* Category tabs */}
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
      {/* Emoji grid */}
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
// Media helpers
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
      // Strip data:...;base64, prefix
      const base64 = result.split(",")[1] ?? result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
}

// ---------------------------------------------------------------------------
// Modal principal
// ---------------------------------------------------------------------------

export default function WhatsAppSendModal({ to, name, onClose }: WhatsAppSendModalProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Emoji
  const [showEmoji, setShowEmoji] = useState(false);

  // Anexo
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachPreview, setAttachPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Templates
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  // ESC fecha tudo
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showEmoji) { setShowEmoji(false); return; }
        if (showTemplates) { setShowTemplates(false); return; }
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, showEmoji, showTemplates]);

  // Carregar templates ao abrir o painel (lazy)
  const handleOpenTemplates = useCallback(async () => {
    setShowTemplates((v) => !v);
    if (!templatesLoaded) {
      const data = await getWhatsAppTemplates(true);
      setTemplates(data);
      setTemplatesLoaded(true);
    }
  }, [templatesLoaded]);

  // Inserir emoji no cursor
  function insertEmoji(emoji: string) {
    const ta = textareaRef.current;
    if (!ta) { setText((t) => t + emoji); return; }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newText = text.slice(0, start) + emoji + text.slice(end);
    setText(newText);
    // Reposicionar cursor
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + emoji.length;
    }, 0);
    setShowEmoji(false);
  }

  // Aplicar template
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
    // Limpar input para permitir re-selecionar o mesmo arquivo
    e.target.value = "";
  }

  function removeAttachment() {
    setAttachment(null);
    setAttachPreview(null);
  }

  // Enviar
  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed && !attachment) return;

    setSending(true);
    try {
      let result;

      if (attachment) {
        const mediaBase64 = await fileToBase64(attachment);
        result = await sendWhatsAppMedia({
          to,
          mediatype: getMediatype(attachment.type),
          mediaBase64,
          fileName: attachment.name,
          mimetype: attachment.type,
          caption: trimmed || undefined,
          contactName: name,
        });
      } else {
        const nestResult = await apiFetch<{ ok: boolean; error?: string }>(
          "/whatsapp/send",
          token,
          { method: "POST", body: JSON.stringify({ to, text: trimmed, contactName: name }) },
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

  const canSend = !sending && (!!text.trim() || !!attachment);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center gap-3 rounded-t-2xl bg-[#25D366] px-5 py-4 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
            <WhatsAppIcon className="h-5 w-5 fill-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate">{name}</p>
            <p className="text-xs text-white/80 font-mono">{to}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

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

          {/* Textarea */}
          <div className="p-5">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={4}
              placeholder={attachment ? "Legenda (opcional)..." : "Digite sua mensagem..."}
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-[#25D366] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/20 transition-colors"
              disabled={sending}
            />
            <p className="mt-1.5 text-xs text-gray-400">Ctrl+Enter para enviar</p>
          </div>
        </div>

        {/* Toolbar + Footer */}
        <div className="shrink-0 border-t border-gray-100 px-5 py-3 space-y-3">
          {/* Toolbar de ações */}
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

          {/* Cancel + Send */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={sending}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Cancelar
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
